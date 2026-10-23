# Tài Liệu Thiết Kế & Hướng Dẫn Triển Khai Booking Service (TableMaster)

Tài liệu này tổng hợp toàn bộ cấu trúc mã nguồn, quy trình nghiệp vụ (business flows), giải thích chi tiết từng khối mã nguồn và lý do kiến trúc (Architecture Rationale) tại sao phải thiết kế và triển khai như vậy.

---

## 1. Tổng Quan Kiến Trúc & Cấu Trúc Thư Mục

Booking Service chịu trách nhiệm quản lý toàn bộ vòng đời đặt bàn, từ lúc khách gửi yêu cầu trên website, qua khâu Lễ tân Telesales duyệt & gọi xác nhận, nhận cọc VietQR, quét mã QR Check-in tại sảnh đón, cho đến việc gọi thêm món tại bàn bằng máy tính bảng của nhân viên phục vụ và hoàn tất bữa ăn.

### Cấu trúc mã nguồn hoàn chỉnh
```
booking-service/src/main/java/com/tablemaster/booking/
├── BookingServiceApplication.java          # Entry point Spring Boot (@EnableScheduling, @EnableDiscoveryClient)
├── config/
│   └── KafkaConfig.java                    # Định nghĩa các Kafka Topics và cấu hình Producer/Consumer
├── entity/
│   ├── Booking.java                        # Entity trung tâm lưu trữ thông tin đơn đặt bàn
│   ├── BookingTable.java                   # Bảng ghép nối Nhiều-Nhiều (hỗ trợ ghép nhiều bàn cho 1 đơn)
│   ├── BookingTableId.java                 # Composite Key (booking_id, table_id)
│   ├── BookingPreorderItem.java            # Món ăn khách đặt trước từ website
│   ├── TableOrderItem.java                 # Món ăn nhân viên phục vụ gọi thêm tại bàn (Tablet)
│   ├── TableOperationsAudit.java           # Nhật ký kiểm toán thao tác chuyển bàn / ghép bàn
│   └── OutboxEvent.java                    # Transactional Outbox chống Dual-Write & mất event Kafka
├── enums/
│   ├── BookingStatus.java                  # 9 trạng thái nghiệp vụ chuẩn F&B
│   ├── OrderItemStatus.java               # Trạng thái món tại bàn (PREPARING, SERVED, CANCELLED)
│   └── OperationType.java                 # Loại thao tác bàn (TRANSFER, MERGE)
├── repository/
│   ├── BookingRepository.java              # Query kiểm tra bàn trống, đơn quá hạn cọc, token QR
│   ├── BookingTableRepository.java         # Quản lý liên kết bàn
│   ├── BookingPreorderItemRepository.java  # Quản lý món đặt trước
│   ├── TableOrderItemRepository.java       # Quản lý món gọi tại bàn
│   ├── TableOperationsAuditRepository.java # Truy vết thao tác bàn
│   └── OutboxEventRepository.java          # Poller quét event chưa gửi
├── dto/
│   ├── request/
│   │   ├── CreateBookingRequest.java       # Request khách gửi đặt bàn
│   │   ├── PreorderItemRequest.java        # Request món đặt trước
│   │   ├── ApproveDepositRequest.java      # Request lễ tân duyệt cọc
│   │   ├── CheckInRequest.java             # Request quét QR check-in
│   │   ├── TransferTableRequest.java       # Request chuyển bàn
│   │   └── TableOrderRequest.java          # Request gọi món tại bàn
│   └── response/
│       ├── BookingResponse.java            # Thông tin trả về của đơn đặt bàn
│       ├── TableOrderItemResponse.java     # Thông tin món gọi tại bàn
│       └── ApiResponse.java                # Chuẩn Response wrapper toàn hệ thống
├── exception/
│   ├── BookingNotFoundException.java       # Lỗi 404 không tìm thấy đơn
│   ├── InvalidBookingStateException.java   # Lỗi 400 vi phạm State Machine
│   ├── TableAlreadyBookedException.java    # Lỗi 409 trùng lịch bàn
│   └── GlobalExceptionHandler.java         # Bắt exception toàn cục trả về ApiResponse
├── service/
│   ├── BookingService.java & Impl          # Xử lý toàn bộ logic nghiệp vụ đơn đặt bàn
│   ├── TableOrderService.java & Impl       # Xử lý gọi món tại bàn cho Waiter
│   └── OutboxService.java                  # Background Job gửi lại event thất bại
├── controller/
│   ├── BookingController.java              # REST Controller tiếp nhận request đặt bàn
│   └── TableOrderController.java           # REST Controller tiếp nhận order tại bàn
├── kafka/
│   ├── BookingEventProducer.java           # Bắn event Kafka + ghi Transactional Outbox
│   └── PaymentEventConsumer.java           # Nhận event cọc thành công từ payment-service
└── scheduler/
    └── BookingExpirationScheduler.java     # Cronjob định kỳ quét đơn hết hạn cọc
```

---

## 2. State Machine 9 Trạng Thái (Vòng Đời Đơn Đặt Bàn)

Trong hệ thống F&B cao cấp, quy trình đặt bàn không đơn thuần chỉ là "Tạo đơn" → "Thành công", mà trải qua nhiều bước phối hợp giữa Khách hàng, Lễ tân và Thu ngân.

```
                  ┌────────────────────────┐
                  │     PENDING_REVIEW     │  (Khách gửi yêu cầu trên Web)
                  └───────────┬────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │ (Từ chối)         │ (Có yêu cầu cọc)  │ (Không cần cọc)
          ▼                   ▼                   │
    ┌───────────┐      ┌──────────────────┐       │
    │ REJECTED  │      │ AWAITING_PAYMENT │       │
    └───────────┘      └─────────┬────────┘       │
                                 │                │
                    ┌────────────┴────────────┐   │
                    │ (Quá deadline cọc)      │ (Quét VietQR thành công)
                    ▼                         ▼   │
              ┌───────────┐            ┌──────────▼────────┐
              │  EXPIRED  │            │     CONFIRMED     │  (Đã sinh mã QR Check-in)
              └───────────┘            └──────────┬────────┘
                                                  │
                                     ┌────────────┴────────────┐
                                     │ (Quá giờ không đến)     │ (Quét QR tại sảnh)
                                     ▼                         ▼
                               ┌───────────┐             ┌───────────┐
                               │  NO_SHOW  │             │  SEATED   │ (Đang ngồi ăn, gọi món)
                               └───────────┘             └─────┬─────┘
                                                               │ (Thanh toán xong)
                                                               ▼
                                                         ┌───────────┐
                                                         │ COMPLETED │
                                                         └───────────┘
   * Ngoài ra: Trạng thái CANCELLED có thể xảy ra khi khách chủ động hủy ở các bước trước SEATED.
```

### Mã nguồn định nghĩa:
File: `com.tablemaster.booking.enums.BookingStatus`
```java
public enum BookingStatus {
    PENDING_REVIEW,     // Chờ Lễ tân gọi điện xác nhận
    AWAITING_PAYMENT,   // Đã duyệt, chờ khách thanh toán tiền cọc
    CONFIRMED,          // Đã cọc thành công, đã sinh mã QR Check-in
    SEATED,             // Khách đã quét QR tại sảnh, đang ngồi tại bàn
    COMPLETED,          // Khách đã dùng bữa và thanh toán xong toàn bộ
    REJECTED,           // Lễ tân từ chối đơn
    EXPIRED,            // Khách không nộp cọc trong thời hạn quy định
    CANCELLED,          // Khách chủ động hủy đơn
    NO_SHOW             // Khách không đến trong khung giờ đặt bàn
}
```

### Tại sao phải thiết kế 9 trạng thái như vậy?
1. **Chống tình trạng "đặt ảo / bom bàn"**: Không thể cho đơn đặt bàn vào thẳng `CONFIRMED` khi khách chưa qua bước xác minh. Nhà hàng cần bước `PENDING_REVIEW` để Lễ tân kiểm tra thông tin và gọi xác nhận.
2. **Quản lý cọc linh hoạt**: Một số bàn thường hoặc khách VIP có thể không cần cọc (`PENDING_REVIEW` → `CONFIRMED` ngay). Bàn tiệc đông người hoặc giờ cao điểm thì cần cọc (`PENDING_REVIEW` → `AWAITING_PAYMENT`).
3. **Vé điện tử QR Code**: Chỉ cấp QR Code check-in khi đơn đã `CONFIRMED` để tránh khách mang mã QR của đơn chưa được duyệt đến sảnh đòi bàn.

---

## 3. Chi Tiết Các Luồng Nghiệp Vụ Chính & Code Implementation

---

### Luồng 1: Khách hàng gửi yêu cầu đặt bàn trực tuyến

#### Mục tiêu & Quy trình:
1. Khách hàng chọn ngày, khung giờ, số lượng khách, chọn bàn và có thể chọn trước các món đặc sản (Signature Dishes).
2. Hệ thống kiểm tra xem các bàn khách chọn có bị trùng với đơn nào khác trong cùng khung giờ hay không.
3. Sinh mã đơn tự động theo chuẩn nhận diện: `BK` + Ngày đặt `yyMMdd` + Số thứ tự 4 số (Ví dụ: `BK2610090001`).
4. Lưu đơn vào Database ở trạng thái `PENDING_REVIEW`.
5. Bắn sự kiện `booking.created` lên Kafka qua Outbox để các service khác (như Notification Service) gửi SMS/Email thông báo tiếp nhận đơn cho khách.

#### Code chỉ định:
- Controller: [BookingController.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/controller/BookingController.java) (Dòng 30 - 39)
- Service: [BookingServiceImpl.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/BookingServiceImpl.java) (`createBooking`)

```java
// Đoạn code kiểm tra bàn trùng lịch
if (request.getTableIds() != null && !request.getTableIds().isEmpty()) {
    List<BookingStatus> activeStatuses = List.of(
            BookingStatus.CONFIRMED,
            BookingStatus.SEATED,
            BookingStatus.AWAITING_PAYMENT
    );
    List<UUID> bookedTableIds = bookingRepository.findBookedTableIds(
            request.getBookingDate(), request.getTimeSlotId(), activeStatuses);

    for (UUID requestedTableId : request.getTableIds()) {
        if (bookedTableIds.contains(requestedTableId)) {
            throw new TableAlreadyBookedException(requestedTableId);
        }
    }
}
```

```java
// Đoạn code sinh mã đơn chuẩn nghiệp vụ:
long countToday = bookingRepository.countByBookingDate(request.getBookingDate());
String datePrefix = request.getBookingDate().format(DateTimeFormatter.ofPattern("yyMMdd"));
String bookingCode = String.format("BK%s%04d", datePrefix, countToday + 1);
```

#### Tại sao phải làm vậy?
- **Chống Overbooking**: Sử dụng query kiểm tra `findBookedTableIds` chỉ lọc các đơn đang chiếm dụng bàn (`CONFIRMED`, `SEATED`, `AWAITING_PAYMENT`). Các đơn đã bị `CANCELLED`, `REJECTED`, `EXPIRED` thì bàn được tự do cho khách khác đặt.
- **Mã đơn ngắn gọn dễ đọc**: Mã `BK2610090001` vừa mang thông tin ngày tháng, vừa thân thiện khi Lễ tân đọc qua điện thoại hoặc khách đọc mã đối soát, thay vì phải đọc một chuỗi UUID dài 36 ký tự.

---

### Luồng 2: Lễ tân Telesales duyệt đơn & Yêu cầu cọc tiền

#### Mục tiêu & Quy trình:
1. Lễ tân vào giao diện danh sách đơn `PENDING_REVIEW`, gọi điện xác nhận với khách.
2. Nếu khách đồng ý các điều khoản, Lễ tân nhập số tiền cọc và thời hạn cọc (mặc định 30 - 60 phút).
3. Nếu đơn có tiền cọc: Hệ thống chuyển trạng thái sang `AWAITING_PAYMENT`, ghi nhận `paymentDeadline = now + deadlineMinutes`.
4. Nếu đơn miễn cọc: Chuyển thẳng sang `CONFIRMED`, tự động sinh mã `checkinQrToken = UUID.randomUUID().toString()`.
5. Lưu thông tin Lễ tân duyệt (`reviewedByUserId`) và ghi chú (`staffNotes`).

#### Code chỉ định:
- Endpoint: `POST /api/v1/bookings/{id}/approve-and-request-deposit`
- Service: [BookingServiceImpl.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/BookingServiceImpl.java) (`approveAndRequestDeposit`)

```java
if (booking.getStatus() != BookingStatus.PENDING_REVIEW) {
    throw new InvalidBookingStateException("Chỉ có thể duyệt đơn ở trạng thái PENDING_REVIEW. Hiện tại: " + booking.getStatus());
}

booking.setReviewedByUserId(staffId);
booking.setStaffNotes(request.getStaffNotes());

if (request.getDepositAmount() != null && request.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) {
    booking.setStatus(BookingStatus.AWAITING_PAYMENT);
    booking.setTotalDeposit(request.getDepositAmount());
    int minutes = (request.getDeadlineMinutes() != null && request.getDeadlineMinutes() > 0)
            ? request.getDeadlineMinutes() : 30;
    booking.setPaymentDeadline(ZonedDateTime.now().plusMinutes(minutes));
    ...
} else {
    booking.setStatus(BookingStatus.CONFIRMED);
    booking.setTotalDeposit(BigDecimal.ZERO);
    booking.setCheckinQrToken(UUID.randomUUID().toString());
    ...
}
```

#### Tại sao phải làm vậy?
- **Bảo vệ toàn vẹn trạng thái**: Kiểm tra nghiêm ngặt `booking.getStatus() != PENDING_REVIEW` tránh trường hợp hai lễ tân cùng duyệt 1 đơn hoặc duyệt nhầm đơn đã hủy.
- **Tính toán linh hoạt**: Cho phép linh hoạt giữa đơn có cọc và không cọc trên cùng một endpoint, đơn giản hóa giao diện Frontend của Lễ tân.

---

### Luồng 3: Tích hợp thanh toán cọc qua Kafka & Sinh mã QR Check-in

#### Mục tiêu & Quy trình:
1. Khách hàng dùng ứng dụng ngân hàng quét VietQR để chuyển khoản tiền cọc.
2. `payment-service` nhận Webhook từ ngân hàng/cổng thanh toán, kiểm tra giao dịch thành công và bắn event lên Kafka topic `payment.success`.
3. `PaymentEventConsumer` trong `booking-service` lắng nghe topic này.
4. Khi nhận được message có chứa `bookingId`, gọi `confirmBookingAfterPayment(bookingId)`.
5. Đơn chuyển từ `AWAITING_PAYMENT` sang `CONFIRMED`, sinh ngẫu nhiên mã bí mật `checkinQrToken`.
6. Bắn tiếp event `booking.confirmed` lên Kafka để hệ thống gửi Email chứa mã QR vé vào cổng cho khách.

#### Code chỉ định:
- Consumer: [PaymentEventConsumer.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/kafka/PaymentEventConsumer.java)
- Service: [BookingServiceImpl.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/BookingServiceImpl.java) (`confirmBookingAfterPayment`)

```java
@KafkaListener(topics = KafkaConfig.TOPIC_PAYMENT_SUCCESS, groupId = "booking-service-group")
public void consumePaymentSuccess(String message) {
    JsonNode root = objectMapper.readTree(message);
    if (root.has("bookingId")) {
        UUID bookingId = UUID.fromString(root.get("bookingId").asText());
        bookingService.confirmBookingAfterPayment(bookingId);
    }
}
```

```java
public void confirmBookingAfterPayment(UUID bookingId) {
    Booking booking = bookingRepository.findById(bookingId)...;
    if (booking.getStatus() == BookingStatus.AWAITING_PAYMENT) {
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setCheckinQrToken(UUID.randomUUID().toString());
        Booking saved = bookingRepository.save(booking);
        bookingEventProducer.publishBookingConfirmed(saved);
    }
}
```

#### Tại sao phải làm vậy?
- **Khử phụ thuộc (Decoupling) bằng Event-Driven**: `payment-service` và `booking-service` không gọi HTTP trực tiếp cho nhau. Nếu `booking-service` tạm thời khởi động lại, message vẫn nằm trên Kafka và được xử lý ngay khi service online trở lại mà không làm mất trạng thái thanh toán của khách.
- **Idempotency (Tính bất biến khi gọi lại nhiều lần)**: Kiểm tra `if (booking.getStatus() == BookingStatus.AWAITING_PAYMENT)` đảm bảo nếu Kafka gửi lại message (do retry), hệ thống không vô tình sinh đè mã QR mới hay xử lý trùng lặp.

---

### Luồng 4: Quét QR Check-in đón khách tại sảnh nhà hàng

#### Mục tiêu & Quy trình:
1. Khi khách đến cửa nhà hàng, mở điện thoại đưa mã QR cho Lễ tân quét bằng máy POS / điện thoại nội bộ.
2. POS gọi endpoint `POST /api/v1/bookings/check-in` gửi kèm chuỗi `qrToken`.
3. Hệ thống tìm đơn theo `checkinQrToken`:
   - Nếu không tìm thấy: Báo lỗi 404 "Mã QR không hợp lệ".
   - Nếu trạng thái không phải `CONFIRMED`: Báo lỗi 400 "Đơn chưa được xác nhận hoặc đã check-in rồi".
4. Chuyển trạng thái sang `SEATED`, ghi nhận thời gian đón khách `seatedAt = ZonedDateTime.now()`.
5. Phát sự kiện `booking.seated` lên Kafka (để Service quản lý sơ đồ bàn cập nhật màu bàn sang màu Đang phục vụ, và Nhà bếp chuẩn bị sẵn món nếu có món đặt trước).

#### Code chỉ định:
- Endpoint: `POST /api/v1/bookings/check-in`
- Request DTO: [CheckInRequest.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/dto/request/CheckInRequest.java)
- Service: [BookingServiceImpl.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/BookingServiceImpl.java) (`checkIn`)

```java
Booking booking = bookingRepository.findByCheckinQrToken(request.getQrToken())
        .orElseThrow(() -> new BookingNotFoundException("Mã QR check-in không hợp lệ hoặc không tìm thấy đơn"));

if (booking.getStatus() != BookingStatus.CONFIRMED) {
    throw new InvalidBookingStateException("Đơn không ở trạng thái CONFIRMED (Hiện tại: " + booking.getStatus() + ")");
}

booking.setStatus(BookingStatus.SEATED);
booking.setSeatedAt(ZonedDateTime.now());
Booking saved = bookingRepository.save(booking);
bookingEventProducer.publishBookingSeated(saved);
```

#### Tại sao phải làm vậy?
- **Tốc độ đón khách cực nhanh (< 3 giây)**: Lễ tân không cần tra cứu tên hay số điện thoại thủ công trên phần mềm, chỉ cần 1 thao tác quét mã QR là toàn bộ thông tin bàn, số lượng khách hiển thị tức thì.
- **Bảo mật tuyệt đối**: Khách không dùng `booking_id` để check-in mà dùng `checkinQrToken` (chuỗi UUID ngẫu nhiên). Kẻ xấu không thể đoán mò ID đơn của khách khác để check-in giả mạo.

---

### Luồng 5: Gọi thêm món tại bàn bằng máy tính bảng (Waiter Tablet)

#### Mục tiêu & Quy trình:
1. Trong lúc dùng bữa, khách muốn gọi thêm đồ uống hoặc món ăn.
2. Nhân viên phục vụ (Waiter) sử dụng tablet tại bàn gửi danh sách món tới endpoint `POST /api/v1/bookings/{id}/table-orders`.
3. Hệ thống kiểm tra: Đơn đặt bàn bắt buộc phải đang ở trạng thái `SEATED`.
4. Lưu các món ăn vào bảng `table_order_items` với trạng thái ban đầu là `PREPARING` (Bếp đang làm) kèm theo ghi chú chế biến (Ví dụ: "Ít cay, không hành").
5. Khi bếp chế biến xong hoặc phục vụ mang ra cho khách, gọi endpoint `PATCH /api/v1/bookings/table-orders/{itemId}/status` chuyển sang `SERVED`.

#### Code chỉ định:
- Controller: [TableOrderController.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/controller/TableOrderController.java)
- Service: [TableOrderServiceImpl.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/TableOrderServiceImpl.java)

```java
if (booking.getStatus() != BookingStatus.SEATED) {
    throw new InvalidBookingStateException("Chỉ có thể gọi thêm món khi khách đang ngồi ăn (Trạng thái SEATED). Hiện tại: " + booking.getStatus());
}

List<TableOrderItem> itemsToSave = new ArrayList<>();
for (TableOrderRequest.OrderItemRequest itemReq : request.getItems()) {
    TableOrderItem orderItem = TableOrderItem.builder()
            .booking(booking)
            .tableId(request.getTableId())
            .menuItemId(itemReq.getMenuItemId())
            .itemName(itemReq.getItemName())
            .quantity(itemReq.getQuantity())
            .unitPrice(itemReq.getUnitPrice())
            .status(OrderItemStatus.PREPARING)
            .notes(itemReq.getNotes())
            .orderedByUserId(staffId)
            .build();
    itemsToSave.add(orderItem);
}
tableOrderItemRepository.saveAll(itemsToSave);
```

#### Tại sao phải làm vậy?
- **Phân tách rạch ròi 2 loại Order**:
  - `booking_preorder_items`: Là món đặt trước từ website (được chốt từ khâu đặt bàn).
  - `table_order_items`: Là món gọi phát sinh tại chỗ từ máy tính bảng của phục vụ.
  Việc tách bảng giúp tính toán doanh thu tại bàn, theo dõi thời gian bếp lên món và đối soát hóa đơn cuối cùng mà không làm rối loạn dữ liệu đặt bàn ban đầu.

---

### Luồng 6: Đổi bàn / Chuyển bàn cho khách & Ghi Audit Log

#### Mục tiêu & Quy trình:
1. Khách đang ngồi muốn chuyển sang bàn khác (Ví dụ: khách muốn chuyển ra bàn gần cửa sổ hoặc bàn lớn hơn).
2. Lễ tân thao tác chuyển bàn: `POST /api/v1/bookings/{id}/transfer-table`.
3. Hệ thống kiểm tra: Bàn đích (`targetTableId`) phải đang trống trong khung giờ của đơn.
4. Cập nhật bảng liên kết `booking_tables` (xóa bàn cũ, thêm bàn mới).
5. Ghi lịch sử kiểm toán vào bảng `table_operations_audit` (lưu loại thao tác `TRANSFER`, bàn nguồn, bàn đích, người thực hiện `performedBy` và lý do).
6. Bắn sự kiện `booking.table.updated` lên Kafka để màn hình sơ đồ bàn tự động cập nhật lại thời gian thực.

#### Code chỉ định:
- Service: [BookingServiceImpl.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/BookingServiceImpl.java) (`transferTable`)
- Audit Entity: [TableOperationsAudit.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/entity/TableOperationsAudit.java)

```java
// Kiểm tra bàn đích có bị chiếm dụng không
if (bookedTableIds.contains(request.getTargetTableId())) {
    throw new TableAlreadyBookedException(request.getTargetTableId());
}

// Cập nhật quan hệ bàn
bookingTableRepository.deleteById(oldId);
bookingTableRepository.save(newBt);

// Ghi nhật ký kiểm toán bắt buộc
TableOperationsAudit audit = TableOperationsAudit.builder()
        .bookingId(bookingId)
        .operationType(OperationType.TRANSFER)
        .sourceTableId(request.getSourceTableId())
        .targetTableId(request.getTargetTableId())
        .performedBy(staffId)
        .reason(request.getReason())
        .build();
tableOperationsAuditRepository.save(audit);

// Phát event Kafka
bookingEventProducer.publishTableUpdated(...);
```

#### Tại sao phải làm vậy?
- **Tránh tranh chấp & mất kiểm soát sơ đồ bàn**: Trong nhà hàng đông khách, việc nhân viên tự ý đổi bàn mà không ghi log sẽ dẫn đến tình trạng hai nhân viên xếp hai đoàn khách vào cùng 1 bàn.
- **Audit Trail đầy đủ**: Bảng `table_operations_audit` giúp quản lý nhà hàng tra cứu chính xác ai đã đổi bàn, đổi lúc mấy giờ và với lý do gì.

---

### Luồng 7: Tự động quét và hủy đơn quá hạn nộp cọc (Auto-Expiration)

#### Mục tiêu & Quy trình:
1. Khi đơn ở trạng thái `AWAITING_PAYMENT`, hệ thống cho khách một khoảng thời gian giữ chỗ (ví dụ: 30 phút).
2. `BookingExpirationScheduler` chạy nền mỗi 60 giây.
3. Tìm kiếm tất cả các đơn có `status = 'AWAITING_PAYMENT'` mà `paymentDeadline < now()`.
4. Tự động cập nhật `status = 'EXPIRED'`.
5. Phát sự kiện `booking.expired` lên Kafka để giải phóng bàn trên giao diện sơ đồ bàn.

#### Code chỉ định:
- Scheduler: [BookingExpirationScheduler.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/scheduler/BookingExpirationScheduler.java)
- Query Repository: [BookingRepository.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/repository/BookingRepository.java) (Dòng 44-47)

```java
@Scheduled(fixedRate = 60000)
public void scanAndExpireBookings() {
    bookingService.checkAndExpireBookings();
}
```

```java
@Query("SELECT b FROM Booking b WHERE b.status = 'AWAITING_PAYMENT' " +
       "AND b.paymentDeadline IS NOT NULL AND b.paymentDeadline < :now")
List<Booking> findExpiredAwaitingPayment(@Param("now") ZonedDateTime now);
```

#### Tại sao phải làm vậy?
- **Tránh tình trạng "giam bàn"**: Nếu khách nhận yêu cầu cọc nhưng không thanh toán và không báo lại, bàn đó sẽ bị khóa khiến khách khác không thể đặt được. Cronjob tự động mở khóa bàn mà không cần Lễ tân phải nhớ để đi hủy thủ công từng đơn.

---

## 4. Giải Pháp Kiến Trúc Nâng Cao: Transactional Outbox Pattern

### Vấn đề: Dual-Write Problem trong Microservices
Khi một nghiệp vụ xảy ra (ví dụ: Khách tạo đơn đặt bàn), hệ thống phải làm 2 việc:
1. Lưu đơn vào Database (PostgreSQL).
2. Gửi message thông báo lên Kafka.

Nếu lưu Database thành công, nhưng Kafka bị nghẽn mạng hoặc gặp sự cố, hệ thống sẽ bị mất thông báo, dẫn đến các service khác không biết đơn đã được tạo. Ngược lại, nếu gửi Kafka trước rồi lưu DB sau, nếu DB bị lỗi rollback thì Kafka đã lỡ phát thông tin sai.

### Giải pháp: Transactional Outbox
1. Mỗi khi có thao tác nghiệp vụ, dữ liệu sự kiện được lưu thẳng vào bảng `outbox_events` trong Database **cùng 1 Local Transaction** với dữ liệu đơn đặt bàn.
2. Thử bắn trực tiếp lên Kafka:
   - Nếu Kafka nhận thành công: Đánh dấu `status = 'SENT'`.
   - Nếu Kafka lỗi: Bản ghi vẫn nằm ở bảng `outbox_events` với `status = 'PENDING'`.
3. Một Background Worker ([OutboxService.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/OutboxService.java)) chạy mỗi 10 giây quét các sự kiện `PENDING` để retry gửi lại lên Kafka, đảm bảo tính đảm bảo phát hiện (At-least-once Delivery).

#### Code chỉ định:
- Entity: [OutboxEvent.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/entity/OutboxEvent.java)
- Producer: [BookingEventProducer.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/kafka/BookingEventProducer.java)
- Background Poller: [OutboxService.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/service/OutboxService.java)

```java
@Scheduled(fixedDelay = 10000)
@Transactional
public void processPendingOutboxEvents() {
    List<OutboxEvent> pendingEvents = outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING");
    for (OutboxEvent event : pendingEvents) {
        try {
            String topic = "booking." + event.getEventType().toLowerCase().replace('_', '.');
            kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload());
            event.setStatus("SENT");
            event.setProcessedAt(ZonedDateTime.now());
            outboxEventRepository.save(event);
        } catch (Exception e) {
            // Tăng số lần thử lại, nếu quá 5 lần thì đánh dấu FAILED để cảnh báo Admin
            event.setRetryCount(event.getRetryCount() == null ? 1 : event.getRetryCount() + 1);
            if (event.getRetryCount() >= 5) {
                event.setStatus("FAILED");
            }
            outboxEventRepository.save(event);
        }
    }
}
```

---

## 5. Danh Sách REST APIs & Quy Ước Dữ Liệu

Toàn bộ response API đều được đóng gói theo chuẩn chung qua [ApiResponse.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/main/java/com/tablemaster/booking/dto/response/ApiResponse.java):
```json
{
  "success": true,
  "message": "Thông điệp phản hồi",
  "data": { ... },
  "timestamp": "2026-10-09T17:35:11.896+07:00"
}
```

### Chi tiết các Endpoints:

| STT | Phương thức | URL Endpoint | Chức năng | Request Body chính | Role cho phép |
|---|---|---|---|---|---|
| 1 | `POST` | `/api/v1/bookings/request` | Khách gửi đặt bàn trực tuyến | `guestName, guestPhone, bookingDate, timeSlotId, tableIds, preorderItems` | CUSTOMER |
| 2 | `GET` | `/api/v1/bookings` | Xem danh sách đơn (lọc theo ngày, trạng thái) | Query param: `?bookingDate=...&status=...` | HOST, ADMIN |
| 3 | `GET` | `/api/v1/bookings/{id}` | Lấy chi tiết đơn | Không | ALL |
| 4 | `GET` | `/api/v1/bookings/my-bookings` | Khách xem lịch sử đặt của mình | Header: `X-User-Id` | CUSTOMER |
| 5 | `POST` | `/api/v1/bookings/{id}/approve-and-request-deposit` | Lễ tân duyệt & yêu cầu cọc | `depositAmount, deadlineMinutes, staffNotes` | HOST |
| 6 | `POST` | `/api/v1/bookings/{id}/reject` | Lễ tân từ chối đơn | `{"reason": "Hết bàn"}` | HOST |
| 7 | `POST` | `/api/v1/bookings/check-in` | Quét QR đón khách tại sảnh | `{"qrToken": "uuid-token"}` | HOST |
| 8 | `POST` | `/api/v1/bookings/{id}/complete` | Hoàn tất bữa ăn | Không | HOST |
| 9 | `POST` | `/api/v1/bookings/{id}/cancel` | Hủy đơn | `{"reason": "Khách bận"}` | CUSTOMER, HOST |
| 10 | `POST` | `/api/v1/bookings/{id}/transfer-table` | Chuyển bàn trong ca ăn | `sourceTableId, targetTableId, reason` | HOST |
| 11 | `POST` | `/api/v1/bookings/{id}/table-orders` | Gọi thêm món tại bàn | `tableId, items: [{ menuItemId, itemName, quantity, unitPrice }]` | WAITER |
| 12 | `GET` | `/api/v1/bookings/{id}/table-orders` | Xem các món đã gọi tại bàn | Không | ALL |
| 13 | `PATCH` | `/api/v1/bookings/table-orders/{itemId}/status` | Cập nhật tiến độ món (Bếp / Phục vụ) | `{"status": "SERVED"}` | KITCHEN, WAITER |

---

## 6. Kiểm Thử Đơn Vị (Unit Testing)

File kiểm thử tự động: [BookingServiceTest.java](file:///d:/File/KÌ%207/SBA301/Project/Project_SBA301/src/server/booking-service/src/test/java/com/tablemaster/booking/service/BookingServiceTest.java)

Bao gồm 4 ca kiểm thử trọng yếu:
1. `createBooking_Success`: Kiểm thử tạo đơn đặt bàn thành công, mã đơn sinh đúng định dạng `BK...`, trạng thái ban đầu là `PENDING_REVIEW` và sự kiện Kafka được kích hoạt đúng 1 lần.
2. `createBooking_ThrowsTableAlreadyBookedException`: Giả lập bàn đã có người đặt trong cùng khung giờ, kiểm tra hệ thống chặn kịp thời và ném lỗi 409 Conflict.
3. `checkIn_Success`: Giả lập quét đúng mã `checkinQrToken` khi đơn đang `CONFIRMED`, hệ thống chuyển sang `SEATED` và ghi nhận `seatedAt`.
4. `checkIn_ThrowsExceptionWhenNotConfirmed`: Giả lập quét mã khi đơn chưa được duyệt (`PENDING_REVIEW`), kiểm tra hệ thống từ chối và ném lỗi `InvalidBookingStateException`.

Chạy kiểm thử bằng lệnh Maven:
```bash
mvn test -pl :booking-service
```
Kết quả thực tế: **Tests run: 4, Failures: 0, Errors: 0, Skipped: 0 — BUILD SUCCESS**.

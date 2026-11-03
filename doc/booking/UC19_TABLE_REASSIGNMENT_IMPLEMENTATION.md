# TÀI LIỆU HIỆN THỰC UC-19: CHUYỂN ĐỔI VỊ TRÍ BÀN GIỮA CHỪNG (TABLE RE-ASSIGNMENT)

> **Mã Use Case:** UC-19  
> **Tên Use Case:** Chuyển đổi Vị trí Bàn giữa chừng (Table Re-assignment)  
> **Phân hệ phụ trách:** Booking & Dispatch Service (:8083)  
> **Thành viên thực hiện:** Duy Đào (Module 3)  
> **Quy tắc nghiệp vụ:** BR-10 (Table Transfer Rule)

---

## 1. Nghiệp Vụ Chuyển Bàn

Khi khách hàng đang ngồi ăn tại Bàn A nhưng có nhu cầu chuyển sang Bàn B (do bàn B có góc ngắm cảnh đẹp hơn vừa trống, hoặc muốn đổi sang khu vực yên tĩnh hơn):
- Nhân viên Lễ tân hoặc Phục vụ thao tác **Chuyển Bàn** trên màn hình Tablet hoặc Mobile App.
- **Quy tắc bảo toàn dữ liệu (BR-10):**
  - Toàn bộ danh sách món ăn đã order và đang chế biến của Bàn A được chuyển nguyên vẹn sang Bàn B.
  - Số tiền cọc đã thanh toán và lịch sử giao dịch được giữ nguyên.
  - Bàn A tự động chuyển sang trạng thái `CLEANING` (hoặc `AVAILABLE`), Bàn B chuyển sang `SEATED`.
  - Hệ thống ghi nhật ký kiểm toán vào bảng `table_operations_audit` với `operation_type = TABLE_TRANSFER`.

---

## 2. DTO & API Endpoint

- **DTO:** [`TransferTableRequest.java`](file:///d:/SBA301/Projec_Cuoi_Ki/src/server/booking-service/src/main/java/com/tablemaster/booking/dto/request/TransferTableRequest.java)
  ```java
  public class TransferTableRequest {
      private UUID bookingId;
      private String fromTableCode;
      private String toTableCode;
      private String reason;
      private String performedBy;
  }
  ```
- **API:** `POST /api/v1/dispatch/transfer-table`
- **Audit Logging:** Lưu trữ vết ai là người chuyển bàn, lý do chuyển bàn, thời gian chuyển bàn để tránh thất thoát hóa đơn.

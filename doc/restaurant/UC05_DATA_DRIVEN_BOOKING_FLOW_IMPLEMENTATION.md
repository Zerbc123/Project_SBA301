# TÀI LIỆU HIỆN THỰC UC-05: ĐẶT BÀN THEO THÔNG TIN CUNG CẤP & CHỌN KHU VỰC (DATA-DRIVEN BOOKING FLOW)

> **Mã Use Case:** UC-05  
> **Tên Use Case:** Đặt bàn theo Thông tin Cung cấp & Chọn Khu vực (Data-driven Booking Flow)  
> **Phân hệ phụ trách:** Restaurant & Floor Service (:8082) & Booking Frontend (`tablemaster-ui`)  
> **Thành viên thực hiện:** Trí Thông (Module 2)  
> **Hệ thống liên quan:** `restaurant-service` (Spring Boot 3, JPA, PostgreSQL), `tablemaster-ui` (React 19, TypeScript, TailwindCSS).

---

## 1. Bối Cảnh & Định Hướng Kiến Trúc Mới

Nhằm tối ưu hóa trải nghiệm khách hàng (Customer Experience) và loại bỏ sự phức tạp không cần thiết của bản đồ 2D/3D canvas kéo thả, hệ thống TableMaster đã chuẩn hóa quy trình đặt bàn theo luồng **Data-driven Booking Flow**:
- Khách hàng không cần phải chọn thủ công từng vị trí tọa độ bàn trên sơ đồ.
- Khách chỉ cần cung cấp 4 thông tin cốt lõi: **Ngày đặt**, **Khung ca giờ**, **Số lượng khách** và **Lựa chọn phân khu trải nghiệm (Zone)**.
- Hệ thống backend tự động quét các bàn trống thỏa mãn sức chứa (BR-01) và thuộc đúng phân khu yêu cầu.

```
[BƯỚC 1: Ngày & Ca Giờ] ➔ [BƯỚC 2: Số Khách & Chọn Zone] ➔ [BƯỚC 3: Chọn Món Signature] ➔ [BƯỚC 4: Cọc VietQR]
```

---

## 2. Các Phân Khu Trải Nghiệm (Zone Types)

Dữ liệu phân khu được chuẩn hóa trong cơ sở dữ liệu `TableEntity.zoneType`:
1. `OUTDOOR` (Ban công sân vườn ngoài trời): Thích hợp không gian thoáng đãng, lãng mạn.
2. `WINDOW_VIEW` (Cửa sổ kính ngắm phố): Thích hợp ngắm cảnh thành phố về đêm.
3. `PRIVATE_VIP` (Phòng riêng độc quyền): Dành cho đối tác, tiệc gia đình cần sự riêng tư.
4. `BAR_COUNTER` (Quầy bar hiện đại): Thích hợp khách 1-2 người, thưởng thức cocktail.
5. `STANDARD` (Sảnh chính tiêu chuẩn): Không gian ẩm thực ấm cúng, sang trọng.

---

## 3. Kiến Trúc Kỹ Thuật

### 3.1. Entity & Repository
- `TableEntity`: Chứa trường `zoneType`, `minCapacity`, `maxCapacity`, `isActive`, `customDeposit`.
- `TableRepository`: Cung cấp hàm tra cứu danh sách bàn hoạt động theo Zone:
  ```java
  List<TableEntity> findByZoneTypeAndIsActiveTrue(String zoneType);
  ```

### 3.2. Frontend Component ([BookingPage.tsx](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/BookingPage.tsx))
- Section 1: Bộ chọn ngày (Date Picker), Khung ca giờ hot slots.
- Section 2: Bộ chọn số lượng người lớn, trẻ em và Grid các thẻ phân khu Zone trực quan kèm hình ảnh và mô tả.
- Real-time indicator: Hiển thị trạng thái còn bàn trống hoặc hết chỗ theo từng Zone.

---

## 4. Kiểm Thử & Xác Nhận
- Backend Unit Test: `TableServiceTest.java` vượt qua 100%.
- Frontend Build: `npm run build` thành công, 0 lỗi TypeScript.

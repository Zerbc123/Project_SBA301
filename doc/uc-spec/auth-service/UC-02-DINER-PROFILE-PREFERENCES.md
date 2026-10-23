# ĐẶC TẢ CHI TIẾT USE CASE: UC-02
# QUẢN LÝ HỒ SƠ & SỞ THÍCH ẨM THỰC THỰC KHÁCH (DINER PROFILE & DIETARY PREFERENCES)

> **Dự án:** Hệ thống Quản lý Đặt bàn & Điều phối Bàn ăn Nhà hàng Cao cấp (TableMaster)  
> **Phân hệ:** Module 1 - Auth & Identity Service (Port 8081)  
> **Mã Use Case:** `UC-02`  
> **Trạng thái:**  **Hoàn thành 100% & Đã kiểm thử thành công (Tested & Verified)**

---

## 1. TỔNG QUAN USE CASE (OVERVIEW)

### 1.1. Mục tiêu
Cho phép khách hàng và thành viên lưu trữ, cá nhân hóa hồ sơ cá nhân và các thông tin ghi chú ẩm thực đặc biệt:
* **Ghi chú Dị ứng thực phẩm nghiêm ngặt:** Dị ứng hải sản có vỏ, dị ứng đậu phộng, không dung nạp gluten, dị ứng sữa bò lactose.
* **Chế độ dinh dưỡng đặc biệt:** Ăn chay (Vegetarian / Vegan), Eat-clean, không ăn cay, kiêng đường.
* **Sở thích khẩu vị & Đồ uống:** Thích vang đỏ Bordeaux, thích góc ngồi yên tĩnh ngắm phố.
* **Thông tin cá nhân:** Họ tên đầy đủ, ảnh đại diện Avatar URL, số điện thoại liên hệ.

Khi khách hàng tiến hành đặt bàn ở Module Booking, các sở thích ẩm thực và cảnh báo dị ứng này sẽ được hệ thống tự động kế thừa và chuyển tiếp đến Tablet của Lễ tân và Bếp KDS để đảm bảo an toàn tuyệt đối cho thực khách.

### 1.2. Hệ thống Tác nhân (Actors)
* **Khách hàng (Customer):** Tự cập nhật sở thích qua Popup Hồ sơ cá nhân (Profile Modal).
* **Quản trị viên / Lễ tân:** Tra cứu ghi chú ẩm thực trên Admin Studio và Tablet để chuẩn bị bàn chu đáo.

---

## 2. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

* **BR-PROF-01:** Họ và tên không được để trống và không vượt quá 100 ký tự.
* **BR-PROF-02:** Chuỗi ghi chú sở thích ẩm thực (`dietary_preferences`) tối đa 1,000 ký tự.
* **BR-PROF-03:** Người dùng chỉ có quyền cập nhật hồ sơ của chính mình qua Bearer token (`userId` được trích xuất từ JWT).
* **BR-PROF-04:** Dữ liệu sở thích được lưu trữ dưới dạng text có cấu trúc, hiển thị trực quan dạng thẻ Badge màu sắc trên giao diện.

---

## 3. DANH SÁCH ENDPOINTS API

| Phương thức | Đường dẫn Endpoint | Quyền hạn | Mô tả |
| :---: | :--- | :---: | :--- |
| `GET` | `/api/v1/auth/me` | Authenticated | Lấy toàn bộ thông tin hồ sơ, avatar và ghi chú ẩm thực |
| `PUT` | `/api/v1/auth/me` | Authenticated | Cập nhật họ tên, ảnh đại diện và sở thích ẩm thực (`UpdateProfileRequest`) |

### Request Body (`UpdateProfileRequest`):
```json
{
  "fullName": "Nguyễn Văn A",
  "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
  "dietaryPreferences": "Dị ứng hải sản có vỏ, Không ăn cay, Thích vang đỏ"
}
```

---

## 4. GIAO DIỆN CLIENT TƯƠNG TÁC (UI MODAL)

* File giao diện: [ProfileModal.tsx](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/components/common/ProfileModal.tsx).
* Cung cấp các thẻ chọn nhanh (Quick Tags):
  - `Dị ứng hải sản` | `Dị ứng đậu phộng` | `Không dung nạp gluten` | `Dị ứng sữa bò`
  - `Ăn chay` | `Eat-clean` | `Không ăn cay` | `Thích vang đỏ`
* Hiển thị Huy hiệu Hạng thành viên VIP và điểm tích lũy hiện có.

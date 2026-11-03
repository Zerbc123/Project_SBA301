# TÀI LIỆU HIỆN THỰC UC-21: GHI CHÚ NỘI BỘ CHĂM SÓC KHÁCH BÀN (INTERNAL HOST VIP NOTES)

> **Mã Use Case:** UC-21  
> **Tên Use Case:** Ghi chú Nội bộ Chăm sóc Khách Bàn (Internal Host VIP Notes)  
> **Phân hệ phụ trách:** Booking & Dispatch Service (:8083)  
> **Thành viên thực hiện:** Duy Đào (Module 3)  
> **Phạm vi hiển thị:** Chỉ hiển thị nội bộ cho Lễ tân, Quản lý ca và Phục vụ; tuyệt đối bảo mật, không xuất hiện trên vé hay hóa đơn của khách.

---

## 1. Nghiệp Vụ Chăm Sóc Khách Nhạy Cảm

Trong ca trực vận hành nhà hàng cao cấp, việc ghi nhận thông tin nội bộ giữa các ca là yếu tố quyết định sự tinh tế:
- Khách là người quen của Chủ nhà hàng / VIP Investor.
- Khách phàn nàn điều hòa gió lạnh ca trước $\rightarrow$ nhắc phục vụ chuẩn bị khăn ấm hoặc xếp bàn khuất gió.
- Khẩu vị đặc biệt: Khách thích uống nước ấm không đá, không dùng ngò rí, thích rượu rót sẵn lúc 19:30.

---

## 2. Kỹ Thuật Triển Khai
- Lưu trữ trong trường `staffNotes` của entity [`Booking.java`](file:///d:/SBA301/Projec_Cuoi_Ki/src/server/booking-service/src/main/java/com/tablemaster/booking/entity/Booking.java).
- Cập nhật qua DTO [`UpdateSpecialRequestsRequest.java`](file:///d:/SBA301/Projec_Cuoi_Ki/src/server/booking-service/src/main/java/com/tablemaster/booking/dto/request/UpdateSpecialRequestsRequest.java).
- Hiển thị trực tiếp trong Drawer chi tiết bàn trên [`HostTabletPage.tsx`](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/HostTabletPage.tsx) với icon nhãn nội bộ màu vàng cam đặc trưng.

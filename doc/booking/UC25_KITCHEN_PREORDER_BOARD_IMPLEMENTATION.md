# TÀI LIỆU HIỆN THỰC UC-25: TIẾP NHẬN DANH SÁCH MÓN ĐẶT TRƯỚC TRÊN KDS (KITCHEN PRE-ORDER BOARD)

> **Mã Use Case:** UC-25  
> **Tên Use Case:** Tiếp nhận Danh sách Món Đặt trước trên KDS (Kitchen Pre-order Board)  
> **Phân hệ phụ trách:** Booking & Dispatch Service (:8083) & Kitchen KDS UI  
> **Thành viên thực hiện:** Duy Đào (Module 3)  
> **Giao diện người dùng:** [`KitchenKdsPage.tsx`](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/KitchenKdsPage.tsx)

---

## 1. Nghiệp Vụ Bếp KDS (Kitchen Display System)

Để giảm thời gian chờ đợi của thực khách khi gọi các món Signature cầu kỳ (như Bò Wagyu A5 cần rã đông ở nhiệt độ chuẩn, Rượu vang cần decant thở trước 30 phút, hoặc các món hầm thảo mộc):
- Màn hình KDS tại khu vực Bếp tự động lọc và hiển thị danh sách các bàn sắp đến trong vòng **30 đến 45 phút tới** có món đặt trước ([UC-07](file:///d:/SBA301/Projec_Cuoi_Ki/doc/booking/UC07_PREORDER_SIGNATURE_MENU_IMPLEMENTATION.md)).
- Bếp trưởng (Head Chef) chủ động sơ chế, tẩm ướp sẵn sàng để ngay khi khách vừa quét mã QR check-in vào bàn ([UC-16](file:///d:/SBA301/Projec_Cuoi_Ki/doc/booking/UC16_HOST_CAMERA_QR_SCANNER_IMPLEMENTATION.md)), món ăn nóng sốt được mang lên phục vụ trong vòng 5-7 phút.

---

## 2. Luồng Đồng Bộ Thời Gian Thực

1. **Sự kiện đặt cọc thành công:** Kafka phát `BookingConfirmedEvent` có danh sách `preorderItems`.
2. **KDS Consumer:** Nhận sự kiện và đẩy vé order lên cột "Đặt Trước Sắp Đến" trên màn hình KDS.
3. **Thanh đếm ngược thời gian:** Hiển thị số phút còn lại trước khi khách đến bàn.

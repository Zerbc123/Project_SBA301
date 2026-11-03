# TÀI LIỆU HIỆN THỰC UC-31: APP PHỤC VỤ TẠI BÀN DI ĐỘNG (MOBILE WAITSTAFF ORDERING & ACTIONS)

> **Mã Use Case:** UC-31  
> **Tên Use Case:** App Phục Vụ Tại Bàn Di Động (Mobile Waitstaff Ordering & Actions)  
> **Phân hệ phụ trách:** Booking & Dispatch Service (:8083) & Mobile UI  
> **Thành viên thực hiện:** Duy Đào (Module 3)  
> **Giao diện người dùng:** [`WaitstaffMobilePage.tsx`](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/WaitstaffMobilePage.tsx)

---

## 1. Nghiệp Vụ Nhân Viên Phục Vụ Tại Bàn

Thiết bị cầm tay (Smartphone/Mobile POS) của nhân viên phục vụ bàn cung cấp toàn bộ công cụ thao tác nhanh:
1. **Thanh chọn bàn ngang (Horizontal Table Selector):** Hiển thị mã bàn, trạng thái màu sắc và số lượng khách.
2. **Gọi món tại bàn (In-table Ordering):**
   - Duyệt menu theo danh mục (Set Menu, Bò & Steak, Rượu vang, Tráng miệng).
   - Thêm món vào khay order, chỉnh sửa ghi chú bếp (Medium rare, ít cay, không hành...).
3. **Tự nhập món riêng ngoài menu:** Hỗ trợ nhập món theo yêu cầu đặc biệt của khách cùng đơn giá và ghi chú pha chế.
4. **Bắn Order Về Bếp KDS:** Chạm 1 nút "Gửi Order Bếp", hệ thống đẩy WebSocket tức thời sang [`KitchenKdsPage.tsx`](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/KitchenKdsPage.tsx) và Quầy thu ngân.
5. **Thao tác nhanh tại bàn:** Chuyển bàn ([UC-19](file:///d:/SBA301/Projec_Cuoi_Ki/doc/booking/UC19_TABLE_REASSIGNMENT_IMPLEMENTATION.md)), Ghép bàn ([UC-20](file:///d:/SBA301/Projec_Cuoi_Ki/doc/booking/UC20_SMART_TABLE_MERGING_IMPLEMENTATION.md)).

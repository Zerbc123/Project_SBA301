# TÀI LIỆU HIỆN THỰC UC-20: GỢI Ý & THỰC HIỆN GHÉP BÀN THÔNG MINH (SMART TABLE MERGING)

> **Mã Use Case:** UC-20  
> **Tên Use Case:** Gợi ý & Thực hiện Ghép bàn Thông minh (Smart Table Merging)  
> **Phân hệ phụ trách:** Booking & Dispatch Service (:8083)  
> **Thành viên thực hiện:** Duy Đào (Module 3)  
> **Quy tắc nghiệp vụ:** BR-05 (Thuật toán Ghép bàn), BR-11 (Gộp hóa đơn & cộng dồn món)

---

## 1. Nghiệp Vụ Ghép Bàn & Gộp Bill

Khi đón tiếp đoàn khách đông vượt quá sức chứa tối đa của 1 bàn đơn lẻ (ví dụ: đoàn 8-10 người trong khi bàn lớn nhất chỉ có 6 ghế):
1. Hệ thống hỗ trợ ghép 2 bàn cùng trống gần nhau trong cùng phân khu để phục vụ chung 1 đoàn.
2. **Quy tắc gộp Bill (BR-11):**
   - Danh sách món ăn được cộng dồn chung vào hóa đơn hợp nhất.
   - Tiền cọc của các bàn thành viên được cộng gộp lại.
   - Cập nhật liên kết nhiều bàn thông qua bảng quan hệ `booking_tables` ([`BookingTable.java`](file:///d:/SBA301/Projec_Cuoi_Ki/src/server/booking-service/src/main/java/com/tablemaster/booking/entity/BookingTable.java)).
   - Lưu vết kiểm toán thao tác `TABLE_MERGE` vào [`TableOperationsAudit.java`](file:///d:/SBA301/Projec_Cuoi_Ki/src/server/booking-service/src/main/java/com/tablemaster/booking/entity/TableOperationsAudit.java).

---

## 2. Giao Diện & Điều Phối
- Hỗ trợ thao tác đa chọn bàn trực tiếp trên cả **Host Tablet** ([`HostTabletPage.tsx`](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/HostTabletPage.tsx)) và **Mobile Waitstaff App** ([`WaitstaffMobilePage.tsx`](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/WaitstaffMobilePage.tsx)).
- Đồng bộ WebSocket STOMP tức thời để bếp và thu ngân nhận biết bàn đã được ghép nhóm.

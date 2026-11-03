# TÀI LIỆU HIỆN THỰC UC-26: CẬP NHẬT TRẠNG THÁI CHẾ BIẾN MÓN (FOOD PREPARATION STATUS)

> **Mã Use Case:** UC-26  
> **Tên Use Case:** Cập nhật Trạng thái Chế biến Món (Food Preparation Status)  
> **Phân hệ phụ trách:** Booking & Dispatch Service (:8083) & Kitchen KDS UI  
> **Thành viên thực hiện:** Duy Đào (Module 3)  
> **Enum Trạng thái:** [`OrderItemStatus.java`](file:///d:/SBA301/Projec_Cuoi_Ki/src/server/booking-service/src/main/java/com/tablemaster/booking/enums/OrderItemStatus.java) (`PENDING`, `PREPARING`, `READY_TO_SERVE`, `SERVED`, `CANCELLED`)

---

## 1. Vòng Đời Trạng Thái Chế Biến Món

Tại màn hình bếp KDS ([`KitchenKdsPage.tsx`](file:///d:/SBA301/Projec_Cuoi_Ki/src/client/tablemaster-ui/src/views/KitchenKdsPage.tsx)):
1. `PENDING` (Chờ chế biến): Món vừa được khách đặt trước hoặc phục vụ bàn bắn order về.
2. `PREPARING` (Đang nấu): Đầu bếp chạm vào món để nhận việc $\rightarrow$ Vé đổi màu vàng cam.
3. `READY_TO_SERVE` (Sẵn sàng lên món): Đầu bếp nấu xong, bấm chuông hoàn tất $\rightarrow$ Món đổi màu xanh ngọc, đồng thời bắn WebSocket thông báo sang Tablet của nhân viên phục vụ bàn đón món ra cho khách.
4. `SERVED` (Đã phục vụ): Nhân viên bưng món đặt lên bàn khách và xác nhận.

---

## 2. API Endpoint & Controller
- Controller: [`TableOrderController.java`](file:///d:/SBA301/Projec_Cuoi_Ki/src/server/booking-service/src/main/java/com/tablemaster/booking/controller/TableOrderController.java)
- API:
  - `PATCH /api/v1/orders/items/{itemId}/status?status=READY_TO_SERVE`
  - `GET /api/v1/orders/kds-active-tickets`

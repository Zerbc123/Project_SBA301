# ĐẶC TẢ TÍNH NĂNG UC-34: PHÂN HẠNG KHÁCH HÀNG VIP & LOYALTY CRM
> **Microservice:** Analytics & BI Service (:8085)  
> **Thành viên thực hiện:** Phong (phongtt.ce190157 / Git: Phong-the20)  
> **Nhánh phát triển:** Phong/analytics-service/uc-34-vip-customer-loyalty-crm  

---

## 1. Mục tiêu nghiệp vụ
- Tự động quản lý và phân hạng khách hàng thân thiết theo 4 cấp bậc hội viên:
  - **PLATINUM**: Chi tiêu >= 20.000.000 VNĐ hoặc ghé ăn >= 10 lần.
  - **GOLD**: Chi tiêu 10.000.000 - 20.000.000 VNĐ hoặc ghé ăn 6 - 9 lần.
  - **SILVER**: Chi tiêu 5.000.000 - 10.000.000 VNĐ hoặc ghé ăn 3 - 5 lần.
  - **BRONZE**: Khách hàng mới (1 - 2 lần).
- Ghi nhận lịch sử dùng bữa, khu vực bàn ăn ưa thích và quy mô bàn trung bình (Average Party Size).
- Cung cấp dữ liệu Real-time qua Kafka khi khách hoàn tất dùng bữa (ooking.completed).

## 2. API Contract
- GET /api/v1/analytics/customers/vip?tier=GOLD: Danh sách khách hàng theo hạng.
- GET /api/v1/analytics/customers/{userId}: Chi tiết hồ sơ tiêu dùng của khách hàng.
- GET /api/v1/analytics/overview: Tổng hợp toàn bộ chỉ số BI cho Dashboard Admin.
- POST /api/v1/analytics/test-simulator/simulate-booking-completed: Giả lập sự kiện khách ăn xong và thanh toán.
- POST /api/v1/analytics/test-simulator/seed-mock-data: Nạp dữ liệu giả lập ban đầu để kiểm thử.
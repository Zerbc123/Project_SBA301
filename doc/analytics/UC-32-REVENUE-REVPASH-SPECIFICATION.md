# ĐẶC TẢ TÍNH NĂNG UC-32: BÁO CÁO DOANH THU, REVPASH & TỶ LỆ NO-SHOW
> **Microservice:** Analytics & BI Service (:8085)  
> **Thành viên thực hiện:** Phong (phongtt.ce190157 / Git: Phong-the20)  
> **Nhánh phát triển:** Phong/analytics-service/uc-32-revenue-revpash-shift-analytics  

---

## 1. Mục tiêu nghiệp vụ
- Phân tích dòng tiền theo từng ca làm việc từ 11:00 đến 23:00 (ca trưa, ca tối giờ vàng, ca muộn).
- Tính toán chỉ số hiệu quả kinh doanh không gian sàn **RevPASH** (Revenue Per Available Seat Hour):
  \text{RevPASH} = \frac{\text{Tổng Doanh Thu Ca}}{\text{Số Ghế Khả Dụng (40)} \times \text{Thời Lượng Ca (2h)}}
- Tính toán tỷ lệ lấp đầy sàn (Occupancy Rate) theo quy mô 18 bàn ăn.
- Tự động tách bạch tiền phạt bùng cọc (No-Show Penalty) và doanh thu ăn uống thực tế.

## 2. API Contract
- GET /api/v1/analytics/shifts/daily?date=YYYY-MM-DD: Thống kê ca trong ngày.
- GET /api/v1/analytics/shifts/range?startDate=...&endDate=...: Thống kê ca theo khoảng thời gian.
- POST /api/v1/analytics/test-simulator/simulate-deposit-paid: Giả lập nhận cọc.
- POST /api/v1/analytics/test-simulator/simulate-no-show: Giả lập phạt bùng cọc.
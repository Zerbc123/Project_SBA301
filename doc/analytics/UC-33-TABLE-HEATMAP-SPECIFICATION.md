# ĐẶC TẢ TÍNH NĂNG UC-33: BẢN ĐỒ NHIỆT VỊ TRÍ BÀN ĂN (SPATIAL HEATMAP)
> **Microservice:** Analytics & BI Service (:8085)  
> **Thành viên thực hiện:** Phong (phongtt.ce190157 / Git: Phong-the20)  
> **Nhánh phát triển:** Phong/analytics-service/uc-33-table-popularity-heatmap  

---

## 1. Mục tiêu nghiệp vụ
- Xếp hạng độ hot của 18 bàn ăn theo 4 cấp độ nhiệt trực quan:
  - HOT (Đỏ rực, Heat Score >= 80%): Doanh thu cao nhất.
  - WARM (Vàng cam, Heat Score 50% - 80%): Bàn ưa chuộng.
  - NORMAL (Xanh lá, Heat Score 20% - 50%): Bàn trung bình.
  - COOL (Xanh lam, Heat Score < 20%): Bàn ít khách chọn, cần điều chỉnh marketing.
- Cung cấp mã màu HEX cho 2D Floor Plan rendering (#EF4444, #F59E0B, #10B981, #3B82F6).

## 2. API Contract
- GET /api/v1/analytics/tables/heatmap: Dữ liệu bản đồ nhiệt toàn sàn.
- GET /api/v1/analytics/tables/ranking?limit=10: Bảng xếp hạng top bàn hot có validate @Min(1) @Max(100).
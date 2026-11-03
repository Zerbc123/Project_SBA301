# ĐẶC TẢ TÍNH NĂNG UC-33: PHÂN TÍCH XẾP HẠNG ĐỘ HOT BÀN ĂN DẠNG THẺ BOX CHO QUẢN TRỊ (ADMIN TABLE BOX HEATMAP)
> **Microservice:** Analytics & BI Service (:8085)  
> **Thành viên thực hiện:** Phong (phongtt.ce190157 / Git: Phong-the20)  
> **Nhánh phát triển:** Phong/analytics-service/uc-33-table-popularity-heatmap  
> **Phạm vi hiển thị:** Chỉ hiển thị nội bộ trong Admin Studio (Lưới thẻ Box bàn), tuyệt đối không public ra ngoài cho khách hàng.

---

## 1. Mục tiêu nghiệp vụ
- Xếp hạng độ hot của 18 thẻ box bàn ăn theo 4 cấp độ nhiệt trực quan:
  - HOT (Đỏ rực, Heat Score >= 75%): Doanh thu và lượt đặt cao nhất.
  - WARM (Vàng cam, Heat Score 50% - 74%): Bàn ưa chuộng.
  - NORMAL (Xanh lá, Heat Score 25% - 49%): Bàn trung bình.
  - COOL (Xanh lam, Heat Score < 25%): Bàn ít khách chọn, cần tối ưu chương trình khuyến mãi.
- Cung cấp mã màu HEX cho thẻ Box hiển thị trên giao diện Admin (#EF4444, #F59E0B, #10B981, #3B82F6).
- Lọc theo từng phân khu kiến trúc: VIP, Outdoor, Window, Bar, Standard.

## 2. API Contract
- GET /api/v1/analytics/tables/heatmap: Dữ liệu xếp hạng độ hot thẻ box toàn sàn.
- GET /api/v1/analytics/tables/ranking?limit=10: Bảng xếp hạng top bàn hot có validate @Min(1) @Max(100).
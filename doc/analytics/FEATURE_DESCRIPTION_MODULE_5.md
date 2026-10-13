# BÁO CÁO MÔ TẢ TỔNG HỢP MODULE 5: ANALYTICS & BI SERVICE
> **Dự án:** TableMaster - Hệ Thống Đặt Bàn & Điều Phối Bàn Ăn Nhà Hàng Cao Cấp Microservices  
> **Phân hệ:** Module 5: Analytics & Business Intelligence (BI) Service (Cổng 8085)  
> **Thành viên thực hiện:** Phong (`phongtt.ce190157` / Git: `Phong-the20`)  
> **Nhánh Git (Feature Branch):** `feature/phong-analytics-service`  
> **Danh sách Use Cases phụ trách theo Backlog:** **UC-32**, **UC-33**, **UC-34**  
> **Ngày hoàn thành:** 12/10/2026  

---

## 📌 I. TỔNG QUAN PHÂN HỆ
Module 5 (**Analytics & BI Service**) đóng vai trò là trung tâm phân tích dữ liệu kinh doanh của toàn bộ hệ thống TableMaster. Service hoạt động theo kiến trúc **Event-Driven Architecture (EDA)**, không can thiệp trực tiếp vào giao dịch đặt bàn hay thanh toán mà tự động lắng nghe các sự kiện từ các Service khác qua **Apache Kafka** để tổng hợp báo cáo kinh doanh theo thời gian thực.

* **Port Backend:** `8085` (Spring Boot 3.3.x, Java 17)
* **Database riêng:** `tablemaster_analytics` (PostgreSQL 16)
* **Message Broker:** Apache Kafka (Port 9092, KRaft Mode)
* **Giao diện quản trị:** React 19 + TypeScript + Vite + Tailwind CSS (`src/client/tablemaster-ui`)

---

## 🚀 II. CHI TIẾT CÁC USE CASES ĐÃ HOÀN THÀNH

### 1. UC-32: Báo cáo Doanh thu, RevPASH & Tỷ lệ No-Show (Revenue & RevPASH Analytics)
* **Mức độ ưu tiên:** High | **Đợt triển khai:** Iteration 1 (12/10/2026 - 26/10/2026)
* **Phân bổ dòng tiền theo khung giờ:** Biểu đồ trực quan từ **11:00 đến 23:00** (khớp 100% thời gian mở cửa nhà hàng, bao gồm ca trưa, ca tối, giờ cao điểm và chốt ca muộn).
* **Chỉ số vàng RevPASH (Revenue Per Available Seat Hour):**
  $$\text{RevPASH} = \frac{\text{Tổng Doanh Thu Ca}}{\text{Tổng Số Ghế Khả Dụng} \times \text{Thời Gian Ca (giờ)}}$$
  Tự động đánh giá hiệu quả sinh lời của từng mét vuông sàn nhà hàng theo từng giờ phục vụ.
* **Tỷ lệ lấp đầy sàn (Occupancy Rate):** Thống kê phần trăm công suất sử dụng bàn thực tế so với tổng số bàn thiết kế.
* **Xử lý tiền phạt bùng hẹn (No-Show Penalty):**
  * Tiền cọc của khách bùng hẹn (`200.000 đ` / đơn) tự động bị tịch thu sung công quỹ.
  * Tách bạch rõ ràng trong doanh thu ca:
    $$\text{Tổng Doanh Thu Ca} = \text{Tiền Ăn Uống (Food Bill)} + \text{Tiền Phạt Bùng Cọc (No-Show Penalty)}$$

### 2. UC-33: Bản đồ Nhiệt Vị trí Bàn ăn (Table Popularity Heatmap)
* **Mức độ ưu tiên:** Low | **Đợt triển khai:** Iteration 2 (12/10/2026 - 09/11/2026)
* **Xếp hạng độ Hot của bàn:** Phân loại 18 bàn ăn theo 4 cấp độ nhiệt:
  * 🔴 **HOT (Đỏ):** Độ hot > 80% (Bàn được săn đón nhiều nhất, doanh thu bùng nổ).
  * 🟡 **WARM (Vàng):** Độ hot 50% - 80% (Bàn ưa thích).
  * 🟢 **NORMAL (Xanh lá):** Độ hot 30% - 50% (Bàn thông thường).
  * 🔵 **COOL (Xanh dương):** Độ hot < 30% (Bàn ít người chọn, cần tối ưu chương trình khuyến mãi).
* **Lọc theo 5 phân khu kiến trúc:** Private VIP (`PRIVATE_VIP`), Sân vườn (`OUTDOOR`), Cửa sổ ngắm cảnh (`WINDOW_VIEW`), Quầy Bar (`BAR_COUNTER`), và Tiêu chuẩn (`STANDARD`).

### 3. UC-34: Phân tích Hồ sơ & Phân hạng Khách hàng VIP (VIP Customer Insights & Loyalty CRM)
* **Mức độ ưu tiên:** Medium | **Đợt triển khai:** Iteration 2 (12/10/2026 - 09/11/2026)
* **Quản lý hồ sơ khách hàng quen thuộc theo 4 hạng hội viên:**
  * 👑 **PLATINUM:** Chi tiêu > 50M hoặc ghé > 10 lần.
  * 🥇 **GOLD:** Chi tiêu 20M - 50M (6 - 10 lần).
  * 🥈 **SILVER:** Chi tiêu 5M - 20M (3 - 5 lần).
  * 🥉 **BRONZE:** Khách mới ghé (1 - 2 lần).
* **Theo dõi thói quen khách hàng:** Vị trí bàn ưa thích, số người đi cùng trung bình (*Average Party Size*), ngày ghé gần nhất để phục vụ cá nhân hóa trải nghiệm.

### 4. Thành phần Kiến trúc Kỹ thuật: Kafka Consumer & Simulator Kiểm thử
* **Consumer lắng nghe tự động:**
  * Topic `booking-events`: Lắng nghe `COMPLETED` (khách ăn xong) và `NO_SHOW` (khách bùng hẹn).
  * Topic `payment-events`: Lắng nghe `SUCCESS` (khách cọc tiền qua VietQR).
* **Công cụ Simulator (Tab 4):**
  * Hỗ trợ bắn trực tiếp các Event giả lập qua Kafka để cả nhóm hoặc Giảng viên kiểm thử luồng đồng bộ thời gian thực độc lập mà không cần chờ chạy cùng lúc toàn bộ 5 microservice.
* **Kiểm thử tự động:** Viết đầy đủ Unit Test `AnalyticsServiceUnitTest.java` kiểm thử logic toán học và nghiệp vụ.

---

## 🛠️ III. GIẢI TRÌNH CÁC FILE CHUNG ĐÃ SỬA ĐỔI
*(Nhằm giải đáp thắc mắc của nhóm về việc có sửa file chung nào không)*

Em chỉ chỉnh sửa nhẹ **3 file cấu hình chung** nhằm giúp cả nhóm chạy được môi trường Docker trơn tru, **tuyệt đối không đụng chạm hay gây ảnh hưởng logic đến code của các module khác**:

1. **`docker-compose.yml`**:
   * *Nguyên nhân:* Image Kafka cũ `bitnami/kafka:3.7` đã bị gỡ khỏi Docker Hub dẫn đến lỗi khi chạy `docker compose up`.
   * *Đã sửa:* Chuyển sang image chính chủ `apache/kafka:latest` (chạy cơ chế KRaft không cần Zookeeper, nhẹ và ổn định hơn).
2. **`infrastructure/db-init/01-init-databases.sh`**:
   * *Đã sửa:* Bổ sung tạo database `tablemaster_analytics` và định dạng chuẩn ngắt dòng LF cho môi trường container Alpine Linux.
3. **`src/client/tablemaster-ui/src/views/AdminStudioPage.tsx`**:
   * *Đã sửa:* Nhúng component `AnalyticsBiSection` vào menu sidebar "Báo Cáo Doanh Thu Ca" để hiển thị tab của Module 5.
4. **`.gitattributes`**:
   * *Thêm mới:* Khóa định dạng dòng LF cho các file script `*.sh` để tránh lỗi khi các thành viên clone code trên Windows.

---

## 💻 IV. HƯỚNG DẪN CHẠY & KIỂM THỬ (HOW TO RUN & TEST)

### 1. Khởi động hạ tầng Docker:
```bash
docker compose up -d
```
*(Đảm bảo 3 container `tablemaster_postgres`, `tablemaster_redis`, `tablemaster_kafka` đều ở trạng thái Up).*

### 2. Chạy Backend Analytics (Port 8085):
```bash
cd src/server/analytics-service
mvn spring-boot:run
```
* Swagger / API Docs: `http://localhost:8085/swagger-ui.html`
* Endpoint lấy tổng quan: `GET http://localhost:8085/api/v1/analytics/overview`

### 3. Chạy Frontend:
```bash
cd src/client/tablemaster-ui
npm run dev
```
* Truy cập trang Admin: `http://localhost:5173/admin`
* Chọn tab **"Báo Cáo Doanh Thu Ca"** trên menu bên trái để kiểm tra giao diện.

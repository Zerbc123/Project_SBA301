# TÀI LIỆU TOÀN DIỆN VỀ ĐẶC TẢ NGHIỆP VỤ & KIẾN TRÚC KỸ THUẬT
# DỰ ÁN: TABLEMASTER – HỆ THỐNG ĐẶT BÀN & ĐIỀU PHỐI MẶT BẰNG THỜI GIAN THỰC (INTERACTIVE 2D FLOOR PLAN BOOKING PLATFORM)

> **Thông tin đồ án tốt nghiệp / môn học:**
> * **Tên dự án:** TableMaster
> * **Thời gian thực hiện:** 10 tuần (5 Sprints).
> * **Quy mô nhóm:** 05 thành viên (02 Frontend, 03 Backend).
> * **Công nghệ cốt lõi:** React (Tailwind CSS, Konva.js / HTML5 Canvas) + Java Spring Boot 3.x, Spring Cloud Gateway, Netflix Eureka Server (Apache Kafka, Redis Redlock, RabbitMQ / Delayed Exchange, WebSocket STOMP, PostgreSQL / JSONB).

---

## MỤC LỤC
1. [TỔNG QUAN DỰ ÁN & BÀI TOÁN KINH DOANH (BUSINESS CASE)](#1-tổng-quan-dự-án--bài-toán-kinh-doanh-business-case)
2. [CHÂN DUNG NGƯỜI DÙNG MỤC TIÊU (USER PERSONAS)](#2-chân-dung-người-dùng-mục-tiêu-user-personas)
3. [QUY TRÌNH NGHIỆP VỤ & STATE MACHINE (BUSINESS WORKFLOWS)](#3-quy-trình-nghiệp-vụ--state-machine-business-workflows)
4. [MÔ HÌNH DOANH THU & CHỈ SỐ ĐO LƯỜNG (MONETIZATION & KPIS)](#4-mô-hình-doanh-thu--chỉ-số-đo-lường-monetization--kpis)
5. [ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)](#5-đặc-tả-yêu-cầu-chức-năng-functional-requirements)
6. [KIẾN TRÚC KỸ THUẬT & THIẾT KẾ CSDL (TECHNICAL ARCHITECTURE & ERD)](#6-kiến-trúc-kỹ-thuật--thiết-kế-csdl-technical-architecture--erd)
7. [THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX DESIGN)](#7-thiết-kế-giao-diện--trải-nghiệm-người-dùng-uiux-design)
8. [PHÂN CHIA CÔNG VIỆC CHO NHÓM 5 NGƯỜI (WORK BREAKDOWN STRUCTURE)](#8-phân-chia-công-việc-cho-nhóm-5-người-work-breakdown-structure)
9. [LỘ TRÌNH TRIỂN KHAI TRONG 10 TUẦN (10-WEEK ROADMAP)](#9-lộ-trình-triển-khai-trong-10-tuần-10-week-roadmap)
10. [MA TRẬN QUẢN TRỊ RỦI RO & BẢO VỆ ĐỒ ÁN (RISK MATRIX & DEFENSE)](#10-ma-trận-quản-trị-rủi-ro--bảo-vệ-đồ-án-risk-matrix--defense)
11. [PHÂN TÍCH CHUYÊN SÂU & LỜI KHUYÊN TRIỂN KHAI CHO TEAM](#11-phân-tích-chuyên-sâu--lời-khuyên-triển-khai-cho-team)

---

## 1. TỔNG QUAN DỰ ÁN & BÀI TOÁN KINH DOANH (BUSINESS CASE)

### 1.1. Bối cảnh Dự án: Giải pháp Gia công Độc quyền (Bespoke / Outsource)
Dự án được xây dựng theo đơn đặt hàng phát triển phần mềm độc quyền (**Outsourced Tailored Booking Platform**) cho một thương hiệu nhà hàng ẩm thực cao cấp cụ thể (ví dụ: *The Prime Bistro & Steakhouse* – không gian 3 tầng gồm Sảnh chính, Phòng tiệc VIP và Sky Lounge Rooftop).

Thay vì phải phụ thuộc vào các nền tảng trung gian đại trà (PasGo, TableNow) khiến thương hiệu bị cạnh tranh trực tiếp với hàng ngàn đối thủ và mất từ **10% đến 15% hoa hồng trên mỗi khách**, nhà hàng quyết định đầu tư sở hữu riêng một hệ thống đặt bàn và quản lý nhà hàng thời gian thực mang đậm bản sắc thương hiệu.

### 1.2. Nỗi đau của Nhà hàng (Restaurant Pain Points)
* **Mất khách hàng trung thành vào tay các sàn trung gian:** Khách đặt qua app bên thứ ba thường so sánh giá với các quán xung quanh, nhà hàng không thể xây dựng tệp khách VIP thân thiết riêng.
* **Tỷ lệ "Bùng hẹn" (No-Show Rate) cao:** Khách gọi hotline hoặc nhắn Fanpage giữ bàn đẹp lúc 19:30 cuối tuần nhưng không đến, khiến bàn bỏ trống trong khi khách vãng lai (Walk-in) tại cửa bị từ chối $\rightarrow$ Thiệt hại ước tính 15% – 25% doanh thu mỗi đêm cuối tuần.
* **Xung đột điều phối nội bộ (Double-Booking):** Lễ tân tại cửa, hotline và admin Fanpage cùng nhận khách trên sơ đồ giấy, dẫn đến tình trạng hai đoàn khách cùng đến nhận một bàn VIP nhìn ra phố đi bộ.
* **Mù mờ thông tin chỗ ngồi:** Thực khách cao cấp chi trả tiền triệu cho một bữa tối nhưng không biết trước mình sẽ ngồi ở góc ồn ào hay bàn cạnh lối đi nhà vệ sinh.

### 1.3. Giải pháp TableMaster đem lại cho Nhà hàng
* **Kênh đặt bàn trực tiếp (Direct Booking Channel):** Khách hàng truy cập trực tiếp website/app của chính nhà hàng, nhập thông tin đặt bàn (Ngày, Giờ, Số khách, Khu vực Zone yêu cầu: Ban công, Phòng VIP, Cửa kính...) một cách trực quan, nhanh chóng.
* **Khóa bàn chống tranh chấp & Cọc VietQR trực tiếp:** Bàn được khóa tạm 5 phút bằng Redis Redlock; tiền cọc chuyển khoản **thẳng vào số tài khoản ngân hàng của chính nhà hàng** (không qua ví trung gian của bất kỳ bên thứ ba nào).
* **Màn hình Tablet Lễ tân tại sảnh (Host Dispatch Screen):** Lễ tân đón khách chỉ cần quét mã QR trên điện thoại khách để check-in tự động, quản lý bàn qua lưới các **Thẻ Box Bàn** trực quan, chạm 1 chạm để đổi trạng thái bàn (`SEATED` / `CLEANING`) hoặc gộp bàn cho đoàn đông.
* **Hỗ trợ đặt trước món ăn (Pre-order Signature Menu):** Khách có thể đặt cọc bàn kèm đặt trước các món cao cấp (Steak bò Mỹ, Rượu vang) để bếp chuẩn bị chu đáo trước khi khách đến.

---

## 2. CHÂN DUNG NGƯỜI DÙNG MỤC TIÊU (USER PERSONAS)

```
+------------------------------------------------------------------------------------+
|                               CÁC NHÓM NGƯỜI DÙNG CHÍNH                            |
+--------------------------+----------------------------+----------------------------+
|  1. Diners (Khách hàng)  | 2. Floor Host (Lễ tân ca)  | 3. Owner (Chủ/Quản lý quán)|
|  - Cần biết trước vị trí | - Cần nhìn tổng quan sàn   | - Cần tối ưu doanh thu/bàn |
|  - Cần xác nhận tức thì  | - Đổi trạng thái bàn nhanh | - Xem báo cáo hiệu suất    |
|  - Sẵn sàng cọc bàn đẹp  | - Check-in bằng QR code    | - Tự chỉnh sửa layout quán |
+--------------------------+----------------------------+----------------------------+
```

### Persona 1: Thực khách cá nhân (The Experience Seeker - Diners)
* **Đại diện:** Nguyễn Hoàng Long, 28 tuổi, Trưởng nhóm Marketing tại TP.HCM.
* **Hành vi:** Thường xuyên đặt tiệc sinh nhật, kỷ niệm hoặc tiếp đối tác công việc vào tối cuối tuần.
* **Mong muốn:** 
  * Muốn xem được sơ đồ mặt bằng thực tế để chọn đúng bàn cạnh cửa kính nhìn ra phố đi bộ.
  * Thích sự minh bạch: Giá bao nhiêu, đặt cọc bao nhiêu, có món gì phải đặt trước.
  * Muốn được xác nhận giữ bàn ngay lập tức sau khi quét mã QR thanh toán cọc.

### Persona 2: Lễ tân / Quản lý ca trực (The Front-of-House / Host)
* **Đại diện:** Trần Mai Anh, 24 tuổi, Lễ tân trưởng tại nhà hàng The Steakhouse.
* **Hành vi:** Đón khách tại cửa, nhận điện thoại đặt bàn, phân bàn cho khách vãng lai và phối hợp với nhân viên phục vụ.
* **Khó khăn:** Giờ cao điểm liên tục chịu áp lực: vừa phải nghe máy, vừa đón khách tại sảnh, rất dễ nhầm lẫn giữa bàn đã có khách cọc và bàn trống.
* **Mong muốn:** Một màn hình Tablet trực quan, chạm 1 chạm để đổi trạng thái bàn (Khách đã vào, Khách sắp thanh toán, Đang dọn bàn); quét mã QR của khách là hệ thống tự khớp đơn.

### Persona 3: Chủ nhà hàng / Giám đốc Vận hành (The Restaurant Owner)
* **Đại diện:** Lê Văn Tuấn, 40 tuổi, Chủ chuỗi nhà hàng Á-Âu.
* **Khó khăn:** Không nắm được tỷ lệ bàn trống thực tế theo ca; mất doanh thu do khách bùng hẹn; mỗi lần kê lại bàn ghế phải in lại sơ đồ giấy.
* **Mong muốn:** 
  * Tự tay kéo thả sắp xếp lại sơ đồ quán trên hệ thống bất kỳ lúc nào.
  * Cài đặt quy định cọc linh hoạt (chỉ thu cọc vào khung giờ vàng 18:00 - 21:00 hoặc các bàn VIP).
  * Xem báo cáo: Khu vực bàn nào sinh lời cao nhất, tỷ lệ xoay vòng bàn (Turnover rate) là bao nhiêu.

---

## 3. QUY TRÌNH NGHIỆP VỤ & STATE MACHINE (BUSINESS WORKFLOWS)

### 3.1. Vòng đời Trạng thái Bàn (Table State Machine)

```
              [Khách bấm chọn]
[AVAILABLE] ---------------------------> [HOLDING (5 phút)]
^                                          |
|--- (Hết 5p không cọc / Hủy) <------------|
|                                          | (Thanh toán cọc thành công)
|                                          v
|                                    [CONFIRMED]
|                                          |
|--- (Hủy đặt có hoàn/phạt cọc) <----------|
|                                          | (Khách đến check-in)
|                                          v
|                                    [SEATED / OCCUPIED]
|                                          |
|                                          | (Khách thanh toán & dọn bàn)
|                                          v
|------------------------------------ [CLEANING / AVAILABLE]
```

* **AVAILABLE (Xanh lá):** Bàn đang hoàn toàn trống trong khung giờ này, khách có thể click chọn.
* **HOLDING (Vàng nhấp nháy):** Bàn đang được giữ tạm bởi một khách hàng. Hệ thống áp dụng bộ đếm ngược **300 giây (5 phút)**. Trong thời gian này, không client nào khác trên toàn hệ thống có thể chọn bàn này.
* **CONFIRMED (Đỏ):** Khách đã hoàn tất thanh toán tiền cọc qua cổng VietQR/MoMo. Bàn được khóa cứng cho khách đến đúng giờ hẹn.
* **SEATED / OCCUPIED (Tím/Xanh dương):** Khách đã tới nhà hàng, lễ tân quét mã QR Check-in thành công.
* **CLEANING / MAINTENANCE (Xám):** Khách đã dùng bữa xong, bàn đang được dọn dẹp hoặc tạm thời khóa do hỏng hóc/bảo trì.

---

### 3.2. Quy trình Nghiệp vụ Đặt bàn Khách hàng (B2C Booking Flow)

```
+------------------------------------------------------------------------------------+
| LUỒNG B2C: ĐẶT BÀN & THANH TOÁN CỌC TỰ ĐỘNG                                       |
+------------------------------------------------------------------------------------+
(1) Tìm kiếm: Chọn Chi nhánh -> Chọn Ngày -> Chọn Khung giờ (vd: 19:00 - 21:00)
    -> Chọn Số lượng người (vd: 4 khách).
    ↓
(2) Tải Sơ đồ Mặt bằng: Hệ thống lọc danh sách bàn thỏa mãn:
    - Có sức chứa phù hợp (Min Capacity <= 4 <= Max Capacity).
    - Đang ở trạng thái AVAILABLE trong khung giờ 19:00 - 21:00.
    ↓
(3) Khách click chọn Bàn (vd: Bàn C-05 - Sofa Trung Tâm):
    - Gửi lệnh Hold lên Backend.
    - Backend khóa Redis Redlock trong 100ms. Kiểm tra tính khả dụng.
    - Chuyển bàn sang HOLDING. Set TTL 300s trong Redis.
    - Broadcast WebSocket STOMP tới tất cả client khác đang xem sơ đồ quán.
    ↓
(4) Khởi tạo Giao dịch Cọc (Deposit Invoice):
    - Sinh mã QR VietQR động (chứa số tiền cọc, nội dung chuyển khoản định danh).
    - Đồng hồ đếm ngược 05:00 bắt đầu chạy trên UI của khách.
    ↓
(5) Xử lý Sự kiện Kết thúc (1 trong 2 nhánh):
    ├─► NHÁNH THÀNH CÔNG:
    │     - Webhook ngân hàng bắn về xác nhận giao dịch cọc thành công.
    │     - Cập nhật trạng thái đơn sang CONFIRMED.
    │     - Chuyển trạng thái bàn sang CONFIRMED (Đỏ).
    │     - Bắn WebSocket cập nhật sơ đồ toàn hệ thống.
    │     - Gửi email/SMS kèm Mã QR Check-in cho khách.
    │
    └─► NHÁNH THẤT BẠI / QUÁ HẠN:
          - Hết 300 giây chưa có xác nhận thanh toán.
          - RabbitMQ Delayed Queue kích hoạt worker tự động hủy đơn.
          - Xóa bản ghi giữ chỗ tạm. Chuyển trạng thái bàn về AVAILABLE (Xanh).
          - Broadcast WebSocket giải phóng bàn ngay lập tức.
```

---

### 3.3. Quy trình Vận hành tại Sàn (B2B Floor Management Flow)

```
[Khách đến nhà hàng]
    ↓
[Lễ tân dùng Tablet quét mã QR Check-in trên điện thoại của khách]
    ├─► Hợp lệ & Đúng giờ:
    │     - Hệ thống đổi màu bàn từ CONFIRMED -> SEATED/OCCUPIED.
    │     - Thông báo cho khu vực bếp/phục vụ chuẩn bị đón tiếp.
    │
    └─► Quá giờ hẹn (Chính sách thời gian gia hạn - Grace Period):
          - Quy định: Nhà hàng bảo lưu bàn tối đa 15 phút sau giờ hẹn.
          - Nếu 19:15 khách chưa tới và không liên hệ:
            * Hệ thống đánh dấu đơn là NO_SHOW.
            * Tiền cọc được chuyển thành Doanh thu bồi thường của nhà hàng.
            * Trạng thái bàn tự động chuyển về AVAILABLE để xếp cho khách vãng lai.
```

---

### 3.4. Quy tắc Nghiệp vụ Đặc thù (Business Policies)

* **Quy tắc Sức chứa (Capacity Enforcement):**
  $$\text{Min\_Capacity} \le \text{Số khách thực tế} \le \text{Max\_Capacity}$$
  Khách đi nhóm 2 người không được phép chọn bàn có $\text{Min\_Capacity} \ge 4$ trong khung giờ cao điểm, trừ khi đồng ý thanh toán phụ thu bảo trợ công suất (Minimum Spend).

* **Thuật toán Gợi ý Ghép bàn (Smart Table Merging):**
  Khi khách đặt cho nhóm đông (ví dụ: 10 người) nhưng nhà hàng không còn bàn 10 chỗ:
  * Hệ thống quét các bàn hình chữ nhật/vuông đang trống cùng khung giờ.
  * Tính khoảng cách Euclidean giữa tâm hai bàn: $d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$.
  * Nếu khoảng cách $d \le \text{Threshold}$ và không có vật cản (tường, cột) ngăn giữa $\rightarrow$ Gợi ý ghép bàn và khóa đồng thời cả 2 bàn trong một giao dịch duy nhất.

* **Ma trận Hủy bàn & Hoàn cọc (Refund Policy Matrix):**
  * **Hủy trước $\ge$ 24 tiếng:** Hoàn lại **100%** tiền cọc.
  * **Hủy trước từ 6 đến 24 tiếng:** Hoàn lại **50%** tiền cọc (50% giữ lại bù đắp vận hành).
  * **Hủy trước $<$ 6 tiếng:** **Không hoàn cọc (0%)**.
  * **Quá giờ 15 phút không đến (No-Show):** **Không hoàn cọc (0%)**, mở lại bàn cho khách khác.

---

## 4. HIỆU QUẢ KINH TẾ & CHỈ SỐ ĐO LƯỜNG (BUSINESS VALUE & KPIS)

```
+------------------------------------------------------------------------------------+
|               GIÁ TRỊ KINH TẾ ĐEM LẠI CHO NHÀ HÀNG (VALUE PROPOSITION)             |
+------------------------------------+-----------------------------------------------+
|  1. Cắt giảm Chi phí Trung gian    |  2. Tăng Doanh thu Trực tiếp (Direct Revenue) |
|  - Tiết kiệm 10% - 15% hoa hồng    |  - Giảm No-Show từ 20% xuống dưới 3% nhờ cọc |
|    phải trả cho PasGo / TableNow   |  - Khách cọc kèm đặt trước món đắt (AOV +30%) |
|  - Tiền cọc về thẳng tài khoản quán|  - Tối ưu hóa hệ số lấp đầy ghế (RevPASH)     |
+------------------------------------+-----------------------------------------------+
```

### 4.1. Hiệu quả Đầu tư cho Nhà hàng (ROI Analysis)
* **Tiết kiệm chi phí hoa hồng bên thứ ba:**
  * Giả sử nhà hàng phục vụ trung bình **1.200 lượt khách đặt trước / tháng**, giá trị hóa đơn bình quân **600.000 VNĐ / khách**.
  * Nếu đặt qua các nền tảng trung gian với mức chiết khấu **12%**, nhà hàng phải trả:  
    $$1.200 \times 600.000 \times 12\% = 86.400.000\text{ VNĐ / tháng}$$
  * Với hệ thống TableMaster độc quyền, nhà hàng tiết kiệm được hơn **1 tỷ đồng hoa hồng mỗi năm**, chỉ mất chi phí bảo trì server cố định rất nhỏ.
* **Làm chủ 100% dữ liệu khách hàng (Customer Data Ownership):**
  * Nhà hàng nắm giữ toàn bộ danh sách số điện thoại, lịch sử đặt món, ngày sinh nhật của khách để gửi quà tri ân và marketing trực tiếp mà không sợ bị đối thủ cướp khách.

### 4.2. Chỉ số Đo lường Hiệu quả Vận hành (Operational KPIs)
* **RevPASH (Revenue Per Available Seat Hour):**
  $$\text{RevPASH} = \frac{\text{Tổng doanh thu ca phục vụ}}{\text{Tổng số ghế khả dụng} \times \text{Số giờ phục vụ}}$$
  *Mục tiêu:* Phân bổ bàn thông minh và giảm thời gian bàn trống giúp tăng RevPASH thêm **20% – 30%**.
* **No-Show Rate (Tỷ lệ bùng bàn):**
  $$\text{No-Show Rate} = \frac{\text{Số đơn No-Show}}{\text{Tổng số đơn CONFIRMED}} \times 100\%$$
  *Mục tiêu:* Đưa tỷ lệ bùng bàn từ mức **18% – 22% (truyền thống)** xuống dưới **2%** nhờ cơ chế đặt cọc bắt buộc qua VietQR.

---

## 5. ĐẶC TẢ YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)

```
+------------------------------------------------------------------------------------+
|                         BẢN ĐỒ PHÂN HỆ CHỨC NĂNG (MODULES)                         |
+--------------------------+----------------------------+----------------------------+
| MODULE 1: CUSTOMER APP   | MODULE 2: FLOOR HOST POS   | MODULE 3: MOBILE WAITSTAFF |
| (Dành cho Thực khách)    | (Dành cho Lễ tân & Thu ngân| (Dành cho Phục vụ sàn)     |
| - Đặt bàn trực tuyến (>=2)| - Màn hình Tablet Thẻ Box  | - Chọn bàn phục vụ nhanh   |
| - Đặt theo thông tin & ca| - Quét QR Check-in tức thì | - Gọi món theo danh mục    |
| - Giữ bàn 5p Redlock     | - Xếp khách vãng lai cấp tốc| - Tự nhập món riêng/phụ thu|
| - Cọc VietQR & Email vé  | - Chuyển bàn & Gộp bàn Box | - Chuyển & ghép bàn mobile |
| - Escrow tạm giữ an toàn | - Thanh toán trừ cọc tự động| - Bắn order về KDS Bếp     |
+--------------------------+----------------------------+----------------------------+
| MODULE 4: TABLE MANAGEMENT (Quản lý danh mục Thẻ Box bàn, phân khu đa tầng)        |
| MODULE 5: ANALYTICS & ADMIN (Báo cáo lấp đầy RevPASH, Đối soát giải ngân tiền cọc) |
+------------------------------------------------------------------------------------+
```

* **FR-01 (Tìm kiếm & Lọc bàn trống Online - Tối thiểu 2 khách):** Lọc theo ngày, khung ca và số người. Quy định đặt bàn trực tuyến nhận từ **2 khách trở lên** ($\ge 2$) nhằm tối ưu hóa công suất bàn ăn.
* **FR-02 (Đặt bàn theo Thông tin & Khu vực):** Khách chọn ngày, ca giờ, số khách, loại không gian Zone (Ban công, Bar, VIP, Cạnh cửa kính) và nhận trạng thái khả dụng thời gian thực.
* **FR-03 (Khóa giữ chỗ thời gian thực):** Bấm giữ chỗ $\rightarrow$ Backend kích hoạt Redis Distributed Lock $\rightarrow$ Đổi trạng thái bàn sang `HOLDING` trong 5 phút.
* **FR-04 (Thanh toán cọc tự động & Tạm giữ Escrow):** Sinh mã VietQR động; lắng nghe webhook thanh toán để chuyển đơn sang `CONFIRMED`, tự động gửi Email vé điện tử và lưu tiền cọc vào tài khoản tạm giữ.
* **FR-05 (Điều phối sàn & Thanh toán trên Tablet POS):** Lễ tân/Thu ngân chạm 1 chạm để đổi trạng thái bàn trên Thẻ Box, xếp khách vãng lai, tự nhập món ngoài menu, tính phụ thu, khấu trừ tiền cọc đã thanh toán và in biên lai.
* **FR-06 (Check-in bằng Camera):** Quét mã QR trên vé đặt bàn của khách để tự động load thông tin đặt trước, món ăn và cọc vào bàn.
* **FR-07 (Quản lý Danh mục Bàn dạng Thẻ Box):** Cho phép chủ quán cấu hình danh mục bàn (Mã bàn, Sức chứa, Tiền cọc riêng, Bật/Tắt bảo trì) theo từng tầng lầu và khu vực.
* **FR-08 (Tự động giải phóng bàn quá hạn & Phạt No-Show):** Worker ngầm tự động nhả bàn sau 5 phút nếu chưa cọc, và tự động chuyển sang `NO_SHOW` phạt cọc sau 15 phút trễ hẹn.
* **FR-09 (Cơ chế Chuyển Bàn & Ghép / Gộp Bàn):** Hỗ trợ chuyển bàn trọn vẹn (toàn bộ món + cọc chuyển sang bàn mới, bàn cũ về trống) và ghép / gộp nhiều Box bàn (cộng dồn số lượng món & tiền cọc cho đoàn đông).
* **FR-10 (App Di Động Cho Nhân Viên Phục Vụ):** Ứng dụng di động tối ưu cho nhân viên order tại bàn, gửi đơn về Bếp & Thu ngân tức thời.

---

## 6. KIẾN TRÚC KỸ THUẬT & THIẾT KẾ CSDL (TECHNICAL ARCHITECTURE & ERD)

### 6.1. Sơ đồ Kiến trúc Hệ thống Phân tầng (Architecture Diagram)

```
[React Frontend (Vite + Konva.js)]
│                       ▲
│ HTTP / REST API       │ WebSocket (STOMP Protocol)
▼                       │
[Spring Boot 3.x Backend API Cluster]
│                       │
├──> [Redis Cluster] <──┘
│      - Distributed Lock (Redisson)
│      - Real-time State Cache (Key-Value with TTL)
│      - Message Broker Relay (Pub/Sub)
│
├──> [RabbitMQ Message Broker]
│      - Delayed Exchange (Plugin x-delayed-message)
│      - Auto-release Task Queue (TTL: 300 seconds)
│
└──> [PostgreSQL Database]
       - Relational Entities (Users, Bookings, Restaurants)
       - JSONB / Spatial Indexes (Floor Plan Layout & Assets)
```

---

### 6.2. Thiết kế Cơ sở Dữ liệu Quan hệ (PostgreSQL Schema DDL)

```sql
-- 1. BẢNG NGƯỜI DÙNG & PHÂN QUYỀN NỘI BỘ
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_CUSTOMER', -- ROLE_CUSTOMER, ROLE_HOST, ROLE_MANAGER, ROLE_ADMIN
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG CẤU HÌNH NHÀ HÀNG & TÀI KHOẢN NHẬN CỌC VIETQR
CREATE TABLE restaurant_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL DEFAULT 'The Prime Bistro & Steakhouse',
    address TEXT NOT NULL,
    hotline VARCHAR(20) NOT NULL,
    bank_bin VARCHAR(10) NOT NULL, -- Mã ngân hàng (vd: 970422 - MBBank)
    bank_account_no VARCHAR(30) NOT NULL,
    bank_account_holder VARCHAR(100) NOT NULL,
    default_deposit_amount DECIMAL(12, 2) DEFAULT 200000.00,
    cancellation_grace_hours INT DEFAULT 6
);

-- 3. BẢNG SƠ ĐỒ ĐA TẦNG (TẦNG 1, PHÒNG VIP, ROOFTOP)
CREATE TABLE floor_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_number INT UNIQUE NOT NULL, -- 1: Tầng trệt, 2: Tầng VIP, 3: Rooftop
    name VARCHAR(100) NOT NULL,       -- "Tầng 1 - Sảnh chính", "Tầng 3 - Sky Lounge"
    width_px INT NOT NULL DEFAULT 1600,
    height_px INT NOT NULL DEFAULT 900,
    layout_metadata JSONB NOT NULL,   -- Chứa tường, cửa, quầy bar, vật cản
    is_published BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG BÀN ĂN VẬT LÝ THEO TẦNG
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    floor_plan_id UUID REFERENCES floor_plans(id) ON DELETE CASCADE,
    table_code VARCHAR(20) UNIQUE NOT NULL, -- "T-01", "VIP-02", "ROOF-05"
    shape VARCHAR(20) NOT NULL DEFAULT 'RECT', -- RECT, CIRCLE
    min_capacity INT NOT NULL DEFAULT 2,
    max_capacity INT NOT NULL DEFAULT 4,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    width FLOAT NOT NULL DEFAULT 80.0,
    height FLOAT NOT NULL DEFAULT 80.0,
    rotation_deg FLOAT DEFAULT 0.0,
    custom_deposit DECIMAL(12, 2), -- Giá cọc riêng cho bàn đẹp (nếu có)
    zone_tag VARCHAR(50) DEFAULT 'STANDARD', -- WINDOW_VIEW, VIP, OUTDOOR, STANDARD
    is_active BOOLEAN DEFAULT TRUE
);

-- 5. BẢNG KHUNG GIỜ / CA PHỤC VỤ CỦA QUÁN
CREATE TABLE time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_name VARCHAR(50) NOT NULL, -- "Ca trưa 1", "Ca tối giờ vàng"
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 6. BẢNG ĐƠN ĐẶT BÀN (BOOKINGS)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(20) UNIQUE NOT NULL, -- "PB-20261024-001"
    user_id UUID REFERENCES users(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    time_slot_id UUID REFERENCES time_slots(id) ON DELETE RESTRICT,
    guest_count INT NOT NULL,
    total_deposit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL, -- HOLDING, CONFIRMED, SEATED, COMPLETED, CANCELLED, NO_SHOW
    special_notes TEXT,
    checkin_qr_token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE, -- Hạn 5 phút cho trạng thái HOLDING
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. BẢNG LIÊN KẾT ĐẶT BÀN VỚI BÀN (HỖ TRỢ GHÉP BÀN)
CREATE TABLE booking_tables (
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    table_id UUID REFERENCES tables(id) ON DELETE RESTRICT,
    PRIMARY KEY (booking_id, table_id)
);

-- TẠO CHỈ MỤC TỐI ƯU TRUY VẤN
CREATE INDEX idx_bookings_date_slot ON bookings(restaurant_id, booking_date, time_slot_id, status);
CREATE INDEX idx_tables_floor ON tables(floor_plan_id);
```

---

### 6.3. Chi tiết Xử lý Concurrency bằng Redis Redlock & RabbitMQ

```java
@Service
@RequiredArgsConstructor
public class TableReservationService {

    private final RedissonClient redissonClient;
    private final SimpMessagingTemplate messagingTemplate;
    private final BookingRepository bookingRepository;
    private final RabbitTemplate rabbitTemplate;

    public BookingHoldResponse holdTable(HoldTableRequest request) {
        // Khóa định danh theo Chi nhánh + Bàn + Ngày + Khung giờ
        String lockKey = String.format("lock:table:%s:%s:%s:%s",
                request.getRestaurantId(),
                request.getTableId(),
                request.getBookingDate(),
                request.getTimeSlotId());

        RLock lock = redissonClient.getLock(lockKey);

        try {
            // Thử acquire lock trong tối đa 200ms, tự giải phóng sau 5 giây nếu server sập
            boolean isLocked = lock.tryLock(200, 5000, TimeUnit.MILLISECONDS);
            if (!isLocked) {
                throw new ConflictException("Bàn này đang có người thao tác, vui lòng chọn bàn khác!");
            }

            // 1. Kiểm tra trạng thái trong DB/Redis xem có ai đã CONFIRMED hoặc đang HOLDING không
            boolean isAvailable = checkIfTableIsAvailable(request);
            if (!isAvailable) {
                throw new BadRequestException("Bàn đã được đặt bởi khách hàng khác!");
            }

            // 2. Tạo đơn tạm thời với trạng thái HOLDING (Thời hạn 5 phút)
            Booking booking = new Booking();
            booking.setStatus("HOLDING");
            booking.setExpiresAt(Instant.now().plusSeconds(300));
            bookingRepository.save(booking);

            // 3. Đẩy message vào RabbitMQ Delayed Exchange để auto-cancel sau 300.000 ms (5 phút)
            rabbitTemplate.convertAndSend(
                "booking.delayed.exchange", 
                "booking.hold.routingkey", 
                booking.getId(), 
                message -> {
                    message.getMessageProperties().setDelay(300000); // 5 phút
                    return message;
                }
            );

            // 4. Phát tín hiệu WebSocket cho toàn bộ client đang xem sơ đồ quán đổi màu vàng
            TableStateUpdateDto event = new TableStateUpdateDto(
                request.getTableId(), "HOLDING", Instant.now().plusSeconds(300)
            );
            messagingTemplate.convertAndSend(
                "/topic/restaurant/" + request.getRestaurantId() + "/floor-plan", 
                event
            );

            return new BookingHoldResponse(booking.getId(), booking.getExpiresAt());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new InternalServerErrorException("Hệ thống gián đoạn khi xử lý khóa bàn");
        } finally {
            if (lock.isHeldByCurrentThread()) {
                lock.unlock(); // Luôn giải phóng lock cho các thread khác
            }
        }
    }
}
```

---

## 7. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX DESIGN)

### 7.1. Wireframe Giao diện Trang chủ (ASCII Mockup)

```
+---------------------------------------------------------------------------------------------------------+
| [LOGO] TableMaster       Khám phá nhà hàng    Đặt bàn tiệc    Dành cho chủ quán       [Đăng nhập] [Đăng ký] |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|       CHỦ ĐỘNG CHỌN GÓC NGỒI YÊU THÍCH VỚI SƠ ĐỒ MẶT BẰNG THỜI GIAN THỰC                                |
|       Không còn lo bùng hẹn, không còn cảnh đến nơi mới biết ngồi cạnh lối đi vệ sinh.                   |
|                                                                                                         |
|   +-------------------------------------------------------------------------------------------------+   |
|   |  [icon] Khu vực / Nhà hàng    |  [icon] Ngày đặt   |  [icon] Khung giờ  |  [icon] Số khách      |   |
|   |  Quận 1, TP. Hồ Chí Minh      |  Hôm nay, 24/10    |  19:00 - 21:00     |  4 Người              |   |
|   |                                                                                [ TÌM BÀN TRỐNG ] |   |
|   +-------------------------------------------------------------------------------------------------+   |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
|  >>> SƠ ĐỒ MẶT BẰNG TRỰC TIẾP: THE PRIME BISTRO (TẦNG 2) <<<                                            |
|                                                                                                         |
|  +----------------------------------------------------+  +-------------------------------------------+  |
|  | SƠ ĐỒ TẦNG 1 (LIVE INTERACTIVE MAP)                |  | CHI TIẾT BÀN ĐANG CHỌN                    |  |
|  |                                                    |  |                                           |  |
|  |  [=== CỬA SỔ VIEW PHỐ ĐI BỘ ====================]  |  |  BÀN T-08 (GÓC CỬA SỔ VIEW ĐẸP)           |  |
|  |                                                    |  |  ---------------------------------------  |  |
|  |   [T-01: 2 chỗ]       [T-02: 2 chỗ]   [T-03: 4 chỗ]|  |  • Sức chứa: 4 - 6 người                  |  |
|  |     (ĐÃ ĐẶT)            (TRỐNG)         (ĐANG GIỮ) |  |  • Vị trí: Cửa sổ sát phố đi bộ           |  |
|  |                                                    |  |  • Yêu cầu cọc: 200.000 VNĐ               |  |
|  |   [T-04: 4 chỗ]       [T-05: 4 chỗ]   [T-06: 8 chỗ]|  |  • Trạng thái: TRỐNG KHẢ DỤNG             |  |
|  |     (TRỐNG)             (BẠN CHỌN)      (VIP PHÒNG)|  |                                           |  |
|  |                                                    |  |  [!] Bàn được khóa tạm 5 phút khi bấm     |  |
|  |   [====== LỐI VÀO / QUẦY LỄ TÂN =================] |  |                                           |  |
|  |                                                    |  |  [    GIỮ BÀN NÀY & ĐẶT CỌC NGAY     ]    |  |
|  |  Chú thích: [Xanh] Trống  [Vàng] Đang giữ  [Đỏ] Đã đặt |  |                                           |  |
|  +----------------------------------------------------+  +-------------------------------------------+  |
+---------------------------------------------------------------------------------------------------------+
```

### 7.2. Bảng Mã màu Trạng thái & Token Thiết kế (Design Tokens)

| Trạng thái | Mã Hex Tailwind | Ý nghĩa Nghiệp vụ | Tương tác Client |
| :--- | :--- | :--- | :--- |
| **AVAILABLE** | `#22C55E` (`emerald-500`) | Bàn hoàn toàn trống, sẵn sàng đặt | Cho phép Click chọn |
| **HOLDING** | `#EAB308` (`amber-500`) | Đang có người giữ chỗ cọc (tối đa 5 phút) | Khóa bấm, nhấp nháy pulse |
| **CONFIRMED** | `#EF4444` (`red-500`) | Đã thanh toán cọc thành công | Khóa bấm |
| **SEATED** | `#3B82F6` (`blue-500`) | Khách đã check-in, đang ngồi tại bàn | Hiển thị thời gian ngồi |
| **CLEANING** | `#94A3B8` (`slate-400`) | Khách đã rời bàn, nhân viên đang dọn | Lễ tân click chuyển về Available |

---

## 8. PHÂN CHIA CÔNG VIỆC CHO NHÓM 5 NGƯỜI (WORK BREAKDOWN STRUCTURE)

### 8.1. Cơ cấu Đội ngũ & Vai trò Trọng tâm

```
+---------------------------------------------------------------------------------------------+
|                                    CƠ CẤU TEAM 5 NGƯỜI                                      |
+-------------------------------+-------------------------------------------------------------+
| THÀNH VIÊN                    | PHẠM VI TRÁCH NHIỆM CHÍNH                                   |
+-------------------------------+-------------------------------------------------------------+
| 1. FE Lead (Dev 1 - Frontend) | - Core Konva.js Floor Plan Canvas Component                 |
|                               | - Floor Plan Builder (Kéo thả, xoay bàn, vẽ tường, grid)   |
|                               | - WebSocket Client Sync & Dynamic Table State Rendering     |
+-------------------------------+-------------------------------------------------------------+
| 2. FE Member (Dev 2 - Frontend)| - Customer Booking Journey (Search, Filter, Booking Modal)  |
|                               | - Host Tablet Management Screen (1-touch dispatch & Camera) |
|                               | - Responsive Design, VietQR dynamic countdown timer         |
+-------------------------------+-------------------------------------------------------------+
| 3. BE Lead (Dev 3 - Backend)  | - Kiến trúc tổng thể hệ thống Microservices, Docker Compose  |
|                               | - Service Discovery (Netflix Eureka) & Spring Cloud Gateway |
|                               | - Concurrency Control: Redis Redlock + RabbitMQ / Kafka      |
|                               | - WebSocket STOMP Broker & Event-driven Engine              |
+-------------------------------+-------------------------------------------------------------+
| 4. BE Member (Dev 4 - Backend)| - Module Booking & Check-in QR Generation                   |
|                               | - Module Payment: Tích hợp VietQR / SeABank / Vietcombank   |
|                               | - Webhook Handler & Thuật toán tính cọc / hoàn hủy tự động  |
+-------------------------------+-------------------------------------------------------------+
| 5. BE Member (Dev 5 - Backend)| - Thiết kế CSDL PostgreSQL, DDL Script, Migrations Flyway   |
|                               | - Floor Plan Layout JSONB CRUD API + Validation không gian  |
|                               | - Spring Security (JWT, Role Base Access Control)           |
+-------------------------------+-------------------------------------------------------------+
```

---

## 9. LỘ TRÌNH TRIỂN KHAI TRONG 10 TUẦN (10-WEEK ROADMAP)

Lộ trình được chia thành **5 Sprints**, mỗi sprint kéo dài **2 tuần** áp dụng mô hình Scrum/Agile:

```
Tuần 1-2 (Sprint 1)  : Đặc tả Schema, Dựng Eureka Server & Gateway, Kiến trúc Docker, Auth & Layout thô
Tuần 3-4 (Sprint 2)  : Core Canvas Konva.js, Floor Builder kéo thả, CRUD Table & Time Slot
Tuần 5-6 (Sprint 3)  : Redis Redlock, RabbitMQ Auto-cancel, WebSocket Sync Realtime 5 phút
Tuần 7-8 (Sprint 4)  : VietQR Payment Webhook, Màn hình Host Tablet Check-in QR, Ghép bàn thông minh
Tuần 9-10 (Sprint 5) : Kiểm thử chịu tải Concurrency (JMeter), Báo cáo Analytics, Hoàn thiện Slide
```

### Chi tiết từng Sprint:

#### **Sprint 1: Nền tảng Kiến trúc, Database & Authentication (Tuần 1 - 2)**
* **Mục tiêu:** Thiết lập xong môi trường chạy cục bộ chuẩn Docker, hoàn thành Eureka Service Discovery, Spring Cloud Gateway, Database Schema và hệ thống phân quyền JWT.
* **Công việc cụ thể:**
  * **BE Lead:** Khởi tạo Spring Boot 3.x, dựng Netflix Eureka Server (Port 8761), cấu hình Spring Cloud Gateway (Port 8080) với dynamic routing (`lb://`), cấu hình Docker Compose (PostgreSQL, Redis, RabbitMQ/Kafka).
  * **BE 5:** Viết file Migration PostgreSQL (DDL), thiết lập Spring Security + JWT với 4 roles (`CUSTOMER`, `HOST`, `OWNER`, `ADMIN`).
  * **BE 4:** Khởi tạo cấu trúc các module `booking`, `payment`, `floor`, `user`.
  * **FE 1 & 2:** Khởi tạo dự án Vite + React + Tailwind CSS + Lucide Icons; thiết lập Router, Axios Client Interceptor xử lý Refresh Token.
* **Kết quả bàn giao:** Đăng ký, đăng nhập thành công; Gateway định tuyến tới Auth Service thông qua Eureka; Swagger API hoạt động đầy đủ.

#### **Sprint 2: Floor Plan Engine & Sơ đồ Tương tác 2D (Tuần 3 - 4)**
* **Mục tiêu:** Cho phép Chủ quán tạo mặt bằng nhà hàng và Khách hàng xem được sơ đồ phòng bàn.
* **Công việc cụ thể:**
  * **FE 1:** Xây dựng trình kéo thả bàn ghế bằng `react-konva`: Bàn tròn, bàn vuông, quầy bar, cửa ra vào, snap to grid, xoay góc bàn.
  * **BE 5:** Xây dựng bộ API lưu/đọc sơ đồ tầng (`layout_metadata` JSONB), API CRUD danh sách bàn (`tables`).
  * **FE 2:** Dựng giao diện Tìm kiếm quán: Chọn ngày, chọn ca giờ, chọn số khách.
  * **BE 4:** Xây dựng API lọc bàn trống theo `time_slot` và số lượng khách (`guest_count`).
* **Kết quả bàn giao:** Chủ quán tự dựng được sơ đồ quán; khách xem được sơ đồ hiển thị đúng vị trí bàn.

#### **Sprint 3: Xử lý Race Condition, Concurrency & Real-time Synchronization (Tuần 5 - 6)**
* **Mục tiêu:** Hai khách hàng không thể đặt trùng 1 bàn cùng lúc; sơ đồ đổi màu tức thì qua WebSocket.
* **Công việc cụ thể:**
  * **BE Lead:** Triển khai Redisson Distributed Lock cho API `POST /api/v1/bookings/hold`. Cài đặt RabbitMQ Delayed Exchange kích hoạt hủy đơn sau 300s.
  * **BE Lead & FE 1:** Thiết lập WebSocket STOMP topic `/topic/restaurant/{id}/floor-plan`.
  * **FE 1:** Khi nhận websocket message, đổi màu bàn sang vàng nhấp nháy trên canvas của mọi client đang mở trang.
  * **FE 2:** Tạo màn hình Popup thanh toán cọc với đồng hồ đếm ngược 05:00.
* **Kết quả bàn giao:** Demo kịch bản 2 trình duyệt cùng bấm 1 bàn: 1 bên thành công giữ bàn 5 phút, 1 bên nhận thông báo xung đột bàn; sau 5 phút không cọc bàn tự động nhả về xanh.

#### **Sprint 4: Tích hợp Thanh toán VietQR & Màn hình Điều phối Tablet (Tuần 7 - 8)**
* **Mục tiêu:** Khách cọc tiền tự động xác nhận đơn; Lễ tân quét QR check-in vào bàn.
* **Công việc cụ thể:**
  * **BE 4:** Tích hợp sinh mã VietQR động qua cú pháp chuyển khoản định danh (vd: `TM BK2026102401`). Viết API Webhook tiếp nhận thanh toán từ ngân hàng (PayOS / Casso / Open API).
  * **FE 2:** Xây dựng giao diện Tablet cho Lễ tân: Xem tổng thể tầng, chạm để đổi trạng thái sang `SEATED`, `CLEANING`, `AVAILABLE`. Tích hợp thư viện quét camera QR (`html5-qrcode`).
  * **BE 4:** Xây dựng API xác thực mã `checkin_qr_token` và chuyển trạng thái đơn sang `SEATED`.
  * **BE Lead:** Viết logic thuật toán Smart Table Merging (gợi ý ghép bàn gần nhau).
* **Kết quả bàn giao:** Luồng thanh toán cọc khép kín: Quét QR chuyển khoản -> Webhook bắn -> Sơ đồ đổi sang đỏ -> Vé QR gửi về email/màn hình -> Lễ tân quét QR đổi sang xanh dương.

#### **Sprint 5: Kiểm thử Chịu tải, Báo cáo Doanh thu & Chuẩn bị Báo cáo (Tuần 9 - 10)**
* **Mục tiêu:** Hệ thống đạt độ ổn định cao, vượt qua bài test áp lực lớn, hoàn thiện hồ sơ báo cáo.
* **Công việc cụ thể:**
  * **BE Lead:** Dùng Apache JMeter mô phỏng 500 yêu cầu đồng thời tranh chấp 1 bàn tại cùng 1 giây để chứng minh Redlock không bao giờ bị Double Booking.
  * **BE 5 & FE 2:** Xây dựng biểu đồ Dashboard cho Chủ quán: Tỷ lệ bàn trống, Doanh thu cọc, Tỷ lệ No-Show.
  * **Toàn team:** Viết tài liệu đồ án (Word/PDF), làm Video Demo kịch bản thực tế, chuẩn bị Slide thuyết trình.
* **Kết quả bàn giao:** Sản phẩm hoàn chỉnh triển khai lên VPS (hoặc Render/Railway), source code sạch, slide báo cáo sẵn sàng bảo vệ.

---

## 10. MA TRẬN QUẢN TRỊ RỦI RO & BẢO VỆ ĐỒ ÁN (RISK MATRIX & DEFENSE)

### 10.1. Ma trận Rủi ro Kỹ thuật & Phương án Xử lý

| Rủi ro Kỹ thuật | Mức độ | Khả năng xảy ra | Phương án Khắc phục Kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Race Condition (2 người bấm cùng millisecond)** | Nghiêm trọng | Rất cao | Áp dụng **Redis Redlock (`tryLock`)** với TTL định danh duy nhất theo bàn + ngày + ca. Chặn ngay tại tầng cache trước khi chạm tới DB. |
| **Server sập khi bàn đang HOLDING** | Cao | Trung bình | Khóa Redis có TTL 5 giây, RabbitMQ message có TTL 300s độc lập lưu trữ trên ổ đĩa. Khi server restart, worker quét và giải phóng bình thường. |
| **Giả mạo Webhook Thanh toán (Fake Webhook)** | Nghiêm trọng | Trung bình | Kiểm tra **Chữ ký số (HMAC-SHA256)** trên payload webhook với Secret Key; đối soát đúng số tiền cọc trước khi kích hoạt đổi trạng thái. |
| **Mất kết nối mạng WebSocket trên Client** | Trung bình | Cao | Frontend triển khai cơ chế **Auto-reconnect with Exponential Backoff**; khi kết nối lại sẽ tự động gọi REST API snapshot để reload toàn bộ trạng thái bàn. |
| **Lệch giờ giữa Client và Server** | Thấp | Cao | Đồng hồ đếm ngược 5 phút chỉ dựa vào mốc thời gian tuyệt đối `expires_at` do Server trả về theo chuẩn UTC/ISO-8601, không dùng `Date.now()` tương đối. |

---

### 10.2. Bộ Câu hỏi Phản biện Thường gặp của Hội đồng & Câu trả lời Mẫu

#### Câu hỏi 1: *"Tại sao phải dùng Redis Redlock mà không dùng tính năng khóa bi-quan (Pessimistic Lock `SELECT FOR UPDATE`) trong PostgreSQL?"*
* **Câu trả lời chuẩn kỹ thuật:**
  * Khi vào giờ cao điểm, hàng ngàn lượt khách cùng truy cập và xem sơ đồ. Nếu dùng `SELECT FOR UPDATE`, các giao dịch sẽ khóa trực tiếp hàng (row) trong Database, dẫn đến nghẽn Connection Pool và làm chậm toàn bộ hệ thống đọc (Read query).
  * Redis hoạt động hoàn toàn trên bộ nhớ RAM (In-memory) với độ trễ dưới 2ms, có khả năng chịu tải hàng chục ngàn thao tác khóa mỗi giây mà không gây áp lực lên cơ sở dữ liệu quan hệ chính.

#### Câu hỏi 2: *"Nếu sau 5 phút khách hàng không thanh toán, làm sao hệ thống biết để nhả bàn nếu không dùng cơ chế Polling liên tục (Cron Job)?"*
* **Câu trả lời chuẩn kỹ thuật:**
  * Nhóm không sử dụng Cron Job chạy định kỳ mỗi giây vì rất tốn tài nguyên và có độ trễ (delay window).
  * Thay vào đó, nhóm áp dụng kiến trúc **Event-Driven với RabbitMQ Delayed Message Exchange Plugin (`x-delayed-message`)**. Khi khách bấm giữ bàn, một message mang ID đơn đặt bàn được đưa vào hàng đợi với tham số trễ đúng 300.000ms. Đúng 300.000ms sau, RabbitMQ đẩy message tới Worker kiểm tra trạng thái: nếu đơn vẫn là `HOLDING`, worker tự động hủy đơn và broadcast WebSocket giải phóng bàn ngay lập tức.

#### Câu hỏi 3: *"Tại sao dùng JSONB để lưu trữ sơ đồ mặt bằng thay vì tách thành các bảng quan hệ chuẩn hóa?"*
* **Câu trả lời chuẩn kỹ thuật:**
  * Sơ đồ mặt bằng chứa nhiều chi tiết phi cấu trúc (tường, cửa, quầy bar, chậu cây, kích thước pixel, màu nền canvas). Các vật thể trang trí này không cần tham gia vào logic giao dịch đặt cọc.
  * Việc lưu các vật thể này trong cột `layout_metadata` kiểu `JSONB` của PostgreSQL giúp Frontend render linh hoạt nguyên khối sơ đồ chỉ bằng 1 câu truy vấn, đồng thời tận dụng khả năng đánh chỉ mục `GIN` của PostgreSQL khi cần tìm kiếm. Riêng thực thể Bàn ăn (`tables`) vẫn được chuẩn hóa thành bảng riêng để đảm bảo tính toàn vẹn khóa ngoại với bảng Bookings.

---

## 11. PHÂN TÍCH CHUYÊN SÂU & LỜI KHUYÊN TRIỂN KHAI CHO TEAM

### 11.1. Đánh giá Tính khả thi & Độ độc đáo của Đề tài (SWOT Analysis)
* **Điểm mạnh (Strengths):**
  * Đề tài có tính trực quan cực kỳ cao (Live Canvas Map) – đây là yếu tố gây ấn tượng mạnh nhất khi trình diễn (Demo) trước giảng viên và hội đồng.
  * Giải quyết được bài toán hóc búa về kiến trúc phân tán: Race condition, Concurrency, WebSocket realtime sync, Delayed Queues.
* **Điểm yếu (Weaknesses):**
  * Konva.js / Canvas đòi hỏi FE phải tính toán tọa độ tốt (Scale, Pan, Zoom, Responsive trên điện thoại vs Desktop).
* **Cơ hội (Opportunities):**
  * Mô hình sản phẩm SaaS thực chiến, có thể mang đi chào hàng thử nghiệm tại các nhà hàng, quán cafe thực tế ngoài đời sau khi tốt nghiệp.
* **Thách thức (Threats):**
  * Quản lý tiến độ trong 10 tuần: Nếu nhóm sa đà vào việc vẽ sơ đồ quá đẹp ở Frontend mà lơ là phần Backend xử lý tranh chấp bàn, đồ án sẽ mất đi chiều sâu kỹ thuật.

### 11.2. Lời khuyên Phân công & Chiến lược Triển khai Thực tế
1. **Thiết lập Hợp đồng API (API Contract First):** Ngay trong Tuần 1, Dev 1 (FE Lead) và Dev 3 (BE Lead) phải ngồi lại thống nhất cấu trúc JSON của API bàn và WebSocket Message. Không chờ Backend viết xong API mới làm Frontend.
2. **Mock Data sớm:** Frontend dùng file JSON giả lập danh sách bàn để vẽ Canvas ngay từ tuần 2.
3. **Ưu tiên Kiểm thử Chịu tải:** Chuẩn bị sẵn file kịch bản JMeter từ tuần 8 để có ảnh chụp biểu đồ đo lường đưa vào báo cáo và slide bảo vệ.

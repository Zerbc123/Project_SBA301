# TÀI LIỆU THIẾT KẾ CƠ SỞ DỮ LIỆU (PAYMENT SERVICE)
# DỊCH VỤ: PAYMENT & TRANSACTION SERVICE (`tablemaster_payment`)
## HỆ THỐNG: TABLEMASTER – NỀN TẢNG ĐẶT BÀN & QUẢN LÝ BÀN ĂN NHÀ HÀNG

> **Mã tài liệu:** DB-SPEC-PAY-01  
> **Phiên bản:** 2.1.0 (Bản đặc tả Thanh toán VietQR Trực tiếp, Xử lý Webhook & Hoàn Cọc)  
> **Hệ quản trị CSDL:** PostgreSQL 16+ (Database-per-Service + JSONB Audit)  
> **Đặc tả kiến trúc:** Thanh toán cọc trực tiếp về tài khoản Ngân hàng của Nhà hàng (không qua trung gian), Đối soát biến động số dư tự động qua Webhook, Xử lý Idempotency & Quản lý Hoàn tiền cọc khi hủy bàn hợp lệ.

---

## MỤC LỤC
1. [BỐI CẢNH & ĐẶC THÙ DÒNG TIỀN SINGLE-TENANT OUTSOURCE](#1-bối-cảnh--đặc-thù-dòng-tiền-single-tenant-outsource)
2. [SƠ ĐỒ THỰC THỂ QUAN HỆ CSDL (PLANTUML ERD)](#2-sơ-đồ-thực-thể-quan-hệ-csdl-plantuml-erd)
3. [ĐẶC TẢ CHI TIẾT CÁC BẢNG DỮ LIỆU (POSTGRESQL DDL)](#3-đặc-tả-chi-tiết-các-bảng-dữ-liệu-postgresql-ddl)
   * [3.1. Bảng `payment_transactions` (Giao dịch Thanh toán Cọc VietQR)](#31-bảng-payment_transactions-giao-dịch-thanh-toán-cọc-vietqr)
   * [3.2. Bảng `payment_refunds` (Giao dịch Hoàn tiền Cọc khi Hủy bàn)](#32-bảng-payment_refunds-giao-dịch-hoàn-tiền-cọc-khi-hủy-bàn)
   * [3.3. Bảng `webhook_audit_logs` (Nhật ký Webhook & Chống gian lận)](#33-bảng-webhook_audit_logs-nhật-ký-webhook--chống-gian-lận)
4. [CƠ CHẾ BẢO MẬT & XỬ LÝ IDEMPOTENCY TRONG THANH TOÁN](#4-cơ-chế-bảo-mật--xử-lý-idempotency-trong-thanh-toán)
5. [CÁC SƠ ĐỒ LUỒNG THANH TOÁN & HOÀN TIỀN (PLANTUML SEQUENCES)](#5-các-sơ-đồ-luồng-thanh-toán--hoàn-tiền-plantuml-sequences)
   * [5.1. Luồng Sinh mã VietQR Động & Nhận Webhook Ngân hàng](#51-luồng-sinh-mã-vietqr-động--nhận-webhook-ngân-hàng)
   * [5.2. Luồng Xử lý Hoàn cọc tự động khi Khách Hủy bàn](#52-luồng-xử-lý-hoàn-cọc-tự-động-khi-khách-hủy-bàn)
6. [CHIẾN LƯỢC ĐÁNH CHỈ MỤC & TỐI ƯU HIỆU NĂNG](#6-chiến-lược-đánh-chỉ-mục--tối-ưu-hiệu-năng)
7. [SCRIPT KHỞI TẠO SQL HOÀN CHỈNH (DDL & SEED DATA)](#7-script-khởi-tạo-sql-hoàn-chỉnh-ddl--seed-data)

---

## 1. BỐI CẢNH & ĐẶC THÙ DÒNG TIỀN SINGLE-TENANT OUTSOURCE

Dự án **TableMaster** được gia công độc quyền cho 01 thương hiệu Nhà hàng, do đó dòng tiền thanh toán cọc có 3 ưu điểm vượt trội so với các sàn SaaS đại trà (PasGo, TableNow):

1. **Tiền cọc chuyển thẳng vào tài khoản Nhà hàng:** 
   * Khi khách quét VietQR, tiền về thẳng tài khoản ngân hàng của Chủ nhà hàng (MBBank/Vietcombank cấu hình trong `restaurant_profile`).
   * Nhà hàng **không bị giam tiền cọc** đến cuối tháng và **không mất phí hoa hồng 10% – 15%** cho sàn trung gian.
2. **Đối soát tự động tức thì (Real-time Webhook Reconciliation):**
   * Mỗi giao dịch sinh ra một **Cú pháp chuyển khoản DUY NHẤT** (VD: `PB BK001`).
   * Ngân hàng/Cổng Open API (PayOS, Casso, MBBank) bắn Webhook về hệ thống trong **1 giây** $\rightarrow$ Hệ thống tự động khớp tiền và kích hoạt phát hành Vé QR qua Email.
3. **Chính sách Hoàn cọc minh bạch (Automated Refund Policy):**
   * Nếu khách hủy trước hạn quy định (`cancellation_grace_hours`, ví dụ 6 tiếng trước giờ ăn): Khách được hoàn 100% tiền cọc.
   * Nếu khách hủy sát giờ hoặc không đến (`NO_SHOW`): Toàn bộ tiền cọc được giữ lại cho nhà hàng bù đắp chi phí nguyên liệu.

---

## 2. SƠ ĐỒ THỰC THỂ QUAN HỆ CSDL (PLANTUML ERD)

```plantuml
@startuml TableMaster_Payment_ERD
!theme plain
skinparam linetype ortho
skinparam roundcorner 8
skinparam shadowing false
skinparam classFontSize 12

title SƠ ĐỒ THỰC THỂ QUAN HỆ CSDL: tablemaster_payment

enum PaymentStatus {
  PENDING   : Chờ khách quét mã VietQR
  SUCCESS   : Tiền cọc đã vào tài khoản ngân hàng
  FAILED    : Giao dịch lỗi / Không hợp lệ
  EXPIRED   : Hết hạn thời gian chờ cọc
  REFUNDED  : Đã hoàn lại tiền cọc cho khách
}

enum RefundStatus {
  PROCESSING : Đang chờ Quản lý duyệt / Chuyển khoản hoàn
  COMPLETED  : Đã hoàn tiền thành công về tài khoản khách
  REJECTED   : Từ chối hoàn do hủy quá sát giờ
}

entity "payment_transactions" as txn {
  * **id** : UUID [PK]
  --
  * **transaction_code** : VARCHAR(30) [UK]
  * **booking_id** : UUID [Ref tablemaster_booking]
  * **user_id** : UUID [Ref tablemaster_auth]
  * **amount** : DECIMAL(12,2)
  * **payment_method** : VARCHAR(30) = 'VIETQR'
  * **transfer_content** : VARCHAR(100) [UK] (Cú pháp: "PB BK001")
  **bank_provider** : VARCHAR(50) (MBBANK, PAYOS...)
  **bank_transaction_id** : VARCHAR(100) (Mã bút toán ngân hàng)
  * **status** : VARCHAR(30) = 'PENDING'
  **paid_at** : TIMESTAMP WITH TIME ZONE
  **created_at** : TIMESTAMP WITH TIME ZONE
  **updated_at** : TIMESTAMP WITH TIME ZONE
}

entity "payment_refunds" as refund {
  * **id** : UUID [PK]
  --
  * **payment_transaction_id** : UUID [FK -> payment_transactions.id]
  * **refund_amount** : DECIMAL(12,2)
  * **refund_ratio** : FLOAT (1.0 = 100%, 0.5 = 50%)
  * **refund_status** : VARCHAR(30) = 'PROCESSING'
  **refund_bank_bin** : VARCHAR(10) (Ngân hàng nhận hoàn)
  **refund_account_no** : VARCHAR(30)
  **refund_account_holder** : VARCHAR(100)
  **reason** : TEXT (Lý do hủy bàn)
  **created_at** : TIMESTAMP WITH TIME ZONE
  **completed_at** : TIMESTAMP WITH TIME ZONE
}

entity "webhook_audit_logs" as webhook {
  * **id** : UUID [PK]
  --
  * **provider** : VARCHAR(50) (PAYOS, CASSO, MBBANK)
  * **payload** : JSONB (Raw payload từ Ngân hàng)
  **signature_header** : TEXT (Chữ ký số HMAC)
  * **is_signature_valid** : BOOLEAN
  * **processed_status** : VARCHAR(30) (PROCESSED, DUPLICATE, INVALID)
  **created_at** : TIMESTAMP WITH TIME ZONE
}

txn ||--o{ refund : "có thể được hoàn cọc (0..1)"
txn .. PaymentStatus : "trạng thái thanh toán"
refund .. RefundStatus : "trạng thái hoàn tiền"

note right of txn
  <b>Chỉ mục tối ưu:</b>
  * idx_payment_content (transfer_content) - Đối soát Webhook 1ms
  * idx_payment_booking (booking_id)
  * idx_payment_status (status)
end note

@enduml
```

---

## 3. ĐẶC TẢ CHI TIẾT CÁC BẢNG DỮ LIỆU (POSTGRESQL DDL)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. BẢNG GIAO DỊCH TIỀN CỌC (PAYMENT TRANSACTIONS)
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_code VARCHAR(30) UNIQUE NOT NULL, -- Mã giao dịch: "TXN-20261024-001"
    booking_id UUID NOT NULL,                     -- Ref tablemaster_booking.bookings(id)
    user_id UUID NOT NULL,                        -- Ref tablemaster_auth.users(id)
    amount DECIMAL(12, 2) NOT NULL,               -- Số tiền cọc cần chuyển
    payment_method VARCHAR(30) NOT NULL DEFAULT 'VIETQR',
    transfer_content VARCHAR(100) UNIQUE NOT NULL, -- Cú pháp duy nhất định danh: "PB BK001"
    bank_provider VARCHAR(50) DEFAULT 'MBBANK',
    bank_transaction_id VARCHAR(100),              -- Mã bút toán phía Ngân hàng bắn về
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    -- 'PENDING'  : Chờ khách quét mã VietQR cọc tiền
    -- 'SUCCESS'  : Tiền cọc đã vào tài khoản ngân hàng thành công
    -- 'FAILED'   : Chuyển sai số tiền hoặc sai cú pháp
    -- 'EXPIRED'  : Hết hạn thời gian chờ cọc
    -- 'REFUNDED' : Đã hoàn cọc cho khách do hủy đúng hạn
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG HOÀN TIỀN CỌC KHI HỦY BÀN HỢP LỆ (REFUNDS)
CREATE TABLE payment_refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE RESTRICT,
    refund_amount DECIMAL(12, 2) NOT NULL,
    refund_ratio FLOAT NOT NULL DEFAULT 1.0,      -- 1.0 = Hoàn 100% (hủy trước 6 tiếng), 0.5 = Hoàn 50%
    refund_status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    -- 'PROCESSING' : Đang xử lý hoàn tiền
    -- 'COMPLETED'  : Đã chuyển tiền hoàn thành công về tài khoản khách
    -- 'REJECTED'   : Từ chối hoàn cọc (hủy quá sát giờ quy định)
    refund_bank_bin VARCHAR(10),                  -- Mã ngân hàng khách nhận hoàn (VD: 970422)
    refund_account_no VARCHAR(30),                -- Số tài khoản nhận tiền hoàn
    refund_account_holder VARCHAR(100),           -- Tên chủ tài khoản nhận tiền hoàn
    reason TEXT,                                  -- Lý do khách hủy bàn
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. BẢNG NHẬT KÝ WEBHOOK NGÂN HÀNG (AUDIT LOG & IDEMPOTENCY)
CREATE TABLE webhook_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL,                -- "PAYOS", "CASSO", "MBBANK"
    payload JSONB NOT NULL,                       -- Toàn bộ nội dung thô ngân hàng bắn về
    signature_header TEXT,                        -- Chữ ký HMAC-SHA256 để chống giả mạo
    is_signature_valid BOOLEAN NOT NULL,
    processed_status VARCHAR(30) NOT NULL DEFAULT 'PROCESSED', -- 'PROCESSED', 'DUPLICATE', 'INVALID'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. CƠ CHẾ BẢO MẬT & XỬ LÝ IDEMPOTENCY TRONG THANH TOÁN

### 4.1. Xác thực Chữ ký số Webhook (HMAC Signature Verification)
* Mọi request Webhook từ Cổng thanh toán/Ngân hàng bắn về đều có Header chứa chữ ký HMAC-SHA256.
* Payment Service tính toán lại chữ ký bằng `SecretKey` của nhà hàng. Nếu chữ ký không khớp $\rightarrow$ Từ chối ngay lập tức, ngăn chặn hoàn toàn kẻ xấu tự gửi request giả mạo đã thanh toán!

### 4.2. Cơ chế Idempotency (Chống xử lý trùng lặp giao dịch)
* Trong thực tế mạng Internet, Ngân hàng có thể bắn Webhook **2-3 lần cho cùng 1 giao dịch** nếu gặp độ trễ mạng.
* **Xử lý:**
  1. Kiểm tra trạng thái hiện tại của `payment_transactions.status`.
  2. Nếu `status == 'SUCCESS'` $\rightarrow$ Bỏ qua và trả về `200 OK` cho ngân hàng mà không cộng tiền hay kích hoạt vé lần 2.

---

## 5. CÁC SƠ ĐỒ LUỒNG THANH TOÁN & HOÀN TIỀN (PLANTUML SEQUENCES)

### 5.1. Luồng Sinh mã VietQR Động & Nhận Webhook Ngân hàng

```plantuml
@startuml TableMaster_VietQR_Webhook_Flow
!theme plain
autonumber
skinparam sequenceMessageAlign center
skinparam boxPadding 10

title LUỒNG SINH MÃ VIETQR ĐỘNG & XỬ LÝ WEBHOOK BIẾN ĐỘNG SỐ DƯ TỨC THÌ

actor "Khách hàng" as Guest
participant "Web / Email Khách" as ClientApp
participant "Booking Service" as BookingSvc
participant "Payment Service" as PaySvc
database "tablemaster_payment" as PayDB
participant "Ngân hàng / Cổng VietQR\n(MBBank / PayOS)" as Bank

== BƯỚC 1: SINH MÃ VIETQR ĐỘNG KHI LỄ TÂN DUYỆT ĐƠN ==
BookingSvc -> PaySvc : POST /api/v1/payments/create-deposit-qr\n{ bookingId: "uuid-123", amount: 200000, code: "PB001" }
PaySvc -> PayDB : INSERT INTO payment_transactions (\n  transaction_code = 'TXN-001', transfer_content = 'PB BK001',\n  amount = 200000, status = 'PENDING'\n)
PaySvc -> PaySvc : Tạo URL mã VietQR chuẩn Napas247:\nhttps://img.vietqr.io/image/MB-0388999999-compact.png?amount=200000&addInfo=PB%20BK001
PaySvc --> BookingSvc : Trả về VietQR Image URL + Cú pháp chuyển khoản
BookingSvc --> ClientApp : Gửi Link cọc VietQR đến Email/SMS của khách

== BƯỚC 2: KHÁCH MỞ APP NGÂN HÀNG QUÉT MÃ QR CHUYỂN KHOẢN ==
Guest -> Bank : Mở Mobile Banking quét mã QR chuyển 200.000đ
Bank -> Bank : Tiền vào thẳng tài khoản Ngân hàng Nhà hàng!

== BƯỚC 3: NGÂN HÀNG BẮN WEBHOOK VỀ XÁC THỰC TỨC THÌ ==
Bank -> PaySvc : POST /api/v1/webhooks/vietqr\n[Header: X-Signature: HMAC_SHA256, Body: { content: "PB BK001", amount: 200000 }]

group Kiểm tra Bảo mật & Khớp đơn trong 1 giây
  PaySvc -> PaySvc : 1. Xác thực chữ ký HMAC-SHA256 hợp lệ\n2. Lưu raw payload vào webhook_audit_logs
  PaySvc -> PayDB : 3. SELECT * FROM payment_transactions WHERE transfer_content = 'PB BK001'
  PayDB --> PaySvc : Khớp chính xác đơn cọc TXN-001
  PaySvc -> PayDB : 4. UPDATE payment_transactions SET status = 'SUCCESS', paid_at = NOW()
end

PaySvc -> BookingSvc : Gửi Event (Kafka/REST): DepositPaidSuccessEvent\n{ bookingId: "uuid-123", amount: 200000 }
BookingSvc -> ClientApp : Phát hành VÉ QR ĐIỆN TỬ gửi về Email khách hàng!
PaySvc --> Bank : 200 OK (Xác nhận Webhook thành công)

@enduml
```

---

### 5.2. Luồng Xử lý Hoàn cọc tự động khi Khách Hủy bàn

```plantuml
@startuml TableMaster_Refund_Flow
!theme plain
autonumber
skinparam sequenceMessageAlign center

title LUỒNG HOÀN TIỀN CỌC KHI KHÁCH HỦY BÀN HỢP LỆ (REFUND FLOW)

actor "Khách hàng" as Guest
participant "Web Tra cứu Vé" as FE
participant "Booking Service" as BookingSvc
participant "Payment Service" as PaySvc
database "tablemaster_payment" as PayDB
actor "Quản lý (Manager)" as Manager

Guest -> FE : Bấm nút "Yêu cầu Hủy bàn"\nNhập: STK nhận hoàn, Tên ngân hàng, Lý do hủy
FE -> BookingSvc : POST /api/v1/bookings/{id}/cancel { refundBankInfo, reason }

BookingSvc -> BookingSvc : Kiểm tra thời gian hủy so với giờ ăn:\n- Giờ ăn: 19:00, Giờ hủy: 11:00 (Trước 8 tiếng)\n=> Hợp lệ (Theo chính sách trước 6 tiếng)

BookingSvc -> PaySvc : POST /api/v1/payments/refund\n{ bookingId, refundRatio: 1.0, refundAmount: 200000, bankInfo }
PaySvc -> PayDB : INSERT INTO payment_refunds (\n  refund_amount = 200000, refund_ratio = 1.0, refund_status = 'PROCESSING'\n)

PaySvc -> Manager : Bắn thông báo lên Dashboard Quản lý: "Có yêu cầu hoàn cọc cần duyệt"
Manager -> PaySvc : Bấm "Duyệt Hoàn tiền & Chuyển khoản"
PaySvc -> PayDB : UPDATE payment_refunds SET refund_status = 'COMPLETED'
PaySvc -> PayDB : UPDATE payment_transactions SET status = 'REFUNDED'
PaySvc --> Guest : Gửi Email thông báo: "Đã hoàn 200.000đ về STK của quý khách"

@enduml
```

---

## 6. CHIẾN LƯỢC ĐÁNH CHỈ MỤC & TỐI ƯU HIỆU NĂNG

```sql
-- 1. Tìm kiếm giao dịch cực nhanh khi nhận Webhook ngân hàng (< 1ms)
CREATE INDEX idx_payment_content ON payment_transactions(transfer_content);

-- 2. Tra cứu lịch sử thanh toán theo Đơn đặt bàn
CREATE INDEX idx_payment_booking ON payment_transactions(booking_id);

-- 3. Lọc danh sách giao dịch theo trạng thái và ngày tạo
CREATE INDEX idx_payment_status_created ON payment_transactions(status, created_at DESC);

-- 4. Tra cứu đơn hoàn tiền theo giao dịch gốc
CREATE INDEX idx_refund_payment_id ON payment_refunds(payment_transaction_id);
```

---

## 7. SCRIPT KHỞI TẠO SQL HOÀN CHỈNH (DDL & SEED DATA)

```sql
\c tablemaster_payment;

-- SEED DATA MẪU
INSERT INTO payment_transactions (
    id, transaction_code, booking_id, user_id, amount,
    payment_method, transfer_content, bank_provider,
    bank_transaction_id, status, paid_at
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'TXN-20261024-001',
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',
    200000.00,
    'VIETQR',
    'PB BK001',
    'MBBANK',
    'MB_FT261024999988',
    'SUCCESS',
    NOW()
);

-- Seed Log Webhook mẫu
INSERT INTO webhook_audit_logs (
    provider, payload, signature_header, is_signature_valid, processed_status
) VALUES (
    'PAYOS',
    '{"code": "00", "desc": "success", "data": {"orderCode": "PB001", "amount": 200000, "description": "PB BK001"}}'::jsonb,
    'hmac_sha256_valid_signature_example',
    TRUE,
    'PROCESSED'
);
```

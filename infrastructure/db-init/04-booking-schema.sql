\c tablemaster_booking;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS outbox_events CASCADE;
DROP TABLE IF EXISTS table_operations_audit CASCADE;
DROP TABLE IF EXISTS table_order_items CASCADE;
DROP TABLE IF EXISTS booking_preorder_items CASCADE;
DROP TABLE IF EXISTS booking_tables CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    guest_name VARCHAR(100) NOT NULL,
    guest_phone VARCHAR(20) NOT NULL,
    guest_email VARCHAR(120) NOT NULL,
    booking_date DATE NOT NULL,
    time_slot_id UUID NOT NULL,
    guest_count INT NOT NULL CHECK (guest_count > 0),
    total_deposit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_REVIEW',
    -- UC-08: Nhu cầu đặc biệt & Dị ứng
    occasion VARCHAR(50),
    dietary_notes TEXT,
    baby_chair_count INT NOT NULL DEFAULT 0,
    candle_setup BOOLEAN NOT NULL DEFAULT FALSE,
    special_notes TEXT,
    staff_notes TEXT,
    -- UC-10: Đặt tiệc đoàn đông / Sự kiện bao trọn tầng (Private Banquet Booking)
    event_type VARCHAR(50),
    target_floor INT,
    company_name VARCHAR(150),
    estimated_budget DECIMAL(14, 2),
    stage_audio_required BOOLEAN NOT NULL DEFAULT FALSE,
    decoration_required BOOLEAN NOT NULL DEFAULT FALSE,
    callback_deadline TIMESTAMP WITH TIME ZONE,
    manager_call_status VARCHAR(30) DEFAULT 'PENDING_CALL',
    consultation_notes TEXT,
    reviewed_by_user_id UUID,
    payment_deadline TIMESTAMP WITH TIME ZONE,
    checkin_qr_token VARCHAR(255) UNIQUE,
    -- UC-12: Vé điện tử E-Ticket & Dynamic QR Code 64 ký tự chống giả mạo
    ticket_issued_at TIMESTAMP WITH TIME ZONE,
    ticket_zns_status VARCHAR(30) DEFAULT 'PENDING',
    ticket_email_status VARCHAR(30) DEFAULT 'PENDING',
    qr_secret_salt VARCHAR(64),
    qr_rotation_counter INT NOT NULL DEFAULT 1,
    checkin_scanned_at TIMESTAMP WITH TIME ZONE,
    seated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_tables (
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    table_id UUID NOT NULL,
    PRIMARY KEY (booking_id, table_id)
);

CREATE TABLE booking_preorder_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL,
    item_name VARCHAR(150),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    subtotal DECIMAL(12, 2) NOT NULL,
    notes TEXT
);

CREATE TABLE table_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    table_id UUID NOT NULL,
    menu_item_id UUID,
    item_name VARCHAR(150) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PREPARING',
    notes TEXT,
    ordered_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE table_operations_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_type VARCHAR(30) NOT NULL,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    source_table_id UUID NOT NULL,
    target_table_id UUID NOT NULL,
    performed_by UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id VARCHAR(50) NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_bookings_date_slot ON bookings(booking_date, time_slot_id, status);
CREATE INDEX idx_bookings_user ON bookings(user_id, status);
CREATE INDEX idx_bookings_qr_token ON bookings(checkin_qr_token) WHERE checkin_qr_token IS NOT NULL;
CREATE INDEX idx_bookings_pending_deadline ON bookings(status, payment_deadline) WHERE status = 'AWAITING_PAYMENT';
CREATE INDEX idx_bookings_event_inquiry ON bookings(status, callback_deadline) WHERE status = 'EVENT_INQUIRY';
CREATE INDEX idx_table_order_items ON table_order_items(booking_id, table_id, status);
CREATE INDEX idx_outbox_pending ON outbox_events(status, created_at) WHERE status = 'PENDING';

-- Seed Data
INSERT INTO bookings (
    id, booking_code, user_id, guest_name, guest_phone, guest_email,
    booking_date, time_slot_id, guest_count, total_deposit, status,
    special_notes, staff_notes, payment_deadline, checkin_qr_token
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'PB-20261024-001',
    'a0000000-0000-0000-0000-000000000005',
    'Nguyễn Văn A',
    '+84901234567',
    'khachvip@gmail.com',
    '2026-10-24',
    'b1000000-0000-0000-0000-000000000002',
    4,
    200000.00,
    'CONFIRMED',
    'Setup nến sinh nhật góc cửa sổ',
    'Đã gọi anh Tuấn chốt cọc 200k, tặng bánh kem sinh nhật',
    NOW() + INTERVAL '60 minutes',
    'QR_TOKEN_DEMO_PB001'
);

INSERT INTO booking_tables (booking_id, table_id) VALUES
('c0000000-0000-0000-0000-000000000001', 'b3000000-0000-0000-0000-000000000004');




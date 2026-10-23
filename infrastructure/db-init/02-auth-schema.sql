\c tablemaster_auth;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'ROLE_CUSTOMER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    loyalty_points INT DEFAULT 0,
    avatar_url TEXT,
    dietary_preferences TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    device_info VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX idx_users_role ON users(role) WHERE is_active = TRUE;
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id, is_revoked);

-- Seed Data
INSERT INTO users (id, phone_number, email, password_hash, full_name, role, loyalty_points) VALUES 
('a0000000-0000-0000-0000-000000000001', '+84900000001', 'admin@primebistro.vn', '$2a$10$gC7kFVQNOCOoVuo0I/U3x.9Y6DYmxvNqv.4FrkulnLo1V7wyjg90a', 'Chủ Nhà Hàng (Admin)', 'ROLE_ADMIN', 0),
('a0000000-0000-0000-0000-000000000002', '+84900000002', 'manager@primebistro.vn', '$2a$10$gC7kFVQNOCOoVuo0I/U3x.9Y6DYmxvNqv.4FrkulnLo1V7wyjg90a', 'Quản Lý Ca Trực', 'ROLE_MANAGER', 0),
('a0000000-0000-0000-0000-000000000003', '+84900000003', 'host@primebistro.vn', '$2a$10$gC7kFVQNOCOoVuo0I/U3x.9Y6DYmxvNqv.4FrkulnLo1V7wyjg90a', 'Lễ Tân Sảnh Tầng 1', 'ROLE_HOST', 0),
('a0000000-0000-0000-0000-000000000004', '+84900000004', 'waiter@primebistro.vn', '$2a$10$gC7kFVQNOCOoVuo0I/U3x.9Y6DYmxvNqv.4FrkulnLo1V7wyjg90a', 'Phục Vụ Bàn Tầng 1', 'ROLE_WAITER', 0),
('a0000000-0000-0000-0000-000000000005', '+84901234567', 'khachvip@gmail.com', NULL, 'Nguyễn Văn A (Khách VIP)', 'ROLE_CUSTOMER', 1250);


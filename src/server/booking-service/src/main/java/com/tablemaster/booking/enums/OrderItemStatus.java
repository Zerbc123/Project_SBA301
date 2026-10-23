package com.tablemaster.booking.enums;

/**
 * Trạng thái món gọi thêm tại bàn (Table Order Item Status)
 *
 * PREPARING  → Bếp đang chế biến
 * SERVED     → Đã lên món cho khách
 * CANCELLED  → Hủy món (khách đổi ý hoặc hết nguyên liệu)
 */
public enum OrderItemStatus {
    PREPARING,
    SERVED,
    CANCELLED
}

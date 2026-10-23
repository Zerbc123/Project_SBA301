package com.tablemaster.booking.enums;

/**
 * Vòng đời 9 trạng thái đơn đặt bàn (Booking State Machine)
 *
 * PENDING_REVIEW   → Khách vừa gửi đơn trên web, chờ Lễ tân gọi điện xác nhận
 * AWAITING_PAYMENT → Lễ tân đã gọi chốt đơn, chờ khách chuyển khoản cọc VietQR
 * CONFIRMED        → Đã cọc thành công, ĐÃ GỬI VÉ QR EMAIL cho khách
 * SEATED           → Lễ tân quét QR check-in, khách đã vào bàn
 * COMPLETED        → Khách dùng bữa xong, hoàn tất thanh toán bill
 * REJECTED         → Từ chối (gọi 3 lần không nghe máy / khách đổi ý / hết chỗ)
 * EXPIRED          → Quá hạn payment_deadline, tự động nhả bàn
 * CANCELLED        → Khách hủy đơn sau khi đã cọc (có thể được hoàn cọc)
 * NO_SHOW          → Quá 15 phút không đến, tịch thu cọc
 */
public enum BookingStatus {
    PENDING_REVIEW,
    AWAITING_PAYMENT,
    CONFIRMED,
    SEATED,
    COMPLETED,
    REJECTED,
    EXPIRED,
    CANCELLED,
    NO_SHOW
}

package com.tablemaster.booking.entity;

import com.tablemaster.booking.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Bảng đơn đặt bàn chính (bookings)
 * Vòng đời 9 trạng thái: PENDING_REVIEW → AWAITING_PAYMENT → CONFIRMED → SEATED → COMPLETED
 * + REJECTED, EXPIRED, CANCELLED, NO_SHOW
 */
@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_bookings_date_slot", columnList = "booking_date, time_slot_id, status"),
        @Index(name = "idx_bookings_user", columnList = "user_id, status"),
        @Index(name = "idx_bookings_qr_token", columnList = "checkin_qr_token"),
        @Index(name = "idx_bookings_pending_deadline", columnList = "status, payment_deadline")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_code", unique = true, nullable = false, length = 20)
    private String bookingCode;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    // Snapshot liên lạc người đặt thực tế (Độc lập & Bảo mật khi SIM đổi chủ)
    @Column(name = "guest_name", nullable = false, length = 100)
    private String guestName;

    @Column(name = "guest_phone", nullable = false, length = 20)
    private String guestPhone;

    @Column(name = "guest_email", nullable = false, length = 120)
    private String guestEmail;

    @Column(name = "booking_date", nullable = false)
    private LocalDate bookingDate;

    @Column(name = "time_slot_id", nullable = false)
    private UUID timeSlotId;

    @Column(name = "guest_count", nullable = false)
    private Integer guestCount;

    @Column(name = "total_deposit", precision = 12, scale = 2, nullable = false)
    @Builder.Default
    private BigDecimal totalDeposit = BigDecimal.ZERO;

    // Vòng đời 9 trạng thái
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING_REVIEW;

    // Ghi chú của khách: "Set nến kỷ niệm ngày cưới"
    @Column(name = "special_notes", columnDefinition = "TEXT")
    private String specialNotes;

    // Ghi chú của Lễ tân sau cuộc gọi Telesales
    @Column(name = "staff_notes", columnDefinition = "TEXT")
    private String staffNotes;

    // Lễ tân nào gọi xác nhận (Ref tablemaster_auth.users)
    @Column(name = "reviewed_by_user_id")
    private UUID reviewedByUserId;

    // Hạn chót cọc VietQR (VD: 60 phút)
    @Column(name = "payment_deadline")
    private ZonedDateTime paymentDeadline;

    // Mã Token sinh mã QR gửi qua Email (Check-in tại sảnh)
    @Column(name = "checkin_qr_token", unique = true, length = 255)
    private String checkinQrToken;

    @Column(name = "seated_at")
    private ZonedDateTime seatedAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;

    // ==================== QUAN HỆ ====================

    // Liên kết với bàn ăn (1 booking có thể chiếm 1 hoặc nhiều bàn - ghép bàn)
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BookingTable> bookingTables = new ArrayList<>();

    // Danh sách món đặt trước từ Web
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BookingPreorderItem> preorderItems = new ArrayList<>();

    // Danh sách món gọi thêm tại bàn qua Tablet Phục vụ
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<TableOrderItem> tableOrderItems = new ArrayList<>();
}

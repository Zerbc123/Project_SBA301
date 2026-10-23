package com.tablemaster.booking.repository;

import com.tablemaster.booking.entity.Booking;
import com.tablemaster.booking.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    Optional<Booking> findByBookingCode(String bookingCode);

    Optional<Booking> findByCheckinQrToken(String checkinQrToken);

    // Tìm danh sách đơn theo userId (lịch sử đặt bàn của khách)
    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    // Tìm danh sách đơn theo trạng thái (cho Lễ tân xem đơn cần xử lý)
    List<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status);

    // Tìm danh sách đơn theo ngày và ca giờ (cho Lễ tân xem lịch bàn)
    List<Booking> findByBookingDateAndTimeSlotIdAndStatusIn(
            LocalDate bookingDate, UUID timeSlotId, List<BookingStatus> statuses);

    // Tìm tất cả bàn đã được đặt trong ngày + ca giờ (để tính bàn trống)
    @Query("SELECT bt.id.tableId FROM BookingTable bt " +
            "JOIN bt.booking b " +
            "WHERE b.bookingDate = :date " +
            "AND b.timeSlotId = :slotId " +
            "AND b.status IN :statuses")
    List<UUID> findBookedTableIds(
            @Param("date") LocalDate date,
            @Param("slotId") UUID slotId,
            @Param("statuses") List<BookingStatus> statuses);

    // Tìm tất cả bàn đã được đặt trong ngày + danh sách ca giờ
    @Query("SELECT bt.id.tableId FROM BookingTable bt " +
            "JOIN bt.booking b " +
            "WHERE b.bookingDate = :date " +
            "AND b.timeSlotId IN :slotIds " +
            "AND b.status IN :statuses")
    List<UUID> findBookedTableIdsBySlots(
            @Param("date") LocalDate date,
            @Param("slotIds") List<UUID> slotIds,
            @Param("statuses") List<BookingStatus> statuses);

    // Tìm tất cả bàn đã được đặt trong ngày (toàn bộ các ca)
    @Query("SELECT bt.id.tableId FROM BookingTable bt " +
            "JOIN bt.booking b " +
            "WHERE b.bookingDate = :date " +
            "AND b.status IN :statuses")
    List<UUID> findBookedTableIdsByDate(
            @Param("date") LocalDate date,
            @Param("statuses") List<BookingStatus> statuses);

    // Tìm các đơn quá hạn cọc (AWAITING_PAYMENT + hết deadline) → Auto expire
    @Query("SELECT b FROM Booking b WHERE b.status = 'AWAITING_PAYMENT' " +
            "AND b.paymentDeadline IS NOT NULL AND b.paymentDeadline < :now")
    List<Booking> findExpiredAwaitingPayment(@Param("now") ZonedDateTime now);

    // Tìm các đơn CONFIRMED quá 15 phút chưa check-in → Auto NO_SHOW
    @Query("SELECT b FROM Booking b WHERE b.status = 'CONFIRMED' " +
            "AND b.bookingDate = :today")
    List<Booking> findConfirmedBookingsForToday(@Param("today") LocalDate today);

    // Đếm số đơn trong ngày để sinh booking_code
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.bookingDate = :date")
    long countByBookingDate(@Param("date") LocalDate date);

    // Tìm danh sách đơn theo trạng thái (nhiều trạng thái)
    List<Booking> findByStatusInOrderByBookingDateAscCreatedAtAsc(List<BookingStatus> statuses);
}

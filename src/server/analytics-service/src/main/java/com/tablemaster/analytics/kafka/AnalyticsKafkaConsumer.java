package com.tablemaster.analytics.kafka;

import com.tablemaster.analytics.event.BookingCompletedEvent;
import com.tablemaster.analytics.event.DepositPaidSuccessEvent;
import com.tablemaster.analytics.event.NoShowReportedEvent;
import com.tablemaster.analytics.service.DailyShiftAnalyticsService;
import com.tablemaster.analytics.service.TablePopularityService;
import com.tablemaster.analytics.service.VipCustomerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Kafka Consumer nhận các sự kiện nghiệp vụ liên Microservices
 * Tự động tổng hợp dữ liệu doanh thu, độ hot bàn ăn & phân hạng khách VIP Real-time
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AnalyticsKafkaConsumer {

    private final DailyShiftAnalyticsService shiftService;
    private final TablePopularityService tableService;
    private final VipCustomerService vipService;

    @KafkaListener(topics = "booking.completed", groupId = "analytics-group")
    public void consumeBookingCompleted(BookingCompletedEvent event) {
        log.info("[Kafka] Nhận sự kiện booking.completed: bookingId={}, bill={}", event.getBookingId(), event.getFoodBill());
        handleBookingCompleted(event);
    }

    @KafkaListener(topics = "payment.deposit.success", groupId = "analytics-group")
    public void consumeDepositPaid(DepositPaidSuccessEvent event) {
        log.info("[Kafka] Nhận sự kiện payment.deposit.success: bookingId={}, amount={}", event.getBookingId(), event.getDepositAmount());
        handleDepositPaid(event);
    }

    @KafkaListener(topics = "booking.no-show", groupId = "analytics-group")
    public void consumeNoShow(NoShowReportedEvent event) {
        log.info("[Kafka] Nhận sự kiện booking.no-show: bookingId={}, penalty={}", event.getBookingId(), event.getPenaltyAmount());
        handleNoShow(event);
    }

    public void handleBookingCompleted(BookingCompletedEvent event) {
        if (event == null || event.getBookingId() == null) {
            log.warn("[Security] Bỏ qua BookingCompletedEvent không hợp lệ hoặc thiếu bookingId");
            return;
        }

        log.info("Xử lý phân tích BookingCompletedEvent cho bookingId={}, bill={}", event.getBookingId(), event.getFoodBill());

        LocalDate date = parseDate(event.getDate());
        UUID slotId = parseUuid(event.getSlotId());
        UUID tableId = parseUuid(event.getTableId());
        UUID userId = parseUuid(event.getUserId());

        // 1. Cập nhật Doanh thu ca & RevPASH
        if (slotId != null) {
            shiftService.recordBookingCompletion(
                    date,
                    slotId,
                    event.getSlotName(),
                    event.getFoodBill() != null ? event.getFoodBill() : BigDecimal.ZERO,
                    event.getGuestCount() != null ? event.getGuestCount() : 2
            );
        }

        // 2. Cập nhật Độ hot bàn ăn (Heatmap)
        if (tableId != null) {
            tableService.recordReservationUsage(
                    tableId,
                    event.getTableCode(),
                    event.getZoneType(),
                    event.getFoodBill() != null ? event.getFoodBill() : BigDecimal.ZERO
            );
        }

        // 3. Cập nhật & Thăng hạng khách hàng VIP (Loyalty CRM)
        if (userId != null) {
            vipService.recordCustomerMeal(
                    userId,
                    event.getPhoneNumber(),
                    event.getCustomerName(),
                    event.getGuestCount() != null ? event.getGuestCount() : 2,
                    event.getFoodBill(),
                    event.getZoneType(),
                    date
            );
        }
    }

    public void handleDepositPaid(DepositPaidSuccessEvent event) {
        if (event == null || event.getBookingId() == null) {
            log.warn("[Security] Bỏ qua DepositPaidSuccessEvent không hợp lệ");
            return;
        }

        log.info("Xử lý phân tích DepositPaidSuccessEvent cho bookingId={}, deposit={}", event.getBookingId(), event.getDepositAmount());

        LocalDate date = parseDate(event.getDate());
        UUID slotId = parseUuid(event.getSlotId());

        if (slotId != null) {
            shiftService.recordBookingDeposit(date, slotId, event.getSlotName(), event.getDepositAmount());
        }
    }

    public void handleNoShow(NoShowReportedEvent event) {
        if (event == null || event.getBookingId() == null) {
            log.warn("[Security] Bỏ qua NoShowReportedEvent không hợp lệ");
            return;
        }

        log.info("Xử lý phân tích NoShowReportedEvent cho bookingId={}, penalty={}", event.getBookingId(), event.getPenaltyAmount());

        LocalDate date = parseDate(event.getDate());
        UUID slotId = parseUuid(event.getSlotId());

        if (slotId != null) {
            shiftService.recordNoShow(date, slotId, event.getSlotName(), event.getPenaltyAmount());
        }
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return LocalDate.now();
        }
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private UUID parseUuid(String uuidStr) {
        if (uuidStr == null || uuidStr.isBlank()) {
            return null;
        }
        try {
            return UUID.fromString(uuidStr);
        } catch (Exception e) {
            return UUID.nameUUIDFromBytes(uuidStr.getBytes());
        }
    }
}

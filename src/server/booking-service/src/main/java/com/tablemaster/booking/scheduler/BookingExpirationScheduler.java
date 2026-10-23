package com.tablemaster.booking.scheduler;

import com.tablemaster.booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class BookingExpirationScheduler {

    private final BookingService bookingService;

    /**
     * Quét định kỳ mỗi 60 giây để hủy các đơn quá hạn nộp cọc (AWAITING_PAYMENT quá paymentDeadline)
     */
    @Scheduled(fixedRate = 60000)
    public void scanAndExpireBookings() {
        try {
            bookingService.checkAndExpireBookings();
        } catch (Exception e) {
            log.error("Error during scheduled booking expiration check", e);
        }
    }
}

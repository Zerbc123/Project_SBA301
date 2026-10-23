package com.tablemaster.booking.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tablemaster.booking.config.KafkaConfig;
import com.tablemaster.booking.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventConsumer {

    private final BookingService bookingService;
    private final ObjectMapper objectMapper;

    /**
     * Nhận event thanh toán cọc thành công từ payment-service
     * Chuyển trạng thái đơn từ AWAITING_PAYMENT -> CONFIRMED và sinh mã QR check-in
     */
    @KafkaListener(topics = KafkaConfig.TOPIC_PAYMENT_SUCCESS, groupId = "booking-service-group")
    public void consumePaymentSuccess(String message) {
        log.info("Received payment success message: {}", message);
        try {
            JsonNode root = objectMapper.readTree(message);
            if (root.has("bookingId")) {
                UUID bookingId = UUID.fromString(root.get("bookingId").asText());
                bookingService.confirmBookingAfterPayment(bookingId);
                log.info("Successfully processed payment success for booking ID: {}", bookingId);
            }
        } catch (Exception e) {
            log.error("Failed to process payment success event: {}", message, e);
        }
    }
}

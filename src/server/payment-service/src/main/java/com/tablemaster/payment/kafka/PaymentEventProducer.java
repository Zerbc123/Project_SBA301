package com.tablemaster.payment.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tablemaster.payment.config.KafkaConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventProducer {

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    /**
     * Bắn event payment.success sang Kafka để booking-service tự động chuyển trạng thái đơn sang CONFIRMED và sinh mã QR check-in
     */
    public void publishPaymentSuccess(UUID bookingId, String transactionCode, BigDecimal amount, ZonedDateTime paidAt) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("bookingId", bookingId.toString());
            payload.put("transactionCode", transactionCode);
            payload.put("amount", amount);
            payload.put("paidAt", paidAt != null ? paidAt.toString() : ZonedDateTime.now().toString());

            String message = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(KafkaConfig.TOPIC_PAYMENT_SUCCESS, bookingId.toString(), message);
            log.info("Published payment.success event to Kafka for bookingId: {}, transactionCode: {}", bookingId, transactionCode);
        } catch (Exception e) {
            log.error("Failed to publish payment.success event for bookingId {}: {}", bookingId, e.getMessage(), e);
        }
    }
}

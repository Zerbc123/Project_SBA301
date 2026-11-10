package com.tablemaster.notification.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tablemaster.notification.dto.NotificationEmailPayload;
import com.tablemaster.notification.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class KafkaNotificationConsumer {

    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    /**
     * Lắng nghe sự kiện yêu cầu gửi email từ Booking Service:
     * - notification.email.sent: Kênh chuẩn duy nhất để gửi email cọc hoặc vé điện tử (tránh gửi trùng lặp)
     */
    @KafkaListener(topics = {
            "notification.email.sent"
    }, groupId = "notification-service-group")
    public void handleBookingNotificationEvent(Map<String, Object> payload) {
        log.info("📥 [Kafka] Nhận sự kiện thông báo vé cọc / đặt bàn từ Kafka: bookingCode={}", payload.get("bookingCode"));
        try {
            NotificationEmailPayload emailPayload = objectMapper.convertValue(payload, NotificationEmailPayload.class);
            boolean success = emailService.sendBookingEmail(emailPayload);
            if (success) {
                log.info("🎯 [Notification Service] Hoàn tất gửi Email cho đơn: {}", emailPayload.getBookingCode());
            } else {
                log.warn("⚠️ [Notification Service] Không thể gửi Email hoặc không có email người nhận");
            }
        } catch (Exception e) {
            log.error("❌ Lỗi xử lý sự kiện Kafka thông báo: {}", e.getMessage(), e);
        }
    }
}

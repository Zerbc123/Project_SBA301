package com.tablemaster.booking.kafka;

import com.tablemaster.booking.config.KafkaConfig;
import com.tablemaster.booking.entity.Booking;
import com.tablemaster.booking.entity.OutboxEvent;
import com.tablemaster.booking.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingEventProducer {

    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final OutboxEventRepository outboxEventRepository;

    /**
     * Gửi event trực tiếp qua Kafka và lưu vào Transactional Outbox để đảm bảo tính tin cậy
     */
    public void publishEvent(String topic, String aggregateType, UUID aggregateId, String eventType, Map<String, Object> payload) {
        // Lưu vào outbox
        OutboxEvent outbox = OutboxEvent.builder()
                .aggregateType(aggregateType)
                .aggregateId(aggregateId.toString())
                .eventType(eventType)
                .payload(payload)
                .status("PENDING")
                .retryCount(0)
                .build();

        try {
            kafkaTemplate.send(topic, aggregateId.toString(), payload);
            outbox.setStatus("SENT");
            outbox.setProcessedAt(ZonedDateTime.now());
            log.info("Sent Kafka event to topic [{}]: aggregateId={}, type={}", topic, aggregateId, eventType);
        } catch (Exception e) {
            log.error("Failed to send Kafka event immediately to topic [{}]. Outbox will retry.", topic, e);
        }

        outboxEventRepository.save(outbox);
    }

    public void publishBookingCreated(Booking booking) {
        Map<String, Object> payload = createBookingPayload(booking);
        publishEvent(KafkaConfig.TOPIC_BOOKING_CREATED, "BOOKING", booking.getId(), "BOOKING_CREATED", payload);
    }

    public void publishBookingConfirmed(Booking booking) {
        Map<String, Object> payload = createBookingPayload(booking);
        publishEvent(KafkaConfig.TOPIC_BOOKING_CONFIRMED, "BOOKING", booking.getId(), "BOOKING_CONFIRMED", payload);
    }

    public void publishBookingSeated(Booking booking) {
        Map<String, Object> payload = createBookingPayload(booking);
        publishEvent(KafkaConfig.TOPIC_BOOKING_SEATED, "BOOKING", booking.getId(), "BOOKING_SEATED", payload);
    }

    public void publishBookingCompleted(Booking booking) {
        Map<String, Object> payload = createBookingPayload(booking);
        publishEvent(KafkaConfig.TOPIC_BOOKING_COMPLETED, "BOOKING", booking.getId(), "BOOKING_COMPLETED", payload);
    }

    public void publishBookingCancelled(Booking booking, String reason) {
        Map<String, Object> payload = createBookingPayload(booking);
        payload.put("reason", reason);
        publishEvent(KafkaConfig.TOPIC_BOOKING_CANCELLED, "BOOKING", booking.getId(), "BOOKING_CANCELLED", payload);
    }

    public void publishBookingExpired(Booking booking) {
        Map<String, Object> payload = createBookingPayload(booking);
        publishEvent(KafkaConfig.TOPIC_BOOKING_EXPIRED, "BOOKING", booking.getId(), "BOOKING_EXPIRED", payload);
    }

    public void publishTableUpdated(UUID bookingId, UUID fromTableId, UUID toTableId, String reason) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("bookingId", bookingId);
        payload.put("fromTableId", fromTableId);
        payload.put("toTableId", toTableId);
        payload.put("reason", reason);
        publishEvent(KafkaConfig.TOPIC_TABLE_UPDATED, "TABLE_OPERATION", bookingId, "TABLE_TRANSFERRED", payload);
    }

    private Map<String, Object> createBookingPayload(Booking booking) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("bookingId", booking.getId());
        payload.put("bookingCode", booking.getBookingCode());
        payload.put("userId", booking.getUserId());
        payload.put("guestName", booking.getGuestName());
        payload.put("guestPhone", booking.getGuestPhone());
        payload.put("guestEmail", booking.getGuestEmail());
        payload.put("bookingDate", booking.getBookingDate());
        payload.put("timeSlotId", booking.getTimeSlotId());
        payload.put("guestCount", booking.getGuestCount());
        payload.put("totalDeposit", booking.getTotalDeposit());
        payload.put("status", booking.getStatus().name());
        payload.put("checkinQrToken", booking.getCheckinQrToken());
        payload.put("paymentDeadline", booking.getPaymentDeadline());
        return payload;
    }
}

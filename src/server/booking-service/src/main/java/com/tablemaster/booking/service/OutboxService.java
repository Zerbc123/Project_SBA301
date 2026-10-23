package com.tablemaster.booking.service;

import com.tablemaster.booking.entity.OutboxEvent;
import com.tablemaster.booking.repository.OutboxEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OutboxService {

    private final OutboxEventRepository outboxEventRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * Quét các outbox events chưa gửi thành công (PENDING) mỗi 10 giây để gửi lại
     */
    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void processPendingOutboxEvents() {
        List<OutboxEvent> pendingEvents = outboxEventRepository.findByStatusOrderByCreatedAtAsc("PENDING");
        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Processing {} pending outbox events", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            try {
                String topic = "booking." + event.getEventType().toLowerCase().replace('_', '.');
                kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload());
                event.setStatus("SENT");
                event.setProcessedAt(ZonedDateTime.now());
                outboxEventRepository.save(event);
                log.info("Successfully re-published outbox event ID: {}", event.getId());
            } catch (Exception e) {
                event.setRetryCount(event.getRetryCount() == null ? 1 : event.getRetryCount() + 1);
                if (event.getRetryCount() >= 5) {
                    event.setStatus("FAILED");
                }
                outboxEventRepository.save(event);
                log.error("Failed to re-publish outbox event ID: {}", event.getId(), e);
            }
        }
    }
}

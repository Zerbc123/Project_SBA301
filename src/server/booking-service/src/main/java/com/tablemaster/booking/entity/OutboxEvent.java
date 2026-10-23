package com.tablemaster.booking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Bảng Transactional Outbox (outbox_events)
 * Đảm bảo bắn Event lên Kafka không bao giờ mất dữ liệu (chống Dual-Write problem)
 * Pattern: Ghi event vào DB cùng transaction với dữ liệu nghiệp vụ → Background poller gửi lên Kafka
 */
@Entity
@Table(name = "outbox_events", indexes = {
        @Index(name = "idx_outbox_pending", columnList = "status, created_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OutboxEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Loại aggregate: 'BOOKING', 'TABLE'
    @Column(name = "aggregate_type", nullable = false, length = 50)
    private String aggregateType;

    // ID của aggregate (booking_id hoặc table_id)
    @Column(name = "aggregate_id", nullable = false, length = 50)
    private String aggregateId;

    // Loại sự kiện: 'BookingCreatedEvent', 'BookingConfirmedEvent', 'TableTransferredEvent'
    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    // Payload dạng JSONB chứa toàn bộ dữ liệu sự kiện
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> payload;

    // Trạng thái xử lý: PENDING → SENT / FAILED
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "processed_at")
    private ZonedDateTime processedAt;
}

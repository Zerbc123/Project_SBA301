package com.tablemaster.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "webhook_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "provider", nullable = false, length = 50)
    private String provider;

    @Column(name = "payload", nullable = false, columnDefinition = "TEXT")
    private String payload;

    @Column(name = "signature_header", columnDefinition = "TEXT")
    private String signatureHeader;

    @Column(name = "is_signature_valid", nullable = false)
    private Boolean isSignatureValid;

    @Column(name = "processed_status", nullable = false, length = 30)
    @Builder.Default
    private String processedStatus = "PROCESSED"; // PROCESSED, DUPLICATE, INVALID

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}

package com.tablemaster.payment.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "payment_refunds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRefund {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "payment_transaction_id", nullable = false)
    private UUID paymentTransactionId;

    @Column(name = "refund_amount", precision = 12, scale = 2, nullable = false)
    private BigDecimal refundAmount;

    @Column(name = "refund_ratio", nullable = false)
    @Builder.Default
    private Float refundRatio = 1.0f;

    @Column(name = "refund_status", nullable = false, length = 30)
    @Builder.Default
    private String refundStatus = "PROCESSING"; // PROCESSING, COMPLETED, REJECTED

    @Column(name = "refund_bank_bin", length = 10)
    private String refundBankBin;

    @Column(name = "refund_account_no", length = 30)
    private String refundAccountNo;

    @Column(name = "refund_account_holder", length = 100)
    private String refundAccountHolder;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;

    @Column(name = "completed_at")
    private ZonedDateTime completedAt;
}

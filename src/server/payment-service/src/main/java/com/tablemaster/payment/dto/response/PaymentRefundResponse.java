package com.tablemaster.payment.dto.response;

import com.tablemaster.payment.entity.PaymentRefund;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentRefundResponse {

    private UUID id;
    private UUID paymentTransactionId;
    private BigDecimal refundAmount;
    private Float refundRatio;
    private String refundStatus;
    private String refundBankBin;
    private String refundAccountNo;
    private String refundAccountHolder;
    private String reason;
    private ZonedDateTime createdAt;
    private ZonedDateTime completedAt;

    public static PaymentRefundResponse fromEntity(PaymentRefund refund) {
        if (refund == null) return null;
        return PaymentRefundResponse.builder()
                .id(refund.getId())
                .paymentTransactionId(refund.getPaymentTransactionId())
                .refundAmount(refund.getRefundAmount())
                .refundRatio(refund.getRefundRatio())
                .refundStatus(refund.getRefundStatus())
                .refundBankBin(refund.getRefundBankBin())
                .refundAccountNo(refund.getRefundAccountNo())
                .refundAccountHolder(refund.getRefundAccountHolder())
                .reason(refund.getReason())
                .createdAt(refund.getCreatedAt())
                .completedAt(refund.getCompletedAt())
                .build();
    }
}

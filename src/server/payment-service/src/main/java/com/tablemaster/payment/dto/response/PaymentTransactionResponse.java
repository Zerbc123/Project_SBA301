package com.tablemaster.payment.dto.response;

import com.tablemaster.payment.entity.PaymentTransaction;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentTransactionResponse {

    private UUID id;
    private String transactionCode;
    private UUID bookingId;
    private UUID userId;
    private BigDecimal amount;
    private String paymentMethod;
    private String transferContent;
    private String bankProvider;
    private String bankTransactionId;
    private String status;
    private ZonedDateTime paidAt;
    private ZonedDateTime createdAt;
    private ZonedDateTime updatedAt;

    public static PaymentTransactionResponse fromEntity(PaymentTransaction txn) {
        if (txn == null) return null;
        return PaymentTransactionResponse.builder()
                .id(txn.getId())
                .transactionCode(txn.getTransactionCode())
                .bookingId(txn.getBookingId())
                .userId(txn.getUserId())
                .amount(txn.getAmount())
                .paymentMethod(txn.getPaymentMethod())
                .transferContent(txn.getTransferContent())
                .bankProvider(txn.getBankProvider())
                .bankTransactionId(txn.getBankTransactionId())
                .status(txn.getStatus())
                .paidAt(txn.getPaidAt())
                .createdAt(txn.getCreatedAt())
                .updatedAt(txn.getUpdatedAt())
                .build();
    }
}

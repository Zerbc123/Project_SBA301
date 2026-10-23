package com.tablemaster.analytics.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Sự kiện thanh toán tiền cọc thành công
 * Được bắn qua Kafka topic: payment.deposit.success
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class DepositPaidSuccessEvent {

    @NotBlank(message = "Mã giao dịch (transactionId) không được để trống")
    @Size(max = 64, message = "transactionId không vượt quá 64 ký tự")
    private String transactionId;

    @NotBlank(message = "Mã đặt bàn (bookingId) không được để trống")
    @Size(max = 64, message = "bookingId không vượt quá 64 ký tự")
    private String bookingId;

    private String userId;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Ngày phải theo định dạng YYYY-MM-DD")
    private String date; // YYYY-MM-DD

    private String slotId;
    private String slotName;

    @NotNull(message = "Số tiền cọc không được null")
    @DecimalMin(value = "0.0", inclusive = true, message = "Số tiền cọc không được là số âm")
    @Digits(integer = 12, fraction = 2, message = "Số tiền cọc vượt quá giới hạn cho phép")
    @Builder.Default
    private BigDecimal depositAmount = BigDecimal.ZERO;

    private String status;
}

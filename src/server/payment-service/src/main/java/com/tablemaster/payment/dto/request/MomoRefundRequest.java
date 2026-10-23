package com.tablemaster.payment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MomoRefundRequest {

    @NotBlank(message = "transactionCode không được để trống")
    private String transactionCode;

    @NotNull(message = "Số tiền hoàn không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền hoàn tối thiểu là 1,000 VND")
    private BigDecimal amount;

    private String reason;
}

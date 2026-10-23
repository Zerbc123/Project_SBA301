package com.tablemaster.payment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMomoPaymentRequest {

    @NotNull(message = "bookingId không được để trống")
    private UUID bookingId;

    @NotNull(message = "userId không được để trống")
    private UUID userId;

    @NotNull(message = "Số tiền thanh toán không được để trống")
    @DecimalMin(value = "1000", message = "Số tiền cọc tối thiểu là 1,000 VND")
    private BigDecimal amount;

    private String orderInfo;

    private String redirectUrl;
}

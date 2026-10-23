package com.tablemaster.payment.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MomoPaymentResponse {

    private String partnerCode;
    private String orderId;
    private String requestId;
    private BigDecimal amount;
    private Long responseTime;
    private String message;
    private Integer resultCode;
    private String payUrl;
    private String deeplink;
    private String qrCodeUrl;
    private String deeplinkMiniApp;
    private UUID bookingId;
}

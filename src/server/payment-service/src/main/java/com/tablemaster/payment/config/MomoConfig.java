package com.tablemaster.payment.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "momo")
@Getter
@Setter
public class MomoConfig {

    private String partnerCode = "MOMO";
    private String accessKey = "F8BBA842ECF85";
    private String secretKey = "K951B6PE1waDMi640xX0qPDpB2DA150";
    private String endpoint = "https://test-payment.momo.vn/v2/gateway/api/create";
    private String refundEndpoint = "https://test-payment.momo.vn/v2/gateway/api/refund";
    private String queryEndpoint = "https://test-payment.momo.vn/v2/gateway/api/query";
    private String redirectUrl = "http://localhost:5173/payment/result";
    private String ipnUrl = "http://localhost:8080/api/v1/payments/momo/ipn";
    private String requestType = "captureWallet";
}

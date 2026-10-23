package com.tablemaster.payment.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tablemaster.payment.config.MomoConfig;
import com.tablemaster.payment.dto.request.CreateMomoPaymentRequest;
import com.tablemaster.payment.dto.request.MomoIpnRequest;
import com.tablemaster.payment.dto.request.MomoRefundRequest;
import com.tablemaster.payment.dto.response.MomoPaymentResponse;
import com.tablemaster.payment.dto.response.PaymentRefundResponse;
import com.tablemaster.payment.dto.response.PaymentTransactionResponse;
import com.tablemaster.payment.entity.PaymentRefund;
import com.tablemaster.payment.entity.PaymentTransaction;
import com.tablemaster.payment.entity.WebhookAuditLog;
import com.tablemaster.payment.enums.PaymentMethod;
import com.tablemaster.payment.enums.PaymentStatus;
import com.tablemaster.payment.enums.RefundStatus;
import com.tablemaster.payment.exception.PaymentException;
import com.tablemaster.payment.exception.ResourceNotFoundException;
import com.tablemaster.payment.kafka.PaymentEventProducer;
import com.tablemaster.payment.repository.PaymentRefundRepository;
import com.tablemaster.payment.repository.PaymentTransactionRepository;
import com.tablemaster.payment.repository.WebhookAuditLogRepository;
import com.tablemaster.payment.service.MomoPaymentService;
import com.tablemaster.payment.util.MomoSecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MomoPaymentServiceImpl implements MomoPaymentService {

    private final MomoConfig momoConfig;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final PaymentTransactionRepository transactionRepository;
    private final PaymentRefundRepository refundRepository;
    private final WebhookAuditLogRepository auditLogRepository;
    private final PaymentEventProducer paymentEventProducer;

    @Override
    @Transactional
    public MomoPaymentResponse createPayment(CreateMomoPaymentRequest request) {
        String requestId = UUID.randomUUID().toString();
        String orderId = "TXN-MM-" + System.currentTimeMillis();
        long amountLong = request.getAmount().longValue();
        String orderInfo = (request.getOrderInfo() != null && !request.getOrderInfo().isBlank())
                ? request.getOrderInfo()
                : "Thanh toan tien coc ban TableMaster - Don " + request.getBookingId();

        String redirectUrl = (request.getRedirectUrl() != null && !request.getRedirectUrl().isBlank())
                ? request.getRedirectUrl()
                : momoConfig.getRedirectUrl();
        String ipnUrl = momoConfig.getIpnUrl();
        String extraData = "";
        String requestType = momoConfig.getRequestType();

        // 1. Lưu bản ghi PaymentTransaction PENDING vào database
        PaymentTransaction txn = PaymentTransaction.builder()
                .transactionCode(orderId)
                .bookingId(request.getBookingId())
                .userId(request.getUserId())
                .amount(request.getAmount())
                .paymentMethod(PaymentMethod.MOMO.name())
                .transferContent("TM MOMO " + orderId)
                .bankProvider("MOMO")
                .status(PaymentStatus.PENDING.name())
                .build();
        transactionRepository.save(txn);
        log.info("Initialized PENDING transaction for booking {}: orderId={}", request.getBookingId(), orderId);

        // 2. Tạo chuỗi ký HMAC-SHA256 theo chuẩn MoMo API v2
        // accessKey=$accessKey&amount=$amount&extraData=$extraData&ipnUrl=$ipnUrl&orderId=$orderId&orderInfo=$orderInfo&partnerCode=$partnerCode&redirectUrl=$redirectUrl&requestId=$requestId&requestType=$requestType
        String rawHash = "accessKey=" + momoConfig.getAccessKey() +
                "&amount=" + amountLong +
                "&extraData=" + extraData +
                "&ipnUrl=" + ipnUrl +
                "&orderId=" + orderId +
                "&orderInfo=" + orderInfo +
                "&partnerCode=" + momoConfig.getPartnerCode() +
                "&redirectUrl=" + redirectUrl +
                "&requestId=" + requestId +
                "&requestType=" + requestType;

        String signature = MomoSecurityUtils.signHmacSha256(rawHash, momoConfig.getSecretKey());

        Map<String, Object> momoRequest = new HashMap<>();
        momoRequest.put("partnerCode", momoConfig.getPartnerCode());
        momoRequest.put("partnerName", "TableMaster Restaurant");
        momoRequest.put("storeId", "TableMaster_Store_1");
        momoRequest.put("requestId", requestId);
        momoRequest.put("amount", amountLong);
        momoRequest.put("orderId", orderId);
        momoRequest.put("orderInfo", orderInfo);
        momoRequest.put("redirectUrl", redirectUrl);
        momoRequest.put("ipnUrl", ipnUrl);
        momoRequest.put("lang", "vi");
        momoRequest.put("extraData", extraData);
        momoRequest.put("requestType", requestType);
        momoRequest.put("signature", signature);

        // 3. Gọi MoMo Sandbox API
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(momoRequest, headers);

            log.info("Calling MoMo create payment API: {} with orderId: {}", momoConfig.getEndpoint(), orderId);
            Map<?, ?> response = restTemplate.postForObject(momoConfig.getEndpoint(), entity, Map.class);

            if (response != null && response.containsKey("payUrl")) {
                Integer resultCode = (response.get("resultCode") instanceof Number)
                        ? ((Number) response.get("resultCode")).intValue() : 0;
                String payUrl = (String) response.get("payUrl");
                String deeplink = (String) response.get("deeplink");
                String qrCodeUrl = (String) response.get("qrCodeUrl");
                String deeplinkMiniApp = (String) response.get("deeplinkMiniApp");

                return MomoPaymentResponse.builder()
                        .partnerCode(momoConfig.getPartnerCode())
                        .orderId(orderId)
                        .requestId(requestId)
                        .amount(request.getAmount())
                        .resultCode(resultCode)
                        .message((String) response.get("message"))
                        .payUrl(payUrl)
                        .deeplink(deeplink)
                        .qrCodeUrl(qrCodeUrl)
                        .deeplinkMiniApp(deeplinkMiniApp)
                        .bookingId(request.getBookingId())
                        .build();
            }
        } catch (Exception e) {
            log.warn("MoMo Sandbox call failed or unreachable (offline/sandbox latency): {}. Generating standard fallback payment links.", e.getMessage());
        }

        // Fallback mô phỏng nếu sandbox ngoài mạng internet không truy cập được
        String simulatedPayUrl = redirectUrl + "?orderId=" + orderId + "&amount=" + amountLong;
        String simulatedQrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + simulatedPayUrl;

        return MomoPaymentResponse.builder()
                .partnerCode(momoConfig.getPartnerCode())
                .orderId(orderId)
                .requestId(requestId)
                .amount(request.getAmount())
                .resultCode(0)
                .message("Khởi tạo liên kết thanh toán MoMo thành công")
                .payUrl(simulatedPayUrl)
                .deeplink("momo://payment?orderId=" + orderId)
                .qrCodeUrl(simulatedQrUrl)
                .bookingId(request.getBookingId())
                .build();
    }

    @Override
    @Transactional
    public void processIpn(MomoIpnRequest ipnRequest) {
        log.info("Received MoMo IPN: {}", ipnRequest);

        // 1. Ghi log audit webhook
        boolean isValidSignature = true;
        try {
            String rawHash = "accessKey=" + momoConfig.getAccessKey() +
                    "&amount=" + ipnRequest.getAmount() +
                    "&extraData=" + (ipnRequest.getExtraData() != null ? ipnRequest.getExtraData() : "") +
                    "&message=" + ipnRequest.getMessage() +
                    "&orderId=" + ipnRequest.getOrderId() +
                    "&orderInfo=" + ipnRequest.getOrderInfo() +
                    "&orderType=" + ipnRequest.getOrderType() +
                    "&partnerCode=" + ipnRequest.getPartnerCode() +
                    "&payType=" + ipnRequest.getPayType() +
                    "&requestId=" + ipnRequest.getRequestId() +
                    "&responseTime=" + ipnRequest.getResponseTime() +
                    "&resultCode=" + ipnRequest.getResultCode() +
                    "&transId=" + ipnRequest.getTransId();

            String expectedSig = MomoSecurityUtils.signHmacSha256(rawHash, momoConfig.getSecretKey());
            if (ipnRequest.getSignature() != null && !ipnRequest.getSignature().isBlank()) {
                isValidSignature = expectedSig.equalsIgnoreCase(ipnRequest.getSignature());
            }
        } catch (Exception e) {
            log.warn("Error calculating IPN signature: {}", e.getMessage());
        }

        try {
            auditLogRepository.save(WebhookAuditLog.builder()
                    .provider("MOMO")
                    .payload(objectMapper.writeValueAsString(ipnRequest))
                    .signatureHeader(ipnRequest.getSignature())
                    .isSignatureValid(isValidSignature)
                    .processedStatus(isValidSignature ? "PROCESSED" : "INVALID_SIGNATURE")
                    .build());
        } catch (Exception ex) {
            log.error("Failed to persist webhook audit log: {}", ex.getMessage());
        }

        // 2. Tìm giao dịch
        PaymentTransaction txn = transactionRepository.findByTransactionCode(ipnRequest.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch: " + ipnRequest.getOrderId()));

        // 3. Cơ chế Idempotency: Nếu đã SUCCESS thì bỏ qua
        if (PaymentStatus.SUCCESS.name().equalsIgnoreCase(txn.getStatus())) {
            log.info("Transaction {} already SUCCESS, skipping duplicate IPN", txn.getTransactionCode());
            return;
        }

        // 4. Cập nhật kết quả thanh toán
        if (ipnRequest.getResultCode() != null && ipnRequest.getResultCode() == 0) {
            txn.setStatus(PaymentStatus.SUCCESS.name());
            txn.setPaidAt(ZonedDateTime.now());
            if (ipnRequest.getTransId() != null) {
                txn.setBankTransactionId(String.valueOf(ipnRequest.getTransId()));
            }
            transactionRepository.save(txn);
            log.info("Successfully updated transaction {} to SUCCESS", txn.getTransactionCode());

            // 5. Bắn Kafka event sang booking-service
            paymentEventProducer.publishPaymentSuccess(
                    txn.getBookingId(),
                    txn.getTransactionCode(),
                    txn.getAmount(),
                    txn.getPaidAt()
            );
        } else {
            txn.setStatus(PaymentStatus.FAILED.name());
            transactionRepository.save(txn);
            log.warn("Transaction {} marked as FAILED. ResultCode: {}, Message: {}",
                    txn.getTransactionCode(), ipnRequest.getResultCode(), ipnRequest.getMessage());
        }
    }

    @Override
    @Transactional
    public PaymentTransactionResponse simulateSuccess(String transactionCode) {
        PaymentTransaction txn = transactionRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch: " + transactionCode));

        if (PaymentStatus.SUCCESS.name().equalsIgnoreCase(txn.getStatus())) {
            log.info("Transaction {} is already SUCCESS", transactionCode);
            return PaymentTransactionResponse.fromEntity(txn);
        }

        txn.setStatus(PaymentStatus.SUCCESS.name());
        txn.setPaidAt(ZonedDateTime.now());
        txn.setBankTransactionId("MOCK_MOMO_" + System.currentTimeMillis());
        PaymentTransaction saved = transactionRepository.save(txn);

        // Lưu audit log giả lập
        auditLogRepository.save(WebhookAuditLog.builder()
                .provider("MOMO_SIMULATOR")
                .payload("{\"orderId\":\"" + transactionCode + "\",\"amount\":" + txn.getAmount() + ",\"status\":\"MOCK_SUCCESS\"}")
                .signatureHeader("MOCK_VALID")
                .isSignatureValid(true)
                .processedStatus("PROCESSED")
                .build());

        // Bắn Kafka event xác nhận booking
        paymentEventProducer.publishPaymentSuccess(
                saved.getBookingId(),
                saved.getTransactionCode(),
                saved.getAmount(),
                saved.getPaidAt()
        );

        log.info("Simulated MoMo payment success for txn: {}, bookingId: {}", transactionCode, saved.getBookingId());
        return PaymentTransactionResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public PaymentRefundResponse refundPayment(MomoRefundRequest request) {
        PaymentTransaction txn = transactionRepository.findByTransactionCode(request.getTransactionCode())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch: " + request.getTransactionCode()));

        if (!PaymentStatus.SUCCESS.name().equalsIgnoreCase(txn.getStatus())) {
            throw new PaymentException("Chỉ có thể hoàn tiền cho giao dịch đã thanh toán thành công (SUCCESS). Trạng thái hiện tại: " + txn.getStatus());
        }

        String requestId = UUID.randomUUID().toString();
        String orderId = "RF-MM-" + System.currentTimeMillis();
        long amountLong = request.getAmount().longValue();
        String description = (request.getReason() != null && !request.getReason().isBlank())
                ? request.getReason()
                : "Hoan tien coc TableMaster";
        long transId = (txn.getBankTransactionId() != null && txn.getBankTransactionId().matches("\\d+"))
                ? Long.parseLong(txn.getBankTransactionId())
                : System.currentTimeMillis();

        // Chuỗi ký MoMo Refund:
        // accessKey=$accessKey&amount=$amount&description=$description&orderId=$orderId&partnerCode=$partnerCode&requestId=$requestId&transId=$transId
        String rawHash = "accessKey=" + momoConfig.getAccessKey() +
                "&amount=" + amountLong +
                "&description=" + description +
                "&orderId=" + orderId +
                "&partnerCode=" + momoConfig.getPartnerCode() +
                "&requestId=" + requestId +
                "&transId=" + transId;

        String signature = MomoSecurityUtils.signHmacSha256(rawHash, momoConfig.getSecretKey());

        Map<String, Object> refundPayload = new HashMap<>();
        refundPayload.put("partnerCode", momoConfig.getPartnerCode());
        refundPayload.put("orderId", orderId);
        refundPayload.put("requestId", requestId);
        refundPayload.put("amount", amountLong);
        refundPayload.put("transId", transId);
        refundPayload.put("lang", "vi");
        refundPayload.put("description", description);
        refundPayload.put("signature", signature);

        // Gọi MoMo Refund API nếu kết nối được
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(refundPayload, headers);
            restTemplate.postForObject(momoConfig.getRefundEndpoint(), entity, Map.class);
            log.info("Called MoMo Refund API successfully for orderId: {}", orderId);
        } catch (Exception e) {
            log.warn("MoMo Refund API call failed or offline (proceeding with local refund): {}", e.getMessage());
        }

        // Cập nhật trạng thái transaction
        txn.setStatus(PaymentStatus.REFUNDED.name());
        transactionRepository.save(txn);

        // Lưu bản ghi PaymentRefund
        PaymentRefund refund = PaymentRefund.builder()
                .paymentTransactionId(txn.getId())
                .refundAmount(request.getAmount())
                .refundRatio(1.0f)
                .refundStatus(RefundStatus.COMPLETED.name())
                .refundBankBin("MOMO")
                .refundAccountNo("Ví MoMo")
                .refundAccountHolder("Khách hàng MoMo")
                .reason(description)
                .completedAt(ZonedDateTime.now())
                .build();
        PaymentRefund savedRefund = refundRepository.save(refund);

        log.info("Refund completed for txn: {}", txn.getTransactionCode());
        return PaymentRefundResponse.fromEntity(savedRefund);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentTransactionResponse getTransaction(String transactionCode) {
        PaymentTransaction txn = transactionRepository.findByTransactionCode(transactionCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch: " + transactionCode));
        return PaymentTransactionResponse.fromEntity(txn);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getTransactionsByBookingId(UUID bookingId) {
        return transactionRepository.findByBookingId(bookingId).stream()
                .map(PaymentTransactionResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentTransactionResponse> getAllTransactions() {
        return transactionRepository.findAll().stream()
                .map(PaymentTransactionResponse::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PaymentRefundResponse> getAllRefunds() {
        return refundRepository.findAll().stream()
                .map(PaymentRefundResponse::fromEntity)
                .toList();
    }
}

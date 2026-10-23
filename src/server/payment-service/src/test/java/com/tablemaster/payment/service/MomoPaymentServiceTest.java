package com.tablemaster.payment.service;

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
import com.tablemaster.payment.enums.PaymentStatus;
import com.tablemaster.payment.kafka.PaymentEventProducer;
import com.tablemaster.payment.repository.PaymentRefundRepository;
import com.tablemaster.payment.repository.PaymentTransactionRepository;
import com.tablemaster.payment.repository.WebhookAuditLogRepository;
import com.tablemaster.payment.service.impl.MomoPaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MomoPaymentServiceTest {

    @Mock
    private MomoConfig momoConfig;

    @Mock
    private RestTemplate restTemplate;

    @Mock
    private ObjectMapper objectMapper;

    @Mock
    private PaymentTransactionRepository transactionRepository;

    @Mock
    private PaymentRefundRepository refundRepository;

    @Mock
    private WebhookAuditLogRepository auditLogRepository;

    @Mock
    private PaymentEventProducer paymentEventProducer;

    @InjectMocks
    private MomoPaymentServiceImpl momoPaymentService;

    private UUID sampleBookingId;
    private UUID sampleUserId;

    @BeforeEach
    void setUp() {
        sampleBookingId = UUID.randomUUID();
        sampleUserId = UUID.randomUUID();
    }

    @Test
    void testCreatePayment_Success() {
        when(momoConfig.getAccessKey()).thenReturn("F8BBA842ECF85");
        when(momoConfig.getSecretKey()).thenReturn("K951B6PE1waDMi640xX0qPDpB2DA150");
        when(momoConfig.getPartnerCode()).thenReturn("MOMO");
        when(momoConfig.getRequestType()).thenReturn("captureWallet");
        when(momoConfig.getRedirectUrl()).thenReturn("http://localhost:5173/payment/result");
        when(momoConfig.getIpnUrl()).thenReturn("http://localhost:8080/api/v1/payments/momo/ipn");

        CreateMomoPaymentRequest request = CreateMomoPaymentRequest.builder()
                .bookingId(sampleBookingId)
                .userId(sampleUserId)
                .amount(BigDecimal.valueOf(200000))
                .orderInfo("Dat coc ban TableMaster")
                .build();

        MomoPaymentResponse response = momoPaymentService.createPayment(request);

        assertNotNull(response);
        assertNotNull(response.getOrderId());
        assertEquals(BigDecimal.valueOf(200000), response.getAmount());
        assertEquals(sampleBookingId, response.getBookingId());
        verify(transactionRepository, times(1)).save(any(PaymentTransaction.class));
    }

    @Test
    void testSimulateSuccess_UpdatesStatusAndPublishesKafka() {
        String txCode = "TXN-MM-123456789";
        PaymentTransaction txn = PaymentTransaction.builder()
                .transactionCode(txCode)
                .bookingId(sampleBookingId)
                .userId(sampleUserId)
                .amount(BigDecimal.valueOf(150000))
                .status(PaymentStatus.PENDING.name())
                .build();

        when(transactionRepository.findByTransactionCode(txCode)).thenReturn(Optional.of(txn));
        when(transactionRepository.save(any(PaymentTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentTransactionResponse response = momoPaymentService.simulateSuccess(txCode);

        assertNotNull(response);
        assertEquals(PaymentStatus.SUCCESS.name(), response.getStatus());
        assertNotNull(response.getBankTransactionId());
        verify(paymentEventProducer, times(1)).publishPaymentSuccess(eq(sampleBookingId), eq(txCode), any(), any());
        verify(auditLogRepository, times(1)).save(any(WebhookAuditLog.class));
    }

    @Test
    void testRefundPayment_Success() {
        String txCode = "TXN-MM-999999";
        PaymentTransaction txn = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .transactionCode(txCode)
                .bookingId(sampleBookingId)
                .userId(sampleUserId)
                .amount(BigDecimal.valueOf(200000))
                .bankTransactionId("12345678")
                .status(PaymentStatus.SUCCESS.name())
                .build();

        when(transactionRepository.findByTransactionCode(txCode)).thenReturn(Optional.of(txn));
        when(momoConfig.getAccessKey()).thenReturn("F8BBA842ECF85");
        when(momoConfig.getSecretKey()).thenReturn("K951B6PE1waDMi640xX0qPDpB2DA150");
        when(momoConfig.getPartnerCode()).thenReturn("MOMO");
        when(refundRepository.save(any(PaymentRefund.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MomoRefundRequest refundRequest = MomoRefundRequest.builder()
                .transactionCode(txCode)
                .amount(BigDecimal.valueOf(200000))
                .reason("Khach bao huy truoc 8 tieng")
                .build();

        PaymentRefundResponse refundResponse = momoPaymentService.refundPayment(refundRequest);

        assertNotNull(refundResponse);
        assertEquals(BigDecimal.valueOf(200000), refundResponse.getRefundAmount());
        assertEquals(PaymentStatus.REFUNDED.name(), txn.getStatus());
        verify(transactionRepository, times(1)).save(txn);
        verify(refundRepository, times(1)).save(any(PaymentRefund.class));
    }
}

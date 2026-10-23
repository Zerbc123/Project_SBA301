package com.tablemaster.payment.controller;

import com.tablemaster.payment.dto.request.CreateMomoPaymentRequest;
import com.tablemaster.payment.dto.request.MomoIpnRequest;
import com.tablemaster.payment.dto.request.MomoRefundRequest;
import com.tablemaster.payment.dto.response.ApiResponse;
import com.tablemaster.payment.dto.response.MomoPaymentResponse;
import com.tablemaster.payment.dto.response.PaymentRefundResponse;
import com.tablemaster.payment.dto.response.PaymentTransactionResponse;
import com.tablemaster.payment.service.MomoPaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final MomoPaymentService momoPaymentService;

    /**
     * POST /api/v1/payments/momo/create
     * Khởi tạo giao dịch thanh toán cọc qua MoMo All-in-One (trả về payUrl, deeplink, qrCodeUrl)
     */
    @PostMapping("/momo/create")
    public ResponseEntity<ApiResponse<MomoPaymentResponse>> createMomoPayment(
            @Valid @RequestBody CreateMomoPaymentRequest request) {
        log.info("Received request to create MoMo payment for bookingId: {}, amount: {}",
                request.getBookingId(), request.getAmount());
        MomoPaymentResponse response = momoPaymentService.createPayment(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Khởi tạo thanh toán MoMo thành công", response));
    }

    /**
     * POST /api/v1/payments/momo/ipn
     * Webhook IPN nhận kết quả thanh toán từ MoMo
     */
    @PostMapping("/momo/ipn")
    public ResponseEntity<Void> handleMomoIpn(@RequestBody MomoIpnRequest ipnRequest) {
        log.info("Received MoMo IPN callback for orderId: {}", ipnRequest.getOrderId());
        momoPaymentService.processIpn(ipnRequest);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/v1/payments/momo/mock-ipn/{transactionCode}
     * Giả lập thanh toán MoMo thành công ngay lập tức (dành cho kiểm thử và demo đồ án)
     */
    @PostMapping("/momo/mock-ipn/{transactionCode}")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> simulateSuccess(
            @PathVariable String transactionCode) {
        log.info("Simulating payment success for transactionCode: {}", transactionCode);
        PaymentTransactionResponse response = momoPaymentService.simulateSuccess(transactionCode);
        return ResponseEntity.ok(ApiResponse.success("Giả lập thanh toán thành công và đã kích hoạt vé qua Kafka", response));
    }

    /**
     * POST /api/v1/payments/momo/refund
     * Yêu cầu hoàn tiền cọc qua MoMo khi hủy bàn hợp lệ
     */
    @PostMapping("/momo/refund")
    public ResponseEntity<ApiResponse<PaymentRefundResponse>> refundMomoPayment(
            @Valid @RequestBody MomoRefundRequest request) {
        log.info("Processing MoMo refund for txn: {}, amount: {}", request.getTransactionCode(), request.getAmount());
        PaymentRefundResponse response = momoPaymentService.refundPayment(request);
        return ResponseEntity.ok(ApiResponse.success("Hoàn tiền MoMo thành công", response));
    }

    /**
     * GET /api/v1/payments/momo/{transactionCode}
     * Tra cứu trạng thái giao dịch
     */
    @GetMapping("/momo/{transactionCode}")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> getTransaction(
            @PathVariable String transactionCode) {
        PaymentTransactionResponse response = momoPaymentService.getTransaction(transactionCode);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/v1/payments/by-booking/{bookingId}
     * Lấy các giao dịch thanh toán của một đơn đặt bàn
     */
    @GetMapping("/by-booking/{bookingId}")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getTransactionsByBooking(
            @PathVariable UUID bookingId) {
        List<PaymentTransactionResponse> response = momoPaymentService.getTransactionsByBookingId(bookingId);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/v1/payments/transactions
     * Danh sách tất cả các giao dịch thanh toán
     */
    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<List<PaymentTransactionResponse>>> getAllTransactions() {
        List<PaymentTransactionResponse> response = momoPaymentService.getAllTransactions();
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/v1/payments/refunds
     * Danh sách các yêu cầu hoàn tiền
     */
    @GetMapping("/refunds")
    public ResponseEntity<ApiResponse<List<PaymentRefundResponse>>> getAllRefunds() {
        List<PaymentRefundResponse> response = momoPaymentService.getAllRefunds();
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

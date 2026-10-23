package com.tablemaster.payment.service;

import com.tablemaster.payment.dto.request.CreateMomoPaymentRequest;
import com.tablemaster.payment.dto.request.MomoIpnRequest;
import com.tablemaster.payment.dto.request.MomoRefundRequest;
import com.tablemaster.payment.dto.response.MomoPaymentResponse;
import com.tablemaster.payment.dto.response.PaymentRefundResponse;
import com.tablemaster.payment.dto.response.PaymentTransactionResponse;

import java.util.List;
import java.util.UUID;

public interface MomoPaymentService {

    /**
     * Tạo yêu cầu thanh toán cọc qua cổng MoMo (sinh payUrl, qrCodeUrl, deeplink)
     */
    MomoPaymentResponse createPayment(CreateMomoPaymentRequest request);

    /**
     * Tiếp nhận và xử lý Webhook IPN từ MoMo
     */
    void processIpn(MomoIpnRequest ipnRequest);

    /**
     * Giả lập thanh toán MoMo thành công (dành cho môi trường test/demo giảng viên)
     */
    PaymentTransactionResponse simulateSuccess(String transactionCode);

    /**
     * Hoàn tiền cọc MoMo khi khách hủy bàn hợp lệ
     */
    PaymentRefundResponse refundPayment(MomoRefundRequest request);

    /**
     * Tra cứu thông tin giao dịch theo transactionCode
     */
    PaymentTransactionResponse getTransaction(String transactionCode);

    /**
     * Tra cứu giao dịch theo bookingId
     */
    List<PaymentTransactionResponse> getTransactionsByBookingId(UUID bookingId);

    /**
     * Lấy danh sách tất cả các giao dịch thanh toán
     */
    List<PaymentTransactionResponse> getAllTransactions();

    /**
     * Lấy danh sách các yêu cầu hoàn tiền
     */
    List<PaymentRefundResponse> getAllRefunds();
}

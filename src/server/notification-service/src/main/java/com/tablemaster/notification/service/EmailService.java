package com.tablemaster.notification.service;

import com.tablemaster.notification.dto.NotificationEmailPayload;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender javaMailSender;

    @Value("${spring.mail.username:nhatduy160205@gmail.com}")
    private String senderEmail;

    @Value("${spring.mail.password:}")
    private String senderPassword;

    @Value("${notification.email.sender-name:Le Prime Bistro & Lounge}")
    private String senderName;

    @Value("${notification.email.simulation-mode:auto}")
    private String simulationMode;

    /**
     * Tự động điều hướng gửi Email phù hợp theo trạng thái đơn:
     * - AWAITING_PAYMENT: Gửi thông báo Lễ tân duyệt đơn kèm Link & Mã QR VietQR thanh toán cọc
     * - CONFIRMED: Gửi Vé điện tử E-Ticket kèm mã QR check-in 64 ký tự
     */
    public boolean sendBookingEmail(NotificationEmailPayload payload) {
        String status = payload.getStatus() != null ? payload.getStatus().toUpperCase() : "CONFIRMED";
        if ("AWAITING_PAYMENT".equals(status) || "PENDING_DEPOSIT".equals(status)) {
            return sendDepositPaymentRequestEmail(payload);
        } else {
            return sendBookingConfirmationEmail(payload);
        }
    }

    /**
     * BƯỚC 1: Gửi Email Yêu Cầu Thanh Toán Tiền Cọc (Sau khi Lễ tân tư vấn và chốt cọc)
     */
    public boolean sendDepositPaymentRequestEmail(NotificationEmailPayload payload) {
        String targetEmail = getTargetEmail(payload);
        if (targetEmail == null) return false;

        String subject = String.format("[Le Prime Bistro] Yêu Cầu Thanh Toán Tiền Cọc Giữ Bàn #%s",
                payload.getBookingCode() != null ? payload.getBookingCode() : payload.getBookingId());

        String htmlContent = buildDepositPaymentRequestHtml(payload);
        return dispatchEmail(targetEmail, subject, htmlContent, payload.getBookingCode(), "YÊU CẦU CỌC (AWAITING_PAYMENT)");
    }

    /**
     * BƯỚC 2: Gửi Email Vé Điện Tử Check-in (Sau khi khách đã thanh toán cọc thành công)
     */
    public boolean sendBookingConfirmationEmail(NotificationEmailPayload payload) {
        String targetEmail = getTargetEmail(payload);
        if (targetEmail == null) return false;

        String subject = String.format("[Le Prime Bistro] Xác Nhận Giữ Bàn & Vé Điện Tử Check-in #%s",
                payload.getBookingCode() != null ? payload.getBookingCode() : payload.getBookingId());

        String htmlContent = buildETicketHtml(payload);
        return dispatchEmail(targetEmail, subject, htmlContent, payload.getBookingCode(), "VÉ ĐIỆN TỬ CHECK-IN (CONFIRMED)");
    }

    private String getTargetEmail(NotificationEmailPayload payload) {
        String targetEmail = payload.getRecipientEmail() != null && !payload.getRecipientEmail().isEmpty()
                ? payload.getRecipientEmail()
                : payload.getGuestEmail();

        if (targetEmail == null || targetEmail.trim().isEmpty()) {
            log.warn("Không tìm thấy địa chỉ email người nhận cho đơn: {}", payload.getBookingCode());
            return null;
        }
        return targetEmail.trim();
    }

    private boolean dispatchEmail(String targetEmail, String subject, String htmlContent, String bookingCode, String typeLabel) {
        boolean isPasswordMissing = senderPassword == null || senderPassword.trim().isEmpty();
        boolean isSimulation = "always".equalsIgnoreCase(simulationMode) ||
                ("auto".equalsIgnoreCase(simulationMode) && isPasswordMissing);

        if (isSimulation) {
            log.info("================================================================================");
            log.info("⚡ [EMAIL SIMULATION] Gửi email giả lập ({})", typeLabel);
            log.info("Gửi từ: {} <{}>", senderName, senderEmail);
            log.info("Gửi tới: {}", targetEmail);
            log.info("Tiêu đề: {}", subject);
            log.info("Mã đơn: {}", bookingCode);
            log.info("================================================================================");
            return true;
        }

        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());

            helper.setFrom(senderEmail, senderName);
            helper.setTo(targetEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            javaMailSender.send(message);
            log.info("✅ Đã gửi thành công Email [{}] tới hộp thư: {}", typeLabel, targetEmail);
            return true;
        } catch (Exception e) {
            log.error("❌ Lỗi khi gửi Email thực tế qua SMTP tới [{}]: {}", targetEmail, e.getMessage());
            return false;
        }
    }

    /**
     * HTML Template 1: Thông báo Lễ tân duyệt đơn, kèm link thanh toán & mã VietQR cọc tiền
     */
    private String buildDepositPaymentRequestHtml(NotificationEmailPayload b) {
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        BigDecimal deposit = b.getTotalDeposit() != null && b.getTotalDeposit().compareTo(BigDecimal.ZERO) > 0
                ? b.getTotalDeposit() : BigDecimal.valueOf(200000);
        String depositFormatted = currencyFormat.format(deposit);

        String code = b.getBookingCode() != null ? b.getBookingCode() : (b.getBookingId() != null ? b.getBookingId() : "LPB");
        String memo = "TM " + code;
        String encodedMemo = URLEncoder.encode(memo, StandardCharsets.UTF_8);

        // Sinh link ảnh VietQR Napas 24/7 cọc tiền
        String vietqrUrl = String.format("https://img.vietqr.io/image/970422-0909888999-compact2.png?amount=%s&addInfo=%s&accountName=LE%%20PRIME%%20BISTRO",
                deposit.toPlainString(), encodedMemo);

        // Đường link thanh toán trực tiếp trên website
        String paymentWebUrl = "http://localhost:5173/?bookingId=" + code + "&action=pay-deposit";

        return "<!DOCTYPE html>"
                + "<html lang='vi'>"
                + "<head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'><meta charset='UTF-8'><title>Yêu Cầu Thanh Toán Tiền Cọc</title></head>"
                + "<body style='margin: 0; padding: 30px 10px; background-color: #F5EFEB; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #2C221E;'>"
                + "<div style='max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #E8DFD1;'>"
                // Header
                + "<div style='background: linear-gradient(135deg, #1C1917 0%, #292524 100%); padding: 35px 30px; text-align: center; color: #FAF7F2;'>"
                + "<h1 style='margin: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; font-size: 26px; font-weight: bold; letter-spacing: 2px; color: #D4AF37;'>LE PRIME BISTRO & LOUNGE</h1>"
                + "<p style='margin: 6px 0 0 0; font-size: 12px; color: #A8A29E; letter-spacing: 1px; text-transform: uppercase;'>Hệ Thống Điều Phối &amp; Ẩm Thực Tinh Hoa</p>"
                + "</div>"
                // Content Body
                + "<div style='padding: 35px 30px;'>"
                + "<div style='text-align: center; margin-bottom: 20px;'>"
                + "<span style='display: inline-block; background-color: #EFF6FF; color: #1D4ED8; font-size: 11px; font-weight: bold; padding: 6px 16px; border-radius: 50px; border: 1px solid #BFDBFE; text-transform: uppercase;'>📞 LỄ TÂN ĐÃ DUYỆT ĐƠN - CHỜ THANH TOÁN CỌC</span>"
                + "<h2 style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: bold; color: #1C1917; margin: 15px 0 5px 0;'>Yêu Cầu Nạp Tiền Cọc Giữ Bàn</h2>"
                + "<p style='margin: 0; font-size: 13px; color: #78716C;'>Kính gửi Quý khách <strong>" + (b.getGuestName() != null ? b.getGuestName() : "Quý Khách") + "</strong>, Lễ tân Le Prime Bistro đã gọi điện tư vấn và xác nhận bàn cho Quý khách. Vui lòng thanh toán khoản cọc bên dưới để hoàn tất việc giữ chỗ.</p>"
                + "</div>"
                // Booking Code Box (To, nổi bật)
                + "<div style='background-color: #FAF7F2; border: 1.5px dashed #8C6A43; border-radius: 16px; padding: 15px 20px; text-align: center; margin: 20px 0;'>"
                + "<span style='font-size: 11px; font-weight: bold; color: #78716C; text-transform: uppercase;'>MÃ ĐƠN ĐẶT BÀN / TRA CỨU TẠI QUẦY</span>"
                + "<div style='font-family: monospace, Courier; font-size: 24px; font-weight: 900; color: #8C6A43; letter-spacing: 2px; margin-top: 4px;'>#" + code + "</div>"
                + "<p style='margin: 4px 0 0 0; font-size: 11px; color: #78716C;'>Nhân viên có thể nhập mã này trên Host Tablet để tra cứu thông tin đặt bàn</p>"
                + "</div>"
                // Booking Summary Table
                + "<table style='width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0; background: #FAF7F2; border-radius: 16px; padding: 15px; border: 1px solid #E8DFD1;'>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 10px 14px; color: #78716C;'>Khách hàng:</td><td style='padding: 10px 14px; text-align: right; font-weight: bold; color: #1C1917;'>" + (b.getGuestName() != null ? b.getGuestName() : "Quý Khách") + " (" + (b.getGuestPhone() != null ? b.getGuestPhone() : "") + ")</td></tr>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 10px 14px; color: #78716C;'>Ngày dùng bữa:</td><td style='padding: 10px 14px; text-align: right; font-weight: bold; color: #1C1917;'>" + (b.getBookingDate() != null ? b.getBookingDate() : "Hôm nay") + "</td></tr>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 10px 14px; color: #78716C;'>Số khách:</td><td style='padding: 10px 14px; text-align: right; font-weight: bold; color: #1C1917;'>" + (b.getGuestCount() != null ? b.getGuestCount() : 2) + " Khách</td></tr>"
                + "<tr><td style='padding: 10px 14px; color: #78716C;'>Vị trí phân khu:</td><td style='padding: 10px 14px; text-align: right; font-weight: bold; color: #8C6A43;'>Sảnh Chính / VIP Cellar (Tầng 1 - 2)</td></tr>"
                + "</table>"
                // Highlight Amount Box
                + "<div style='background: linear-gradient(135deg, #FAF4EB 0%, #F5ECE0 100%); border: 2px solid #C4A480; border-radius: 20px; padding: 22px 20px; text-align: center; margin: 20px 0;'>"
                + "<span style='font-size: 11px; font-weight: bold; color: #8C6A43; text-transform: uppercase;'>SỐ TIỀN CỌC CẦN THANH TOÁN (100% TRỪ VÀO BILL)</span>"
                + "<h3 style='margin: 8px 0 4px 0; font-size: 32px; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; font-weight: bold; color: #8C6A43;'>" + depositFormatted + "</h3>"
                + "<p style='margin: 0; font-size: 12px; color: #78716C;'>Hạn chót thanh toán: <strong>Trong vòng 2 giờ</strong></p>"
                + "</div>"
                // VietQR Code Box
                + "<div style='text-align: center; background-color: #FAF7F2; border: 1px solid #E8DFD1; border-radius: 20px; padding: 25px 20px; margin: 25px 0;'>"
                + "<p style='margin: 0 0 12px 0; font-size: 11px; font-weight: bold; color: #8C6A43; text-transform: uppercase; letter-spacing: 1px;'>QUÉT MÃ VIETQR QUA APP NGÂN HÀNG (NAPAS 24/7)</p>"
                + "<img src='" + vietqrUrl + "' alt='VietQR Cọc Giữ Bàn' style='width: 210px; height: auto; border-radius: 12px; border: 1px solid #E8DFD1; background: #FFF; padding: 8px;' />"
                + "<p style='margin: 12px 0 0 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #1C1917;'>Nội dung chuyển khoản: <span style='color: #8C6A43; background: #FAF4EB; padding: 2px 8px; border-radius: 6px; border: 1px solid #C4A480;'>" + memo + "</span></p>"
                + "<p style='margin: 6px 0 0 0; font-size: 11px; color: #78716C;'>Ngân hàng Quân Đội (MBBank) • STK: 0909888999 • Le Prime Bistro</p>"
                + "</div>"
                // Direct Link Button
                + "<div style='text-align: center; margin: 25px 0;'>"
                + "<a href='" + paymentWebUrl + "' style='display: inline-block; background: linear-gradient(135deg, #C4A480 0%, #8C6A43 100%); color: #FFFFFF; font-weight: bold; font-size: 13px; text-decoration: none; padding: 14px 28px; border-radius: 14px; box-shadow: 0 6px 20px rgba(140,106,67,0.3); text-transform: uppercase; letter-spacing: 0.5px;'>👉 Bấm Vào Đây Để Mở Cổng Thanh Toán (VietQR / MoMo)</a>"
                + "</div>"
                // Policy Note
                + "<div style='margin-top: 25px; padding: 14px 16px; background-color: #F8FAFC; border-radius: 12px; font-size: 11px; color: #64748B; line-height: 1.6; border-left: 3px solid #8C6A43;'>"
                + "<strong>Chính sách cọc BR-04:</strong> Sau khi quý khách hoàn tất chuyển khoản, hệ thống sẽ tự động xác nhận đơn ngay lập tức và phát hành Vé điện tử kèm mã QR check-in vào email này."
                + "</div>"
                + "</div>"
                // Footer
                + "<div style='background-color: #FAF7F2; padding: 25px 30px; text-align: center; border-top: 1px solid #E8DFD1; font-size: 12px; color: #78716C;'>"
                + "<p style='margin: 0 0 6px 0; font-weight: bold; color: #2C221E;'>LE PRIME BISTRO &amp; LOUNGE SAIGON</p>"
                + "<p style='margin: 0 0 4px 0;'>68 Đại lộ Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</p>"
                + "<p style='margin: 0;'>Hotline Hỗ Trợ 24/7: <strong style='color: #8C6A43;'>028 3822 8899</strong></p>"
                + "</div>"
                + "</div>"
                + "</body></html>";
    }

    /**
     * HTML Template 2: Vé điện tử E-Ticket khi đã cọc thành công (CONFIRMED)
     */
    private String buildETicketHtml(NotificationEmailPayload b) {
        NumberFormat currencyFormat = NumberFormat.getCurrencyInstance(new Locale("vi", "VN"));
        String depositFormatted = b.getTotalDeposit() != null
                ? currencyFormat.format(b.getTotalDeposit())
                : "200.000 đ";

        String code = b.getBookingCode() != null ? b.getBookingCode() : (b.getBookingId() != null ? b.getBookingId() : "LPB-CONFIRMED");
        String qrToken = b.getCheckinQrToken() != null && !b.getCheckinQrToken().isEmpty()
                ? b.getCheckinQrToken()
                : code;

        String qrImageUrl = "https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=" + qrToken;

        return "<!DOCTYPE html>"
                + "<html lang='vi'>"
                + "<head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'><meta charset='UTF-8'><title>Vé Điện Tử Check-in Le Prime</title></head>"
                + "<body style='margin: 0; padding: 30px 10px; background-color: #F5EFEB; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; color: #2C221E;'>"
                + "<div style='max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #E8DFD1;'>"
                + "<div style='background: linear-gradient(135deg, #1C1917 0%, #292524 100%); padding: 35px 30px; text-align: center; color: #FAF7F2;'>"
                + "<h1 style='margin: 0; font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif; font-size: 26px; font-weight: bold; letter-spacing: 2px; color: #D4AF37;'>LE PRIME BISTRO & LOUNGE</h1>"
                + "<p style='margin: 6px 0 0 0; font-size: 12px; color: #A8A29E; letter-spacing: 1px; text-transform: uppercase;'>Hệ Thống Đặt Bàn &amp; Ẩm Thực Tinh Hoa</p>"
                + "</div>"
                + "<div style='padding: 35px 30px;'>"
                + "<div style='text-align: center; margin-bottom: 20px;'>"
                + "<span style='display: inline-block; background-color: #ECFDF5; color: #047857; font-size: 11px; font-weight: bold; padding: 6px 16px; border-radius: 50px; border: 1px solid #A7F3D0; text-transform: uppercase;'>✓ ĐÃ XÁC NHẬN CỌC GIỮ BÀN THÀNH CÔNG</span>"
                + "<h2 style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: bold; color: #1C1917; margin: 15px 0 5px 0;'>Vé Điện Tử Check-in (E-Ticket)</h2>"
                + "<p style='margin: 0; font-size: 13px; color: #78716C;'>Kính gửi Quý khách <strong>" + (b.getGuestName() != null ? b.getGuestName() : "Quý Khách") + "</strong>, khoản cọc đã được ghi nhận. Bàn ăn và dịch vụ của Quý khách đã sẵn sàng được đón tiếp.</p>"
                + "</div>"
                // Booking Code Box (To, nổi bật nhất để nhân viên / khách nhập)
                + "<div style='background: linear-gradient(135deg, #FAF4EB 0%, #F5ECE0 100%); border: 2px solid #C4A480; border-radius: 20px; padding: 20px; text-align: center; margin: 20px 0; box-shadow: inset 0 2px 6px rgba(0,0,0,0.02);'>"
                + "<div style='font-size: 11px; font-weight: bold; color: #8C6A43; text-transform: uppercase; letter-spacing: 1.5px;'>MÃ ĐƠN ĐẶT BÀN / MÃ VÉ CHECK-IN</div>"
                + "<div style='font-family: monospace, Courier; font-size: 30px; font-weight: 900; color: #2C221E; letter-spacing: 3px; margin: 6px 0;'>" + code + "</div>"
                + "<p style='margin: 0; font-size: 12px; color: #78716C;'>Lễ tân có thể <strong>quét mã QR</strong> hoặc <strong>gõ mã #" + code + "</strong> trên Host Tablet để nhận bàn</p>"
                + "</div>"
                // QR Box
                + "<div style='text-align: center; background-color: #FAF7F2; border: 1px solid #E8DFD1; border-radius: 20px; padding: 25px 20px; margin: 20px 0;'>"
                + "<p style='margin: 0 0 12px 0; font-size: 11px; font-weight: bold; color: #8C6A43; text-transform: uppercase; letter-spacing: 1px;'>MÃ QR CHECK-IN TẠI QUẦY LỄ TÂN</p>"
                + "<img src='" + qrImageUrl + "' alt='Mã QR Check-in' style='width: 200px; height: 200px; border-radius: 14px; border: 1px solid #E8DFD1; background: #FFF; padding: 8px;' />"
                + "<p style='margin: 10px 0 0 0; font-size: 11px; color: #78716C;'>Mã QR bảo mật động 64 ký tự chống giả mạo (UC-12)</p>"
                + "</div>"
                // Booking Details Table
                + "<table style='width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 20px; background: #FAF7F2; border-radius: 16px; border: 1px solid #E8DFD1;'>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 11px 16px; color: #78716C;'>Khách hàng:</td><td style='padding: 11px 16px; text-align: right; font-weight: bold; color: #1C1917;'>" + (b.getGuestName() != null ? b.getGuestName() : "Quý Khách") + " (" + (b.getGuestPhone() != null ? b.getGuestPhone() : "") + ")</td></tr>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 11px 16px; color: #78716C;'>Ngày dùng bữa:</td><td style='padding: 11px 16px; text-align: right; font-weight: bold; color: #1C1917;'>" + (b.getBookingDate() != null ? b.getBookingDate() : "Hôm nay") + "</td></tr>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 11px 16px; color: #78716C;'>Thời gian đón khách:</td><td style='padding: 11px 16px; text-align: right; font-weight: bold; color: #1C1917;'>19:00 - 21:00</td></tr>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 11px 16px; color: #78716C;'>Số lượng thực khách:</td><td style='padding: 11px 16px; text-align: right; font-weight: bold; color: #1C1917;'>" + (b.getGuestCount() != null ? b.getGuestCount() : 2) + " Khách</td></tr>"
                + "<tr style='border-bottom: 1px solid #E8DFD1;'><td style='padding: 11px 16px; color: #78716C;'>Vị trí phân khu:</td><td style='padding: 11px 16px; text-align: right; font-weight: bold; color: #8C6A43;'>Bàn đã cọc giữ chỗ (Tầng 1 - Sảnh Nguyễn Huệ)</td></tr>"
                + "<tr><td style='padding: 13px 16px; color: #047857; font-weight: bold;'>Tiền cọc giữ chỗ đã nạp:</td><td style='padding: 13px 16px; text-align: right; font-size: 16px; font-weight: bold; color: #8C6A43;'>" + depositFormatted + "</td></tr>"
                + "</table>"
                + "<div style='margin-top: 20px; padding: 12px 16px; background-color: #F0FDF4; border-radius: 12px; font-size: 11px; color: #166534; line-height: 1.5; border: 1px solid #BBF7D0;'>"
                + "💰 <strong>Lưu ý:</strong> Toàn bộ 100% số tiền cọc " + depositFormatted + " sẽ được tự động khấu trừ vào hóa đơn thanh toán cuối cùng của Quý khách."
                + "</div>"
                + "</div>"
                + "<div style='background-color: #FAF7F2; padding: 25px 30px; text-align: center; border-top: 1px solid #E8DFD1; font-size: 12px; color: #78716C;'>"
                + "<p style='margin: 0 0 6px 0; font-weight: bold; color: #2C221E;'>LE PRIME BISTRO &amp; LOUNGE SAIGON</p>"
                + "<p style='margin: 0 0 4px 0;'>68 Đại lộ Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh</p>"
                + "<p style='margin: 0;'>Hotline Hỗ Trợ 24/7: <strong style='color: #8C6A43;'>028 3822 8899</strong></p>"
                + "</div>"
                + "</div>"
                + "</body></html>";
    }
}

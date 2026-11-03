package com.tablemaster.booking.controller;

import com.tablemaster.booking.dto.request.ApproveDepositRequest;
import com.tablemaster.booking.dto.request.CheckInRequest;
import com.tablemaster.booking.dto.request.CreateBookingRequest;
import com.tablemaster.booking.dto.request.TransferTableRequest;
import com.tablemaster.booking.dto.response.ApiResponse;
import com.tablemaster.booking.dto.response.BookingResponse;
import com.tablemaster.booking.enums.BookingStatus;
import com.tablemaster.booking.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    /**
     * POST /api/v1/bookings/request
     * Khách hàng gửi yêu cầu đặt bàn trực tuyến
     */
    @PostMapping("/request")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        BookingResponse response = bookingService.createBooking(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo yêu cầu đặt bàn thành công", response));
    }

    /**
     * GET /api/v1/bookings
     * Lễ tân/Quản lý xem danh sách tất cả các đơn đặt bàn (lọc theo ngày, trạng thái)
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getAllBookings(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate bookingDate,
            @RequestParam(required = false) BookingStatus status) {
        List<BookingResponse> responses = bookingService.getAllBookings(bookingDate, status);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    /**
     * GET /api/v1/bookings/{id}
     * Xem chi tiết một đơn đặt bàn
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(@PathVariable UUID id) {
        BookingResponse response = bookingService.getBookingById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    /**
     * GET /api/v1/bookings/my-bookings
     * Khách hàng xem lịch sử các đơn đặt bàn của bản thân (UC-03)
     */
    @GetMapping("/my-bookings")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(
            @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        UUID effectiveUserId = userId != null ? userId : UUID.fromString("a0000000-0000-0000-0000-000000000005");
        List<BookingResponse> responses = bookingService.getBookingsByUserId(effectiveUserId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    /**
     * GET /api/v1/bookings/{id}/invoice-pdf
     * Tải file PDF Hóa đơn xác nhận tiền cọc đã chuyển khoản (UC-03)
     */
    @GetMapping(value = "/{id}/invoice-pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> downloadDepositInvoicePdf(@PathVariable UUID id) {
        byte[] pdfBytes = bookingService.generateDepositInvoicePdf(id);
        BookingResponse booking = bookingService.getBookingById(id);
        String filename = "Invoice-" + (booking.getBookingCode() != null ? booking.getBookingCode() : id.toString()) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }


    /**
     * POST /api/v1/bookings/{id}/approve-and-request-deposit
     * Lễ tân Telesales duyệt đơn & gửi yêu cầu cọc tiền qua VietQR
     */
    @PostMapping("/{id}/approve-and-request-deposit")
    public ResponseEntity<ApiResponse<BookingResponse>> approveAndRequestDeposit(
            @PathVariable UUID id,
            @Valid @RequestBody ApproveDepositRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID staffId) {
        BookingResponse response = bookingService.approveAndRequestDeposit(id, request, staffId);
        return ResponseEntity.ok(ApiResponse.success("Duyệt đơn và cập nhật tiền cọc thành công", response));
    }

    /**
     * POST /api/v1/bookings/{id}/confirm-payment
     * Xác nhận đơn đặt bàn đã hoàn tất thanh toán cọc (chuyển sang CONFIRMED & cấp mã QR động 64 ký tự)
     */
    @PostMapping("/{id}/confirm-payment")
    public ResponseEntity<ApiResponse<BookingResponse>> confirmBookingAfterPayment(
            @PathVariable UUID id) {
        BookingResponse response = bookingService.confirmBookingAfterPayment(id);
        return ResponseEntity.ok(ApiResponse.success("Xác nhận thanh toán cọc thành công! Đã phát hành Vé điện tử QR.", response));
    }

    /**
     * POST /api/v1/bookings/{id}/reject
     * Lễ tân từ chối đơn đặt bàn
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<BookingResponse>> rejectBooking(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) UUID staffId) {
        String reason = body.getOrDefault("reason", "Hết bàn hoặc không liên lạc được khách");
        BookingResponse response = bookingService.rejectBooking(id, reason, staffId);
        return ResponseEntity.ok(ApiResponse.success("Từ chối đơn thành công", response));
    }

    /**
     * POST /api/v1/bookings/check-in
     * Quét mã QR tại sảnh nhà hàng để xác nhận khách đã đến (SEATED)
     */
    @PostMapping("/check-in")
    public ResponseEntity<ApiResponse<BookingResponse>> checkIn(
            @Valid @RequestBody CheckInRequest request) {
        BookingResponse response = bookingService.checkIn(request);
        return ResponseEntity.ok(ApiResponse.success("Check-in thành công. Chào mừng quý khách!", response));
    }

    /**
     * POST /api/v1/bookings/{id}/complete
     * Hoàn tất dịch vụ sau khi khách thanh toán toàn bộ hóa đơn
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<BookingResponse>> completeBooking(@PathVariable UUID id) {
        BookingResponse response = bookingService.completeBooking(id);
        return ResponseEntity.ok(ApiResponse.success("Hoàn tất bữa ăn thành công", response));
    }

    /**
     * POST /api/v1/bookings/{id}/cancel
     * Hủy đơn đặt bàn
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        String reason = (body != null && body.containsKey("reason")) ? body.get("reason") : "Khách bận việc đột xuất";
        BookingResponse response = bookingService.cancelBooking(id, reason, userId);
        return ResponseEntity.ok(ApiResponse.success("Hủy đơn thành công", response));
    }

    /**
     * POST /api/v1/bookings/{id}/transfer-table
     * Chuyển đổi bàn cho khách (Đổi vị trí theo yêu cầu)
     */
    @PostMapping("/{id}/transfer-table")
    public ResponseEntity<ApiResponse<BookingResponse>> transferTable(
            @PathVariable UUID id,
            @Valid @RequestBody TransferTableRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID staffId) {
        BookingResponse response = bookingService.transferTable(id, request, staffId);
        return ResponseEntity.ok(ApiResponse.success("Chuyển bàn thành công", response));
    }

    /**
     * PUT /api/v1/bookings/{id}/special-requests
     * Cập nhật Nhu cầu đặc biệt & Ghi chú dị ứng cho đơn đặt bàn (UC-08)
     */
    @PutMapping("/{id}/special-requests")
    public ResponseEntity<ApiResponse<BookingResponse>> updateSpecialRequests(
            @PathVariable UUID id,
            @Valid @RequestBody com.tablemaster.booking.dto.request.UpdateSpecialRequestsRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID staffOrUserId) {
        BookingResponse response = bookingService.updateSpecialRequests(id, request, staffOrUserId);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật nhu cầu đặc biệt & dị ứng thành công", response));
    }

    /**
     * POST /api/v1/bookings/event-inquiry
     * Đặt tiệc Sinh nhật / Sự kiện Bao trọn tầng (Private Banquet Booking - UC-10)
     */
    @PostMapping("/event-inquiry")
    public ResponseEntity<ApiResponse<BookingResponse>> createEventInquiry(
            @Valid @RequestBody com.tablemaster.booking.dto.request.CreateEventInquiryRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID userId) {
        BookingResponse response = bookingService.createEventInquiry(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Yêu cầu đặt tiệc sự kiện đã được ghi nhận. Quản lý ca sẽ liên hệ tư vấn trong 15 phút", response));
    }

    /**
     * GET /api/v1/bookings/event-inquiries
     * Lấy danh sách các đơn đặt tiệc sự kiện đoàn đông (UC-10) cho Quản lý ca & Lễ tân
     */
    @GetMapping("/event-inquiries")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getEventInquiries() {
        List<BookingResponse> list = bookingService.getEventInquiries();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đơn tiệc sự kiện thành công", list));
    }

    /**
     * PUT /api/v1/bookings/{id}/event-consultation
     * Quản lý ca cập nhật kết quả cuộc gọi tư vấn 15 phút cho đơn sự kiện (UC-10)
     */
    @PutMapping("/{id}/event-consultation")
    public ResponseEntity<ApiResponse<BookingResponse>> updateEventConsultation(
            @PathVariable UUID id,
            @Valid @RequestBody com.tablemaster.booking.dto.request.UpdateEventConsultationRequest request,
            @RequestHeader(value = "X-User-Id", required = false) UUID managerUserId) {
        BookingResponse response = bookingService.updateEventConsultation(id, request, managerUserId);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật kết quả tư vấn sự kiện thành công", response));
    }

    // =========================================================================
    // UC-12: Nhận Vé điện tử QR Check-in (E-Ticket with Dynamic QR Code)
    // =========================================================================

    /**
     * GET /api/v1/bookings/{id}/ticket
     * Nhận vé điện tử chi tiết kèm mã QR động 64 ký tự chống giả mạo
     */
    @GetMapping("/{id}/ticket")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.ETicketResponse>> getETicket(
            @PathVariable String id) {
        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.getETicket(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin vé điện tử thành công", ticket));
    }

    /**
     * GET /api/v1/bookings/ticket/code/{bookingCode}
     * Nhận vé điện tử qua đường dẫn liên kết từ tin nhắn ZNS hoặc Email
     */
    @GetMapping("/ticket/code/{bookingCode}")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.ETicketResponse>> getETicketByCode(
            @PathVariable String bookingCode) {
        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.getETicket(bookingCode);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin vé điện tử thành công", ticket));
    }

    /**
     * POST /api/v1/bookings/{id}/ticket/refresh-qr
     * Làm mới mã QR động bảo mật (Dynamic Rotating QR Code)
     */
    @PostMapping("/{id}/ticket/refresh-qr")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.ETicketResponse>> refreshDynamicQr(
            @PathVariable String id) {
        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.refreshDynamicQrToken(id);
        return ResponseEntity.ok(ApiResponse.success("Làm mới mã QR động 64 ký tự thành công", ticket));
    }

    /**
     * POST /api/v1/bookings/ticket/verify-and-checkin
     * Quét camera / máy đọc mã QR tại cửa sảnh để xác thực và nhận bàn ngay lập tức
     */
    @PostMapping("/ticket/verify-and-checkin")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.ETicketResponse>> verifyAndCheckIn(
            @Valid @RequestBody com.tablemaster.booking.dto.request.VerifyTicketRequest request) {
        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.verifyAndCheckIn(request);
        return ResponseEntity.ok(ApiResponse.success("Xác thực vé điện tử thành công! Chào mừng quý khách.", ticket));
    }

    /**
     * POST /api/v1/bookings/{id}/ticket/send-notification
     * Kích hoạt gửi hoặc gửi lại vé điện tử qua tin nhắn ZNS hoặc Email
     */
    @PostMapping("/{id}/ticket/send-notification")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.ETicketResponse>> sendTicketNotification(
            @PathVariable String id,
            @Valid @RequestBody com.tablemaster.booking.dto.request.SendTicketNotificationRequest request) {
        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.sendTicketNotification(id, request);
        return ResponseEntity.ok(ApiResponse.success("Đã gửi vé điện tử qua kênh " + request.getChannel(), ticket));
    }

    // =========================================================================
    // UC-15: Xem Sơ đồ Sàn Live Đa tầng trên Tablet (Host Floor Live View)
    // =========================================================================

    /**
     * GET /api/v1/bookings/host/floors-live
     * Lấy dữ liệu Sơ đồ sàn Live đa tầng thời gian thực cho Tablet Lễ tân (<300ms)
     */
    @GetMapping("/host/floors-live")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.HostFloorLiveResponse>> getHostFloorsLive(
            @RequestParam(required = false) Integer floor) {
        com.tablemaster.booking.dto.response.HostFloorLiveResponse response = bookingService.getHostFloorsLive(floor);
        return ResponseEntity.ok(ApiResponse.success("Lấy sơ đồ sàn Live thành công", response));
    }

    // =========================================================================
    // UC-17: Đổi trạng thái bàn 1 chạm trên Tablet (One-touch Table Status)
    // =========================================================================

    /**
     * PATCH /api/v1/bookings/tables/{tableCode}/one-touch-status
     * Chuyển nhanh chu trình: SEATED -> CALL_BILL -> CLEANING -> AVAILABLE (<300ms)
     */
    @PatchMapping("/tables/{tableCode}/one-touch-status")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.OneTouchTableStatusResponse>> updateOneTouchTableStatusPatch(
            @PathVariable String tableCode,
            @Valid @RequestBody com.tablemaster.booking.dto.request.OneTouchTableStatusRequest request) {
        com.tablemaster.booking.dto.response.OneTouchTableStatusResponse response = bookingService.updateOneTouchTableStatus(tableCode, request);
        return ResponseEntity.ok(ApiResponse.success("Đổi trạng thái bàn 1 chạm thành công", response));
    }

    /**
     * POST /api/v1/bookings/tables/{tableCode}/one-touch-status
     * Hỗ trợ gọi POST cho các thiết bị Tablet và POS cũ
     */
    @PostMapping("/tables/{tableCode}/one-touch-status")
    public ResponseEntity<ApiResponse<com.tablemaster.booking.dto.response.OneTouchTableStatusResponse>> updateOneTouchTableStatusPost(
            @PathVariable String tableCode,
            @Valid @RequestBody com.tablemaster.booking.dto.request.OneTouchTableStatusRequest request) {
        com.tablemaster.booking.dto.response.OneTouchTableStatusResponse response = bookingService.updateOneTouchTableStatus(tableCode, request);
        return ResponseEntity.ok(ApiResponse.success("Đổi trạng thái bàn 1 chạm thành công", response));
    }
}


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
}

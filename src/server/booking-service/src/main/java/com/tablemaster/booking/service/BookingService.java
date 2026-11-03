package com.tablemaster.booking.service;

import com.tablemaster.booking.dto.request.ApproveDepositRequest;
import com.tablemaster.booking.dto.request.CheckInRequest;
import com.tablemaster.booking.dto.request.CreateBookingRequest;
import com.tablemaster.booking.dto.request.TransferTableRequest;
import com.tablemaster.booking.dto.response.BookingResponse;
import com.tablemaster.booking.enums.BookingStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface BookingService {

    BookingResponse createBooking(CreateBookingRequest request, UUID userId);

    List<BookingResponse> getAllBookings(LocalDate bookingDate, BookingStatus status);

    BookingResponse getBookingById(UUID id);

    List<BookingResponse> getBookingsByUserId(UUID userId);

    BookingResponse approveAndRequestDeposit(UUID bookingId, ApproveDepositRequest request, UUID staffId);

    BookingResponse rejectBooking(UUID bookingId, String reason, UUID staffId);

    BookingResponse confirmBookingAfterPayment(UUID bookingId);

    BookingResponse checkIn(CheckInRequest request);

    BookingResponse completeBooking(UUID bookingId);

    BookingResponse cancelBooking(UUID bookingId, String reason, UUID userId);

    BookingResponse transferTable(UUID bookingId, TransferTableRequest request, UUID staffId);

    // UC-08: Ghi chú Nhu cầu Đặc biệt & Dị ứng (Special Requests & Dietary Notes)
    BookingResponse updateSpecialRequests(UUID bookingId, com.tablemaster.booking.dto.request.UpdateSpecialRequestsRequest request, UUID staffOrUserId);

    // UC-10: Đặt tiệc Sinh nhật / Sự kiện Bao trọn tầng (Private Banquet Booking)
    BookingResponse createEventInquiry(com.tablemaster.booking.dto.request.CreateEventInquiryRequest request, UUID userId);

    List<BookingResponse> getEventInquiries();

    BookingResponse updateEventConsultation(UUID bookingId, com.tablemaster.booking.dto.request.UpdateEventConsultationRequest request, UUID managerUserId);

    // UC-12: Nhận Vé điện tử QR Check-in (E-Ticket with Dynamic QR Code)
    com.tablemaster.booking.dto.response.ETicketResponse getETicket(String bookingIdOrCode);

    com.tablemaster.booking.dto.response.ETicketResponse refreshDynamicQrToken(String bookingIdOrCode);

    com.tablemaster.booking.dto.response.ETicketResponse verifyAndCheckIn(com.tablemaster.booking.dto.request.VerifyTicketRequest request);

    com.tablemaster.booking.dto.response.ETicketResponse sendTicketNotification(String bookingIdOrCode, com.tablemaster.booking.dto.request.SendTicketNotificationRequest request);

    // UC-15: Xem Sơ đồ Sàn Live Đa tầng trên Tablet (Host Floor Live View)
    com.tablemaster.booking.dto.response.HostFloorLiveResponse getHostFloorsLive(Integer floorFilter);

    // UC-17: Đổi trạng thái bàn 1 chạm trên Tablet (One-touch Table Status)
    com.tablemaster.booking.dto.response.OneTouchTableStatusResponse updateOneTouchTableStatus(
            String tableCode,
            com.tablemaster.booking.dto.request.OneTouchTableStatusRequest request
    );

    void checkAndExpireBookings();

    byte[] generateDepositInvoicePdf(UUID bookingId);
}


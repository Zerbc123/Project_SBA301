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

    void confirmBookingAfterPayment(UUID bookingId);

    BookingResponse checkIn(CheckInRequest request);

    BookingResponse completeBooking(UUID bookingId);

    BookingResponse cancelBooking(UUID bookingId, String reason, UUID userId);

    BookingResponse transferTable(UUID bookingId, TransferTableRequest request, UUID staffId);

    void checkAndExpireBookings();

    byte[] generateDepositInvoicePdf(UUID bookingId);
}


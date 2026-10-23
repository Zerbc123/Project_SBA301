package com.tablemaster.booking.service;

import com.tablemaster.booking.dto.request.ApproveDepositRequest;
import com.tablemaster.booking.dto.request.CheckInRequest;
import com.tablemaster.booking.dto.request.CreateBookingRequest;
import com.tablemaster.booking.dto.request.PreorderItemRequest;
import com.tablemaster.booking.dto.request.TransferTableRequest;
import com.tablemaster.booking.dto.response.BookingResponse;
import com.tablemaster.booking.entity.*;
import com.tablemaster.booking.enums.BookingStatus;
import com.tablemaster.booking.enums.OperationType;
import com.tablemaster.booking.exception.BookingNotFoundException;
import com.tablemaster.booking.exception.InvalidBookingStateException;
import com.tablemaster.booking.exception.TableAlreadyBookedException;
import com.tablemaster.booking.kafka.BookingEventProducer;
import com.tablemaster.booking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final BookingTableRepository bookingTableRepository;
    private final BookingPreorderItemRepository bookingPreorderItemRepository;
    private final TableOperationsAuditRepository tableOperationsAuditRepository;
    private final BookingEventProducer bookingEventProducer;
    private final InvoicePdfService invoicePdfService;

    @Override
    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, UUID userId) {
        log.info("Creating booking request for customer: {}, phone: {}", request.getGuestName(), request.getGuestPhone());

        // 1. Kiểm tra xem bàn yêu cầu có bị trùng không
        if (request.getTableIds() != null && !request.getTableIds().isEmpty()) {
            List<BookingStatus> activeStatuses = List.of(
                    BookingStatus.CONFIRMED,
                    BookingStatus.SEATED,
                    BookingStatus.AWAITING_PAYMENT
            );
            List<UUID> bookedTableIds = bookingRepository.findBookedTableIds(
                    request.getBookingDate(), request.getTimeSlotId(), activeStatuses);

            for (UUID requestedTableId : request.getTableIds()) {
                if (bookedTableIds.contains(requestedTableId)) {
                    throw new TableAlreadyBookedException(requestedTableId);
                }
            }
        }

        // 2. Sinh mã bookingCode (VD: BK2610090001)
        long countToday = bookingRepository.countByBookingDate(request.getBookingDate());
        String datePrefix = request.getBookingDate().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String bookingCode = String.format("BK%s%04d", datePrefix, countToday + 1);

        UUID customerUserId = userId != null ? userId : UUID.fromString("a0000000-0000-0000-0000-000000000005");

        // 3. Tạo Booking Entity
        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .userId(customerUserId)
                .guestName(request.getGuestName())
                .guestPhone(request.getGuestPhone())
                .guestEmail(request.getGuestEmail())
                .bookingDate(request.getBookingDate())
                .timeSlotId(request.getTimeSlotId())
                .guestCount(request.getGuestCount())
                .totalDeposit(BigDecimal.ZERO)
                .status(BookingStatus.PENDING_REVIEW)
                .specialNotes(request.getSpecialNotes())
                .bookingTables(new ArrayList<>())
                .preorderItems(new ArrayList<>())
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        // 4. Lưu liên kết bàn (CascadeType.ALL tự động lưu các phần tử trong collection)
        if (request.getTableIds() != null) {
            for (UUID tableId : request.getTableIds()) {
                BookingTable bt = BookingTable.builder()
                        .id(new BookingTableId(savedBooking.getId(), tableId))
                        .booking(savedBooking)
                        .build();
                savedBooking.getBookingTables().add(bt);
            }
        }

        // 5. Lưu món ăn đặt trước (CascadeType.ALL tự động lưu các phần tử trong collection)
        if (request.getPreorderItems() != null && !request.getPreorderItems().isEmpty()) {
            for (PreorderItemRequest itemReq : request.getPreorderItems()) {
                BigDecimal subtotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                BookingPreorderItem item = BookingPreorderItem.builder()
                        .booking(savedBooking)
                        .menuItemId(itemReq.getMenuItemId())
                        .quantity(itemReq.getQuantity())
                        .unitPrice(itemReq.getUnitPrice())
                        .subtotal(subtotal)
                        .build();
                savedBooking.getPreorderItems().add(item);
            }
        }

        savedBooking = bookingRepository.save(savedBooking);

        // 6. Bắn event Kafka qua Outbox
        bookingEventProducer.publishBookingCreated(savedBooking);

        return BookingResponse.fromEntity(savedBooking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getAllBookings(LocalDate bookingDate, BookingStatus status) {
        List<Booking> bookings;
        if (status != null) {
            bookings = bookingRepository.findByStatusOrderByCreatedAtDesc(status);
        } else {
            bookings = bookingRepository.findAll();
        }

        if (bookingDate != null) {
            bookings = bookings.stream()
                    .filter(b -> b.getBookingDate().isEqual(bookingDate))
                    .collect(Collectors.toList());
        }

        return bookings.stream().map(BookingResponse::fromEntity).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new BookingNotFoundException(id));
        return BookingResponse.fromEntity(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsByUserId(UUID userId) {
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(BookingResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BookingResponse approveAndRequestDeposit(UUID bookingId, ApproveDepositRequest request, UUID staffId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (booking.getStatus() != BookingStatus.PENDING_REVIEW) {
            throw new InvalidBookingStateException("Chỉ có thể duyệt đơn ở trạng thái PENDING_REVIEW. Hiện tại: " + booking.getStatus());
        }

        booking.setReviewedByUserId(staffId);
        booking.setStaffNotes(request.getStaffNotes());

        if (request.getDepositAmount() != null && request.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) {
            // Chuyển sang AWAITING_PAYMENT, chờ khách quét VietQR cọc tiền
            booking.setStatus(BookingStatus.AWAITING_PAYMENT);
            booking.setTotalDeposit(request.getDepositAmount());

            int minutes = (request.getDeadlineMinutes() != null && request.getDeadlineMinutes() > 0)
                    ? request.getDeadlineMinutes() : 30;
            booking.setPaymentDeadline(ZonedDateTime.now().plusMinutes(minutes));

            Booking saved = bookingRepository.save(booking);
            bookingEventProducer.publishBookingCreated(saved);
            return BookingResponse.fromEntity(saved);
        } else {
            // Không yêu cầu cọc -> CONFIRMED luôn và sinh QR check-in
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setTotalDeposit(BigDecimal.ZERO);
            booking.setCheckinQrToken(UUID.randomUUID().toString());

            Booking saved = bookingRepository.save(booking);
            bookingEventProducer.publishBookingConfirmed(saved);
            return BookingResponse.fromEntity(saved);
        }
    }

    @Override
    @Transactional
    public BookingResponse rejectBooking(UUID bookingId, String reason, UUID staffId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (booking.getStatus() != BookingStatus.PENDING_REVIEW) {
            throw new InvalidBookingStateException("Chỉ có thể từ chối đơn ở trạng thái PENDING_REVIEW. Hiện tại: " + booking.getStatus());
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setStaffNotes(reason);
        booking.setReviewedByUserId(staffId);

        Booking saved = bookingRepository.save(booking);
        bookingEventProducer.publishBookingCancelled(saved, "Lễ tân từ chối: " + reason);

        return BookingResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public void confirmBookingAfterPayment(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (booking.getStatus() == BookingStatus.AWAITING_PAYMENT) {
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setCheckinQrToken(UUID.randomUUID().toString());
            Booking saved = bookingRepository.save(booking);
            bookingEventProducer.publishBookingConfirmed(saved);
            log.info("Booking {} confirmed after deposit payment. Generated QR token: {}", bookingId, saved.getCheckinQrToken());
        } else {
            log.warn("Booking {} is in state {}, cannot confirm after payment", bookingId, booking.getStatus());
        }
    }

    @Override
    @Transactional
    public BookingResponse checkIn(CheckInRequest request) {
        Booking booking = bookingRepository.findByCheckinQrToken(request.getQrToken())
                .orElseThrow(() -> new BookingNotFoundException("Mã QR check-in không hợp lệ hoặc không tìm thấy đơn"));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new InvalidBookingStateException("Đơn không ở trạng thái CONFIRMED (Hiện tại: " + booking.getStatus() + ")");
        }

        booking.setStatus(BookingStatus.SEATED);
        booking.setSeatedAt(ZonedDateTime.now());

        Booking saved = bookingRepository.save(booking);
        bookingEventProducer.publishBookingSeated(saved);

        log.info("Customer checked in successfully for booking: {}", saved.getBookingCode());
        return BookingResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public BookingResponse completeBooking(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (booking.getStatus() != BookingStatus.SEATED) {
            throw new InvalidBookingStateException("Chỉ có thể hoàn tất đơn đặt bàn đang SEATED. Hiện tại: " + booking.getStatus());
        }

        booking.setStatus(BookingStatus.COMPLETED);
        booking.setCompletedAt(ZonedDateTime.now());

        Booking saved = bookingRepository.save(booking);
        bookingEventProducer.publishBookingCompleted(saved);

        log.info("Booking completed: {}", saved.getBookingCode());
        return BookingResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(UUID bookingId, String reason, UUID userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (booking.getStatus() == BookingStatus.SEATED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new InvalidBookingStateException("Không thể hủy đơn đặt bàn khi khách đã hoặc đang ngồi ăn");
        }

        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.REJECTED || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new InvalidBookingStateException("Đơn đặt bàn đã kết thúc, không thể hủy lại");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setSpecialNotes((booking.getSpecialNotes() != null ? booking.getSpecialNotes() + " | " : "") + "Lý do hủy: " + reason);

        Booking saved = bookingRepository.save(booking);
        bookingEventProducer.publishBookingCancelled(saved, reason);

        return BookingResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public BookingResponse transferTable(UUID bookingId, TransferTableRequest request, UUID staffId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        // Kiểm tra bàn đích có trống không
        List<BookingStatus> activeStatuses = List.of(BookingStatus.CONFIRMED, BookingStatus.SEATED, BookingStatus.AWAITING_PAYMENT);
        List<UUID> bookedTableIds = bookingRepository.findBookedTableIds(
                booking.getBookingDate(), booking.getTimeSlotId(), activeStatuses);

        if (bookedTableIds.contains(request.getTargetTableId())) {
            throw new TableAlreadyBookedException(request.getTargetTableId());
        }

        // Xóa bàn cũ trong booking_tables
        BookingTableId oldId = new BookingTableId(bookingId, request.getSourceTableId());
        bookingTableRepository.deleteById(oldId);

        // Thêm bàn mới
        BookingTable newBt = BookingTable.builder()
                .id(new BookingTableId(bookingId, request.getTargetTableId()))
                .booking(booking)
                .build();
        bookingTableRepository.save(newBt);

        // Ghi log kiểm toán TableOperationsAudit
        TableOperationsAudit audit = TableOperationsAudit.builder()
                .bookingId(bookingId)
                .operationType(OperationType.TRANSFER)
                .sourceTableId(request.getSourceTableId())
                .targetTableId(request.getTargetTableId())
                .performedBy(staffId)
                .reason(request.getReason())
                .build();
        tableOperationsAuditRepository.save(audit);

        // Refresh quan hệ bảng
        Booking refreshedBooking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        // Phát event
        bookingEventProducer.publishTableUpdated(bookingId, request.getSourceTableId(), request.getTargetTableId(), request.getReason());

        log.info("Transferred table for booking {}: {} -> {}", bookingId, request.getSourceTableId(), request.getTargetTableId());
        return BookingResponse.fromEntity(refreshedBooking);
    }

    @Override
    @Transactional
    public void checkAndExpireBookings() {
        ZonedDateTime now = ZonedDateTime.now();
        List<Booking> expiredBookings = bookingRepository.findExpiredAwaitingPayment(now);

        for (Booking booking : expiredBookings) {
            log.info("Auto-expiring booking {} due to missed deposit payment deadline {}",
                    booking.getBookingCode(), booking.getPaymentDeadline());
            booking.setStatus(BookingStatus.EXPIRED);
            bookingRepository.save(booking);
            bookingEventProducer.publishBookingExpired(booking);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] generateDepositInvoicePdf(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));
        return invoicePdfService.generateInvoicePdf(booking);
    }
}

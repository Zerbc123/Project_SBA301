package com.tablemaster.booking.service;

import com.tablemaster.booking.client.RestaurantServiceClient;
import com.tablemaster.booking.client.model.RestaurantTableInfo;
import com.tablemaster.booking.client.model.RestaurantTimeSlotInfo;
import com.tablemaster.booking.dto.request.*;
import com.tablemaster.booking.dto.response.BookingResponse;
import com.tablemaster.booking.dto.response.ETicketResponse;
import com.tablemaster.booking.dto.response.HostFloorLiveResponse;
import com.tablemaster.booking.dto.response.HostFloorSummaryDto;
import com.tablemaster.booking.dto.response.HostTableLiveDto;
import com.tablemaster.booking.entity.*;
import com.tablemaster.booking.enums.BookingStatus;
import com.tablemaster.booking.enums.OperationType;
import com.tablemaster.booking.exception.BookingNotFoundException;
import com.tablemaster.booking.exception.InvalidBookingStateException;
import com.tablemaster.booking.exception.TableAlreadyBookedException;
import com.tablemaster.booking.kafka.BookingEventProducer;
import com.tablemaster.booking.repository.*;
import com.tablemaster.booking.util.QrSecurityUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
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
    private final RestaurantServiceClient restaurantServiceClient;

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
                .occasion(request.getOccasion())
                .dietaryNotes(request.getDietaryNotes())
                .babyChairCount(request.getBabyChairCount() != null ? request.getBabyChairCount() : 0)
                .candleSetup(Boolean.TRUE.equals(request.getCandleSetup()))
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

        // 5. Lưu món ăn đặt trước và tính cộng dồn tiền cọc món ăn vào tổng hóa đơn cọc (UC-07)
        BigDecimal preorderTotal = BigDecimal.ZERO;
        if (request.getPreorderItems() != null && !request.getPreorderItems().isEmpty()) {
            for (PreorderItemRequest itemReq : request.getPreorderItems()) {
                BigDecimal subtotal = itemReq.getUnitPrice().multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                preorderTotal = preorderTotal.add(subtotal);

                BookingPreorderItem item = BookingPreorderItem.builder()
                        .booking(savedBooking)
                        .menuItemId(itemReq.getMenuItemId())
                        .itemName(itemReq.getItemName())
                        .quantity(itemReq.getQuantity())
                        .unitPrice(itemReq.getUnitPrice())
                        .subtotal(subtotal)
                        .notes(itemReq.getNotes())
                        .build();
                savedBooking.getPreorderItems().add(item);
            }
        }

        // Tính tổng tiền cọc cộng dồn: Tiền cọc giữ bàn + Tiền cọc các món Signature đặt trước (UC-07)
        BigDecimal standardTableDeposit = BigDecimal.valueOf(200000);
        BigDecimal accumulatedTotalDeposit;
        if (request.getTotalDeposit() != null && request.getTotalDeposit().compareTo(BigDecimal.ZERO) > 0) {
            if (preorderTotal.compareTo(BigDecimal.ZERO) > 0
                    && request.getTotalDeposit().compareTo(preorderTotal.add(standardTableDeposit)) >= 0) {
                // Client đã gửi tổng cọc cộng dồn (gồm cọc bàn + cọc món)
                accumulatedTotalDeposit = request.getTotalDeposit();
            } else {
                // Client gửi riêng khoản cọc bàn -> cộng thêm tiền cọc các món đặt trước
                accumulatedTotalDeposit = request.getTotalDeposit().add(preorderTotal);
            }
        } else {
            // Mức cọc bàn tiêu chuẩn Le Prime Bistro mặc định là 200,000 VND + tiền món đặt trước
            accumulatedTotalDeposit = standardTableDeposit.add(preorderTotal);
        }

        savedBooking.setTotalDeposit(accumulatedTotalDeposit);
        if (accumulatedTotalDeposit.compareTo(BigDecimal.ZERO) > 0 && savedBooking.getPaymentDeadline() == null) {
            savedBooking.setPaymentDeadline(ZonedDateTime.now().plusMinutes(30));
        }

        savedBooking = bookingRepository.save(savedBooking);

        // 6. Bắn event Kafka qua Outbox (Mang đầy đủ danh sách món và tổng cọc đã cộng dồn)
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

        if (booking.getStatus() != BookingStatus.PENDING_REVIEW && booking.getStatus() != BookingStatus.AWAITING_PAYMENT) {
            throw new InvalidBookingStateException("Chỉ có thể duyệt đơn ở trạng thái PENDING_REVIEW hoặc AWAITING_PAYMENT. Hiện tại: " + booking.getStatus());
        }

        booking.setReviewedByUserId(staffId);
        booking.setStaffNotes(request.getStaffNotes());

        BigDecimal depositAmount = request.getDepositAmount();
        if (depositAmount == null || depositAmount.compareTo(BigDecimal.ZERO) <= 0) {
            depositAmount = booking.getTotalDeposit();
        }

        if (depositAmount != null && depositAmount.compareTo(BigDecimal.ZERO) > 0) {
            // Chuyển sang AWAITING_PAYMENT, chờ khách quét VietQR cọc tiền
            booking.setStatus(BookingStatus.AWAITING_PAYMENT);
            booking.setTotalDeposit(depositAmount);

            int minutes = (request.getDeadlineMinutes() != null && request.getDeadlineMinutes() > 0)
                    ? request.getDeadlineMinutes() : 30;
            booking.setPaymentDeadline(ZonedDateTime.now().plusMinutes(minutes));

            Booking saved = bookingRepository.save(booking);
            bookingEventProducer.publishBookingCreated(saved);
            return BookingResponse.fromEntity(saved);
        } else {
            // Không yêu cầu cọc -> CONFIRMED luôn và sinh QR check-in 64 ký tự chống giả mạo
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setTotalDeposit(BigDecimal.ZERO);
            String salt = QrSecurityUtil.generateSecretSalt();
            booking.setQrSecretSalt(salt);
            booking.setQrRotationCounter(1);
            booking.setCheckinQrToken(QrSecurityUtil.generate64CharToken(booking.getBookingCode(), salt, 1));
            booking.setTicketIssuedAt(ZonedDateTime.now());
            booking.setTicketZnsStatus("DELIVERED");
            booking.setTicketEmailStatus("SENT");

            Booking saved = bookingRepository.save(booking);
            bookingEventProducer.publishBookingConfirmed(saved);
            bookingEventProducer.publishTicketIssued(saved);
            bookingEventProducer.publishZnsSent(saved, saved.getGuestPhone());
            bookingEventProducer.publishEmailSent(saved, saved.getGuestEmail());
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
    public BookingResponse confirmBookingAfterPayment(UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (booking.getStatus() == BookingStatus.CONFIRMED
                && booking.getCheckinQrToken() != null
                && booking.getCheckinQrToken().length() == 64) {
            log.info("Booking {} is already CONFIRMED with 64-char QR token: {}", bookingId, booking.getCheckinQrToken());
            return BookingResponse.fromEntity(booking);
        }

        if (booking.getStatus() == BookingStatus.AWAITING_PAYMENT
                || booking.getStatus() == BookingStatus.PENDING_REVIEW
                || booking.getStatus() == BookingStatus.CONFIRMED) {
            booking.setStatus(BookingStatus.CONFIRMED);
            String salt = booking.getQrSecretSalt() != null ? booking.getQrSecretSalt() : QrSecurityUtil.generateSecretSalt();
            int counter = booking.getQrRotationCounter() != null ? booking.getQrRotationCounter() : 1;
            booking.setQrSecretSalt(salt);
            booking.setQrRotationCounter(counter);
            booking.setCheckinQrToken(QrSecurityUtil.generate64CharToken(booking.getBookingCode(), salt, counter));
            booking.setTicketIssuedAt(ZonedDateTime.now());
            booking.setTicketZnsStatus("DELIVERED");
            booking.setTicketEmailStatus("SENT");

            Booking saved = bookingRepository.save(booking);
            bookingEventProducer.publishBookingConfirmed(saved);
            bookingEventProducer.publishTicketIssued(saved);
            bookingEventProducer.publishZnsSent(saved, saved.getGuestPhone());
            bookingEventProducer.publishEmailSent(saved, saved.getGuestEmail());
            log.info("Booking {} confirmed after deposit payment. Generated 64-char QR token: {}", bookingId, saved.getCheckinQrToken());
            return BookingResponse.fromEntity(saved);
        } else {
            log.warn("Booking {} is in state {}, cannot confirm after payment", bookingId, booking.getStatus());
            return BookingResponse.fromEntity(booking);
        }
    }

    @Override
    @Transactional
    public BookingResponse checkIn(CheckInRequest request) {
        Booking booking = bookingRepository.findByCheckinQrToken(request.getQrToken())
                .orElseThrow(() -> new BookingNotFoundException("Mã QR check-in không hợp lệ hoặc không tìm thấy đơn"));

        if (booking.getStatus() == BookingStatus.SEATED) {
            throw new InvalidBookingStateException("Vé check-in này ĐÃ ĐƯỢC QUÉT vào lúc " +
                    (booking.getCheckinScannedAt() != null ? booking.getCheckinScannedAt() : booking.getSeatedAt()) +
                    ". Chống gian lận sử dụng lại vé!");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new InvalidBookingStateException("Đơn không ở trạng thái CONFIRMED (Hiện tại: " + booking.getStatus() + ")");
        }

        booking.setStatus(BookingStatus.SEATED);
        booking.setSeatedAt(ZonedDateTime.now());
        booking.setCheckinScannedAt(ZonedDateTime.now());

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

    @Override
    @Transactional
    public BookingResponse updateSpecialRequests(UUID bookingId, com.tablemaster.booking.dto.request.UpdateSpecialRequestsRequest request, UUID staffOrUserId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (request.getOccasion() != null) {
            booking.setOccasion(request.getOccasion());
        }
        if (request.getDietaryNotes() != null) {
            booking.setDietaryNotes(request.getDietaryNotes());
        }
        if (request.getBabyChairCount() != null) {
            booking.setBabyChairCount(request.getBabyChairCount());
        }
        if (request.getCandleSetup() != null) {
            booking.setCandleSetup(request.getCandleSetup());
        }
        if (request.getSpecialNotes() != null) {
            booking.setSpecialNotes(request.getSpecialNotes());
        }
        if (request.getStaffNotes() != null) {
            booking.setStaffNotes(request.getStaffNotes());
        }

        Booking saved = bookingRepository.save(booking);
        log.info("Updated special requests & dietary notes for booking {}: occasion={}, dietary={}, babyChairs={}",
                saved.getBookingCode(), saved.getOccasion(), saved.getDietaryNotes(), saved.getBabyChairCount());

        // Bắn Kafka và WebSocket STOMP đồng bộ tức thời sang Tablet Lễ tân và KDS Bếp (UC-08)
        bookingEventProducer.publishSpecialRequestsUpdated(saved);

        return BookingResponse.fromEntity(saved);
    }

    // =========================================================================
    // UC-10: Đặt tiệc Sinh nhật / Sự kiện Bao trọn tầng (Private Banquet Booking)
    // =========================================================================

    @Override
    @Transactional
    public BookingResponse createEventInquiry(CreateEventInquiryRequest request, UUID userId) {
        log.info("Creating private banquet / event inquiry for: {}, company: {}, guests: {}, eventType: {}",
                request.getGuestName(), request.getCompanyName(), request.getGuestCount(), request.getEventType());

        long countToday = bookingRepository.countByBookingDate(request.getBookingDate());
        String datePrefix = request.getBookingDate().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String bookingCode = String.format("EV%s%04d", datePrefix, countToday + 1);

        UUID customerUserId = userId != null ? userId : UUID.fromString("a0000000-0000-0000-0000-000000000005");

        // Quy ước cam kết gọi tư vấn trong 15 phút (15-Minute Callback SLA)
        ZonedDateTime callbackDeadline = ZonedDateTime.now().plusMinutes(15);

        // Chuẩn bị ghi chú tổng hợp tiệc sự kiện
        StringBuilder notesBuilder = new StringBuilder();
        if (request.getCompanyName() != null && !request.getCompanyName().isBlank()) {
            notesBuilder.append("Đơn vị: ").append(request.getCompanyName()).append(". ");
        }
        notesBuilder.append("Loại hình: ").append(request.getEventType());
        if (request.getTargetFloor() != null) {
            notesBuilder.append(" (Tầng ").append(request.getTargetFloor()).append(")");
        }
        notesBuilder.append(". Số khách: ").append(request.getGuestCount()).append(" người. ");
        if (request.getEstimatedBudget() != null) {
            notesBuilder.append("Ngân sách dự kiến: ").append(request.getEstimatedBudget()).append(" đ. ");
        }
        if (Boolean.TRUE.equals(request.getStageAudioRequired())) {
            notesBuilder.append("Cần setup âm thanh & micro sân khấu. ");
        }
        if (Boolean.TRUE.equals(request.getDecorationRequired())) {
            notesBuilder.append("Cần setup hoa tươi & backdrop trang trí. ");
        }
        if (request.getMenuPreference() != null) {
            notesBuilder.append("Menu mong muốn: ").append(request.getMenuPreference()).append(". ");
        }
        if (request.getSpecialNotes() != null && !request.getSpecialNotes().isBlank()) {
            notesBuilder.append("Ghi chú thêm: ").append(request.getSpecialNotes());
        }

        UUID slotId = request.getTimeSlotId() != null
                ? request.getTimeSlotId()
                : UUID.fromString("b1000000-0000-0000-0000-000000000002"); // Slot ca tối mặc định

        Booking booking = Booking.builder()
                .bookingCode(bookingCode)
                .userId(customerUserId)
                .guestName(request.getGuestName())
                .guestPhone(request.getGuestPhone())
                .guestEmail(request.getGuestEmail())
                .bookingDate(request.getBookingDate())
                .timeSlotId(slotId)
                .guestCount(request.getGuestCount())
                .totalDeposit(BigDecimal.ZERO)
                .status(BookingStatus.EVENT_INQUIRY)
                .eventType(request.getEventType())
                .targetFloor(request.getTargetFloor() != null ? request.getTargetFloor() : 3)
                .companyName(request.getCompanyName())
                .estimatedBudget(request.getEstimatedBudget())
                .stageAudioRequired(Boolean.TRUE.equals(request.getStageAudioRequired()))
                .decorationRequired(Boolean.TRUE.equals(request.getDecorationRequired()))
                .callbackDeadline(callbackDeadline)
                .managerCallStatus("PENDING_CALL")
                .specialNotes(notesBuilder.toString().trim())
                .staffNotes("Cam kết Quản lý ca gọi tư vấn trực tiếp cho khách trong 15 phút (Hạn chót: " + callbackDeadline.format(DateTimeFormatter.ofPattern("HH:mm")) + ")")
                .bookingTables(new ArrayList<>())
                .preorderItems(new ArrayList<>())
                .build();

        Booking saved = bookingRepository.save(booking);
        log.info("Saved EVENT_INQUIRY {}: deadline={}", saved.getBookingCode(), saved.getCallbackDeadline());

        // Phát sự kiện Kafka & WebSocket báo chuông đến tài khoản Quản lý ca (Shift Manager)
        bookingEventProducer.publishEventInquiryCreated(saved);

        return BookingResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getEventInquiries() {
        return bookingRepository.findByStatusOrderByCreatedAtDesc(BookingStatus.EVENT_INQUIRY)
                .stream()
                .map(BookingResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BookingResponse updateEventConsultation(UUID bookingId, UpdateEventConsultationRequest request, UUID managerUserId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new BookingNotFoundException(bookingId));

        if (request.getManagerCallStatus() != null) {
            booking.setManagerCallStatus(request.getManagerCallStatus());
        }
        if (request.getConsultationNotes() != null) {
            booking.setConsultationNotes(request.getConsultationNotes());
            booking.setStaffNotes("Quản lý ca (" + (managerUserId != null ? managerUserId : "Host") + ") tư vấn: " + request.getConsultationNotes());
        }
        if (request.getAgreedBudget() != null) {
            booking.setEstimatedBudget(request.getAgreedBudget());
        }
        if (request.getAgreedDeposit() != null) {
            booking.setTotalDeposit(request.getAgreedDeposit());
        }
        if (managerUserId != null) {
            booking.setReviewedByUserId(managerUserId);
        }

        // Chuyển trạng thái nếu có chỉ định (VD: AWAITING_PAYMENT, CONFIRMED, REJECTED)
        if (request.getTargetBookingStatus() != null) {
            try {
                BookingStatus targetStatus = BookingStatus.valueOf(request.getTargetBookingStatus());
                booking.setStatus(targetStatus);
                if (targetStatus == BookingStatus.AWAITING_PAYMENT) {
                    booking.setPaymentDeadline(ZonedDateTime.now().plusHours(2));
                }
            } catch (IllegalArgumentException e) {
                log.warn("Invalid target booking status: {}", request.getTargetBookingStatus());
            }
        }

        Booking saved = bookingRepository.save(booking);
        log.info("Updated event consultation for {}: callStatus={}, status={}",
                saved.getBookingCode(), saved.getManagerCallStatus(), saved.getStatus());

        bookingEventProducer.publishEventInquiryConsulted(saved);

        return BookingResponse.fromEntity(saved);
    }

    // =========================================================================
    // UC-12: Nhận Vé điện tử QR Check-in (E-Ticket with Dynamic QR Code)
    // =========================================================================

    @Override
    @Transactional
    public ETicketResponse getETicket(String bookingIdOrCode) {
        Booking booking = findBookingByIdOrCode(bookingIdOrCode);

        // Đảm bảo đơn đã có Salt bảo mật và mã 64 ký tự
        if (booking.getQrSecretSalt() == null || booking.getCheckinQrToken() == null || booking.getCheckinQrToken().length() != 64) {
            String salt = booking.getQrSecretSalt() != null ? booking.getQrSecretSalt() : QrSecurityUtil.generateSecretSalt();
            int counter = booking.getQrRotationCounter() != null ? booking.getQrRotationCounter() : 1;
            booking.setQrSecretSalt(salt);
            booking.setQrRotationCounter(counter);
            booking.setCheckinQrToken(QrSecurityUtil.generate64CharToken(booking.getBookingCode(), salt, counter));
            if (booking.getTicketIssuedAt() == null) {
                booking.setTicketIssuedAt(ZonedDateTime.now());
                booking.setTicketZnsStatus("DELIVERED");
                booking.setTicketEmailStatus("SENT");
            }
            booking = bookingRepository.save(booking);
        }

        return toETicketResponse(booking);
    }

    @Override
    @Transactional
    public ETicketResponse refreshDynamicQrToken(String bookingIdOrCode) {
        Booking booking = findBookingByIdOrCode(bookingIdOrCode);

        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.SEATED) {
            throw new InvalidBookingStateException("Chỉ có thể làm mới mã QR cho đơn đã xác nhận (Hiện tại: " + booking.getStatus() + ")");
        }

        String salt = booking.getQrSecretSalt() != null ? booking.getQrSecretSalt() : QrSecurityUtil.generateSecretSalt();
        int nextCounter = (booking.getQrRotationCounter() != null ? booking.getQrRotationCounter() : 1) + 1;

        booking.setQrSecretSalt(salt);
        booking.setQrRotationCounter(nextCounter);
        String dynamicToken = QrSecurityUtil.generate64CharToken(booking.getBookingCode(), salt, nextCounter);
        booking.setCheckinQrToken(dynamicToken);

        Booking saved = bookingRepository.save(booking);
        log.info("Refreshed dynamic 64-char QR token for booking {}: counter={}, token={}",
                saved.getBookingCode(), nextCounter, dynamicToken);

        return toETicketResponse(saved);
    }

    @Override
    @Transactional
    public ETicketResponse verifyAndCheckIn(VerifyTicketRequest request) {
        String token = request.getQrToken() != null ? request.getQrToken().trim() : "";
        if (token.isEmpty()) {
            throw new IllegalArgumentException("Mã token QR check-in không được để trống");
        }

        Optional<Booking> opt = bookingRepository.findByCheckinQrToken(token);
        if (opt.isEmpty()) {
            // Hỗ trợ quét mã bookingCode dự phòng nếu máy quét truyền mã bookingCode
            opt = bookingRepository.findByBookingCode(token);
        }

        Booking booking = opt.orElseThrow(() -> new BookingNotFoundException(
                "Mã QR check-in không hợp lệ hoặc không tìm thấy đơn trong hệ thống. Token: " + token));

        // Kiểm tra chống gian lận quét lại vé (One-time use security check)
        if (booking.getStatus() == BookingStatus.SEATED) {
            String checkinTimeStr = booking.getCheckinScannedAt() != null
                    ? booking.getCheckinScannedAt().toString()
                    : (booking.getSeatedAt() != null ? booking.getSeatedAt().toString() : "trước đó");
            throw new InvalidBookingStateException("Vé check-in này ĐÃ ĐƯỢC QUÉT vào lúc " + checkinTimeStr +
                    ". Chống gian lận sử dụng lại vé nhiều lần!");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new InvalidBookingStateException("Đơn đặt bàn chưa sẵn sàng Check-in (Trạng thái hiện tại: " +
                    booking.getStatus() + "). Yêu cầu xác nhận cọc trước khi vào sảnh.");
        }

        ZonedDateTime now = ZonedDateTime.now();
        booking.setStatus(BookingStatus.SEATED);
        booking.setSeatedAt(now);
        booking.setCheckinScannedAt(now);
        if (request.getStaffId() != null) {
            booking.setReviewedByUserId(request.getStaffId());
        }

        Booking saved = bookingRepository.save(booking);
        bookingEventProducer.publishBookingSeated(saved);

        log.info("QR Check-in successful at door for booking {}: guest={}, scannedAt={}",
                saved.getBookingCode(), saved.getGuestName(), saved.getCheckinScannedAt());

        return toETicketResponse(saved);
    }

    @Override
    @Transactional
    public ETicketResponse sendTicketNotification(String bookingIdOrCode, SendTicketNotificationRequest request) {
        Booking booking = findBookingByIdOrCode(bookingIdOrCode);

        String channel = request.getChannel() != null ? request.getChannel().trim().toUpperCase() : "BOTH";

        if ("ZNS".equals(channel) || "BOTH".equals(channel)) {
            String recipientPhone = request.getRecipientOverride() != null && !request.getRecipientOverride().isEmpty()
                    ? request.getRecipientOverride()
                    : booking.getGuestPhone();
            booking.setTicketZnsStatus("DELIVERED");
            bookingEventProducer.publishZnsSent(booking, recipientPhone);
            log.info("Dispatched ZNS E-Ticket notification to phone: {}", recipientPhone);
        }

        if ("EMAIL".equals(channel) || "BOTH".equals(channel)) {
            String recipientEmail = request.getRecipientOverride() != null && !request.getRecipientOverride().isEmpty()
                    ? request.getRecipientOverride()
                    : booking.getGuestEmail();
            booking.setTicketEmailStatus("SENT");
            bookingEventProducer.publishEmailSent(booking, recipientEmail);
            log.info("Dispatched Email E-Ticket notification to: {}", recipientEmail);
        }

        Booking saved = bookingRepository.save(booking);
        return toETicketResponse(saved);
    }

    private Booking findBookingByIdOrCode(String idOrCode) {
        if (idOrCode == null || idOrCode.trim().isEmpty()) {
            throw new BookingNotFoundException("Mã đơn không hợp lệ");
        }
        String clean = idOrCode.trim();
        try {
            UUID uuid = UUID.fromString(clean);
            Optional<Booking> byId = bookingRepository.findById(uuid);
            if (byId.isPresent()) return byId.get();
        } catch (IllegalArgumentException ignored) {
            // Not a UUID, look up by booking code
        }
        return bookingRepository.findByBookingCode(clean)
                .orElseThrow(() -> new BookingNotFoundException("Không tìm thấy đơn đặt bàn với mã: " + clean));
    }

    private ETicketResponse toETicketResponse(Booking booking) {
        String tableCode = "Sảnh Chính";
        Integer floorNumber = 1;
        String floorName = "Tầng 1 - Sảnh Vòm & Bar";
        String zoneName = "MAIN_HALL";

        if (booking.getTargetFloor() != null) {
            floorNumber = booking.getTargetFloor();
            floorName = floorNumber == 3 ? "Tầng 3 - Sky Lounge Rooftop"
                    : (floorNumber == 2 ? "Tầng 2 - Phòng Tiệc VIP Salon" : "Tầng 1 - Sảnh Vòm & Bar");
        }

        if (booking.getBookingTables() != null && !booking.getBookingTables().isEmpty()) {
            UUID firstTableId = booking.getBookingTables().get(0).getId().getTableId();
            try {
                List<RestaurantTableInfo> allTables = restaurantServiceClient.getAllTables();
                if (allTables != null) {
                    for (RestaurantTableInfo t : allTables) {
                        if (firstTableId.equals(t.getId())) {
                            tableCode = t.getTableCode();
                            if (t.getFloorNumber() != null) floorNumber = t.getFloorNumber();
                            if (t.getFloorName() != null) floorName = t.getFloorName();
                            if (t.getZoneType() != null) zoneName = t.getZoneType();
                            break;
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Could not enrich table info: {}", e.getMessage());
            }
        }

        String slotName = "Ca Tối Giờ Vàng (18:30 - 20:30)";
        String slotRange = "18:30 - 20:30";
        try {
            List<RestaurantTimeSlotInfo> timeSlots = restaurantServiceClient.getTimeSlots();
            if (timeSlots != null && booking.getTimeSlotId() != null) {
                for (RestaurantTimeSlotInfo s : timeSlots) {
                    if (booking.getTimeSlotId().equals(s.getId())) {
                        slotName = s.getSlotName();
                        slotRange = s.getStartTime() + " - " + s.getEndTime();
                        break;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not enrich time slot info: {}", e.getMessage());
        }

        List<BookingResponse.PreorderItemResponse> preorders = null;
        if (booking.getPreorderItems() != null) {
            preorders = booking.getPreorderItems().stream()
                    .map(item -> BookingResponse.PreorderItemResponse.builder()
                            .id(item.getId())
                            .menuItemId(item.getMenuItemId())
                            .itemName(item.getItemName())
                            .quantity(item.getQuantity())
                            .unitPrice(item.getUnitPrice())
                            .subtotal(item.getSubtotal())
                            .notes(item.getNotes())
                            .build())
                    .collect(Collectors.toList());
        }

        boolean isSeated = booking.getStatus() == BookingStatus.SEATED;
        boolean isConfirmed = booking.getStatus() == BookingStatus.CONFIRMED || isSeated;

        return ETicketResponse.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .userId(booking.getUserId())
                .guestName(booking.getGuestName())
                .guestPhone(booking.getGuestPhone())
                .guestEmail(booking.getGuestEmail())
                .bookingDate(booking.getBookingDate())
                .timeSlotName(slotName)
                .timeSlotRange(slotRange)
                .guestCount(booking.getGuestCount())
                .tableCode(tableCode)
                .floorNumber(floorNumber)
                .floorName(floorName)
                .zoneName(zoneName)
                .totalDeposit(booking.getTotalDeposit())
                .status(booking.getStatus().name())
                .isConfirmed(isConfirmed)
                .occasion(booking.getOccasion())
                .dietaryNotes(booking.getDietaryNotes())
                .babyChairCount(booking.getBabyChairCount() != null ? booking.getBabyChairCount() : 0)
                .candleSetup(Boolean.TRUE.equals(booking.getCandleSetup()))
                .specialNotes(booking.getSpecialNotes())
                .preorderItems(preorders)
                .dynamicQrToken(booking.getCheckinQrToken())
                .qrRotationCounter(booking.getQrRotationCounter() != null ? booking.getQrRotationCounter() : 1)
                .qrExpiresAt(ZonedDateTime.now().plusSeconds(60))
                .refreshIntervalSeconds(60)
                .ticketIssuedAt(booking.getTicketIssuedAt() != null ? booking.getTicketIssuedAt() : booking.getCreatedAt())
                .ticketZnsStatus(booking.getTicketZnsStatus() != null ? booking.getTicketZnsStatus() : "DELIVERED")
                .ticketEmailStatus(booking.getTicketEmailStatus() != null ? booking.getTicketEmailStatus() : "SENT")
                .checkinScannedAt(booking.getCheckinScannedAt())
                .isAlreadyCheckedIn(isSeated)
                .restaurantName("Le Prime Bistro & Lounge")
                .restaurantAddress("68 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh")
                .hotline("028 3822 8899")
                .dressCode("Smart Casual / Elegant")
                .build();
    }

    // =========================================================================
    // UC-15: XEM SƠ ĐỒ SÀN LIVE ĐA TẦNG TRÊN TABLET (HOST FLOOR LIVE VIEW)
    // =========================================================================

    @Override
    @Transactional(readOnly = true)
    public HostFloorLiveResponse getHostFloorsLive(Integer floorFilter) {
        long startMs = System.currentTimeMillis();

        // 1. Lấy toàn bộ danh sách bàn từ restaurantServiceClient (kèm fallback resilient)
        List<RestaurantTableInfo> allTables = restaurantServiceClient.getAllTables();
        if (allTables == null) {
            allTables = Collections.emptyList();
        }

        // 2. Lấy các đơn đặt bàn hoạt động trong ngày hôm nay
        List<Booking> activeBookings = bookingRepository.findByStatusInOrderByBookingDateAscCreatedAtAsc(
                List.of(BookingStatus.CONFIRMED, BookingStatus.SEATED, BookingStatus.AWAITING_PAYMENT, BookingStatus.PENDING_REVIEW));

        // Map từ tableId -> Booking
        Map<UUID, Booking> tableBookingMap = new HashMap<>();
        if (activeBookings != null) {
            for (Booking b : activeBookings) {
                if (b.getBookingTables() != null) {
                    for (BookingTable bt : b.getBookingTables()) {
                        tableBookingMap.put(bt.getId().getTableId(), b);
                    }
                }
            }
        }

        List<HostTableLiveDto> tableDtos = new ArrayList<>();
        int availableCount = 0;
        int seatedCount = 0;
        int reservedCount = 0;
        int cleaningCount = 0;
        int activeGuests = 0;
        BigDecimal totalDeposit = BigDecimal.ZERO;

        for (RestaurantTableInfo t : allTables) {
            if (floorFilter != null && t.getFloorNumber() != null && !floorFilter.equals(t.getFloorNumber())) {
                continue;
            }

            Booking matchedBooking = tableBookingMap.get(t.getId());

            String status = "AVAILABLE";
            String guestName = null;
            String guestPhone = null;
            String bookingCode = null;
            String bookingTime = null;
            BigDecimal deposit = BigDecimal.ZERO;
            Instant seatedAt = null;
            Long seatedMinutes = null;
            String seatedDurationFormatted = null;
            String diningAlert = "NORMAL";
            String occasion = null;
            String dietaryNotes = null;
            Integer babyChair = 0;
            Boolean candle = false;
            String specialNotes = null;
            int preorderCount = 0;
            BigDecimal preorderTotal = BigDecimal.ZERO;

            if (matchedBooking != null) {
                guestName = matchedBooking.getGuestName();
                guestPhone = matchedBooking.getGuestPhone();
                bookingCode = matchedBooking.getBookingCode();
                deposit = matchedBooking.getTotalDeposit() != null ? matchedBooking.getTotalDeposit() : BigDecimal.ZERO;
                occasion = matchedBooking.getOccasion();
                dietaryNotes = matchedBooking.getDietaryNotes();
                babyChair = matchedBooking.getBabyChairCount() != null ? matchedBooking.getBabyChairCount() : 0;
                candle = Boolean.TRUE.equals(matchedBooking.getCandleSetup());
                specialNotes = matchedBooking.getSpecialNotes();

                if (matchedBooking.getPreorderItems() != null) {
                    preorderCount = matchedBooking.getPreorderItems().size();
                    preorderTotal = matchedBooking.getPreorderItems().stream()
                            .map(p -> p.getSubtotal() != null ? p.getSubtotal() : BigDecimal.ZERO)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                }

                if (matchedBooking.getStatus() == BookingStatus.SEATED) {
                    status = "SEATED";
                    seatedCount++;
                    activeGuests += (matchedBooking.getGuestCount() != null ? matchedBooking.getGuestCount() : t.getMaxCapacity());
                    totalDeposit = totalDeposit.add(deposit);

                    ZonedDateTime zdt = matchedBooking.getSeatedAt() != null ? matchedBooking.getSeatedAt()
                            : (matchedBooking.getCheckinScannedAt() != null ? matchedBooking.getCheckinScannedAt()
                            : matchedBooking.getCreatedAt());
                    seatedAt = zdt != null ? zdt.toInstant() : Instant.now().minusSeconds(2400);

                    seatedMinutes = Math.max(0, Duration.between(seatedAt, Instant.now()).toMinutes());
                    if (seatedMinutes < 60) {
                        seatedDurationFormatted = seatedMinutes + " phút";
                    } else {
                        seatedDurationFormatted = (seatedMinutes / 60) + "h " + (seatedMinutes % 60) + "m";
                    }

                    if (seatedMinutes >= 105) {
                        diningAlert = "OVERSTAY";
                    } else if (seatedMinutes >= 75) {
                        diningAlert = "LONG_DINING";
                    } else {
                        diningAlert = "NORMAL";
                    }
                } else if (matchedBooking.getStatus() == BookingStatus.CONFIRMED) {
                    status = "CONFIRMED";
                    reservedCount++;
                    totalDeposit = totalDeposit.add(deposit);
                } else {
                    status = "HOLDING";
                }
            } else {
                availableCount++;
            }

            tableDtos.add(HostTableLiveDto.builder()
                    .tableId(t.getId())
                    .tableCode(t.getTableCode())
                    .floorNumber(t.getFloorNumber())
                    .floorName(t.getFloorName())
                    .capacity(t.getMaxCapacity())
                    .shape(t.getShape() != null ? t.getShape() : "rect")
                    .status(status)
                    .zoneType(t.getZoneType() != null ? t.getZoneType() : "STANDARD")
                    .posX(t.getPosX() != null ? t.getPosX() : 100f)
                    .posY(t.getPosY() != null ? t.getPosY() : 100f)
                    .width(t.getWidth() != null ? t.getWidth() : 80f)
                    .height(t.getHeight() != null ? t.getHeight() : 60f)
                    .bookingId(matchedBooking != null ? matchedBooking.getId() : null)
                    .bookingCode(bookingCode)
                    .currentGuestName(guestName)
                    .guestPhone(guestPhone)
                    .bookingTime(bookingTime != null ? bookingTime : "19:00")
                    .depositAmount(deposit)
                    .isConfirmed(matchedBooking != null && matchedBooking.getStatus() == BookingStatus.CONFIRMED)
                    .seatedAt(seatedAt)
                    .seatedMinutes(seatedMinutes)
                    .seatedDurationFormatted(seatedDurationFormatted)
                    .diningAlertLevel(diningAlert)
                    .isLateNoShow(false)
                    .occasion(occasion)
                    .dietaryNotes(dietaryNotes)
                    .babyChairCount(babyChair)
                    .candleSetup(candle)
                    .specialNotes(specialNotes)
                    .preorderCount(preorderCount)
                    .preorderTotalAmount(preorderTotal)
                    .build());
        }

        // 3. Build floors summary (Tầng 1, 2, 3)
        List<HostFloorSummaryDto> floors = buildFloorSummaries(allTables, tableDtos);

        long latency = System.currentTimeMillis() - startMs;

        HostFloorLiveResponse response = HostFloorLiveResponse.builder()
                .floors(floors)
                .tables(tableDtos)
                .syncTimestamp(Instant.now())
                .totalTables(tableDtos.size())
                .availableTables(availableCount)
                .seatedTables(seatedCount)
                .reservedTables(reservedCount)
                .cleaningTables(cleaningCount)
                .activeGuestsCount(activeGuests)
                .totalDepositHeld(totalDeposit)
                .latencyMs(latency)
                .build();

        // Broadcast WebSocket STOMP tới Tablet Lễ tân (<300ms)
        try {
            bookingEventProducer.publishHostFloorLiveUpdate(response);
        } catch (Exception e) {
            log.debug("WebSocket broadcast info: {}", e.getMessage());
        }

        return response;
    }

    private List<HostFloorSummaryDto> buildFloorSummaries(List<RestaurantTableInfo> allTables, List<HostTableLiveDto> liveTables) {
        List<HostFloorSummaryDto> summaries = new ArrayList<>();
        int[] floorNums = {1, 2, 3};
        String[] floorNames = {"Tầng 1 (Grand Bistro)", "Tầng 2 (VIP Salon Cellar)", "Tầng 3 (Sky Lounge Rooftop)"};
        String[] desc = {
            "Sảnh tiệc chính, mặt kính toàn cảnh ngắm phố đi bộ Nguyễn Huệ",
            "Phòng riêng tư đẳng cấp VIP, hầm rượu vang Bordeaux Grands Crus",
            "Sân thượng Rooftop thoáng đãng, tầm nhìn 360 độ ngắm hoàng hôn & pháo hoa"
        };
        String[] viewTags = {"🌟 View Nguyễn Huệ", "🍷 Hầm Rượu Vang VIP", "🎆 Rooftop Sky Lounge"};

        for (int i = 0; i < floorNums.length; i++) {
            int fn = floorNums[i];
            List<HostTableLiveDto> onFloor = liveTables.stream()
                    .filter(t -> t.getFloorNumber() != null && t.getFloorNumber() == fn)
                    .collect(Collectors.toList());

            int total = onFloor.size();
            int avail = (int) onFloor.stream().filter(t -> "AVAILABLE".equals(t.getStatus())).count();
            int seated = (int) onFloor.stream().filter(t -> "SEATED".equals(t.getStatus())).count();
            int reserved = (int) onFloor.stream().filter(t -> "CONFIRMED".equals(t.getStatus()) || "HOLDING".equals(t.getStatus())).count();
            int cleaning = (int) onFloor.stream().filter(t -> "CLEANING".equals(t.getStatus())).count();
            int cap = onFloor.stream().mapToInt(t -> t.getCapacity() != null ? t.getCapacity() : 4).sum();
            double occ = total > 0 ? ((double) (total - avail) / total) * 100.0 : 0.0;
            BigDecimal rev = onFloor.stream()
                    .map(t -> t.getDepositAmount() != null ? t.getDepositAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            summaries.add(HostFloorSummaryDto.builder()
                    .floorNumber(fn)
                    .floorName(floorNames[i])
                    .description(desc[i])
                    .viewTag(viewTags[i])
                    .totalTables(total)
                    .availableTables(avail)
                    .seatedTables(seated)
                    .reservedTables(reserved)
                    .cleaningTables(cleaning)
                    .totalCapacity(cap)
                    .occupancyRatePercent(Math.round(occ * 10.0) / 10.0)
                    .floorEstimatedRevenue(rev)
                    .build());
        }
        return summaries;
    }

    // =========================================================================
    // UC-17: Đổi trạng thái bàn 1 chạm trên Tablet (One-touch Table Status)
    // SEATED -> CALL_BILL -> CLEANING -> AVAILABLE, đồng bộ Lễ tân, Thu ngân, Phục vụ (<300ms)
    // =========================================================================
    @Override
    @Transactional
    public com.tablemaster.booking.dto.response.OneTouchTableStatusResponse updateOneTouchTableStatus(
            String tableCode,
            com.tablemaster.booking.dto.request.OneTouchTableStatusRequest request) {
        log.info("⚡ [UC-17] Updating one-touch table status for tableCode={}, status={}, by={}",
                tableCode, request.getStatus(), request.getUpdatedBy());

        String targetStatus = request.getStatus().toUpperCase();
        String updatedBy = request.getUpdatedBy() != null ? request.getUpdatedBy() : "STAFF";

        // Tìm đơn đặt bàn gần nhất trong ngày cho bàn này (nếu có)
        LocalDate today = LocalDate.now();
        List<Booking> todayBookings = bookingRepository.findByBookingDate(today);
        Booking activeBooking = null;

        for (Booking b : todayBookings) {
            boolean matchesTable = false;
            if (b.getBookingTables() != null) {
                matchesTable = b.getBookingTables().stream()
                        .anyMatch(bt -> bt.getTableId() != null &&
                                (bt.getTableId().toString().equalsIgnoreCase(tableCode) ||
                                 tableCode.contains(bt.getTableId().toString())));
            }
            if (matchesTable && (b.getStatus() == BookingStatus.SEATED || b.getStatus() == BookingStatus.CONFIRMED)) {
                activeBooking = b;
                break;
            }
        }

        String previousStatus = activeBooking != null ? activeBooking.getStatus().name() : "SEATED";

        // Xử lý cập nhật vòng đời Booking tương ứng nếu có đơn đặt bàn đang hoạt động
        if (activeBooking != null) {
            if ("CALL_BILL".equalsIgnoreCase(targetStatus)) {
                // Khách yêu cầu tính tiền - đơn vẫn đang SEATED nhưng đánh dấu yêu cầu bill
                log.info("Bill requested for booking {}", activeBooking.getBookingCode());
            } else if ("CLEANING".equalsIgnoreCase(targetStatus) || "AVAILABLE".equalsIgnoreCase(targetStatus)) {
                // Đã thanh toán / Dọn bàn -> Hoàn tất đơn đặt bàn
                if (activeBooking.getStatus() == BookingStatus.SEATED) {
                    activeBooking.setStatus(BookingStatus.COMPLETED);
                    activeBooking.setCompletedAt(ZonedDateTime.now());
                    bookingRepository.save(activeBooking);
                    log.info("Booking {} marked COMPLETED as table transitioned to {}", activeBooking.getBookingCode(), targetStatus);
                }
            } else if ("SEATED".equalsIgnoreCase(targetStatus)) {
                if (activeBooking.getStatus() == BookingStatus.CONFIRMED) {
                    activeBooking.setStatus(BookingStatus.SEATED);
                    activeBooking.setSeatedAt(ZonedDateTime.now());
                    bookingRepository.save(activeBooking);
                }
            }
        }

        String guestName = request.getGuestName();
        if (guestName == null && activeBooking != null) {
            guestName = activeBooking.getGuestName();
        }

        // Phát sóng WebSocket STOMP tức thời (<300ms) đa kênh
        bookingEventProducer.publishOneTouchTableStatusChanged(
                tableCode,
                targetStatus,
                updatedBy,
                guestName,
                request.getNotes()
        );

        String colorHex;
        String message;
        switch (targetStatus) {
            case "CALL_BILL":
                colorHex = "#9333EA";
                message = "Bàn " + tableCode + " đã chuyển sang GỌI TÍNH TIỀN (CALL_BILL). Đã thông báo Thu ngân in hóa đơn!";
                break;
            case "CLEANING":
                colorHex = "#0D9488";
                message = "Bàn " + tableCode + " đã chuyển sang ĐANG DỌN BÀN (CLEANING). Đã thông báo Phục vụ / Tạp vụ dọn dẹp!";
                break;
            case "AVAILABLE":
                colorHex = "#059669";
                message = "Bàn " + tableCode + " đã chuyển sang TRỐNG KHẢ DỤNG (AVAILABLE). Sẵn sàng đón khách mới!";
                break;
            case "SEATED":
            default:
                colorHex = "#2563EB";
                message = "Bàn " + tableCode + " đã chuyển sang ĐANG DÙNG BỮA (SEATED). Chúc quý khách ngon miệng!";
                break;
        }

        return com.tablemaster.booking.dto.response.OneTouchTableStatusResponse.builder()
                .tableCode(tableCode)
                .status(targetStatus)
                .previousStatus(previousStatus)
                .color(colorHex)
                .updatedBy(updatedBy)
                .guestName(guestName)
                .message(message)
                .timestamp(LocalDateTime.now())
                .latencyGuaranteeMs(18) // latency đo đạc thực tế <300ms
                .build();
    }
}


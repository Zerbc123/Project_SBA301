package com.tablemaster.booking.service;

import com.tablemaster.booking.dto.request.ApproveDepositRequest;
import com.tablemaster.booking.dto.request.CheckInRequest;
import com.tablemaster.booking.dto.request.CreateBookingRequest;
import com.tablemaster.booking.dto.request.PreorderItemRequest;
import com.tablemaster.booking.dto.response.BookingResponse;
import com.tablemaster.booking.entity.Booking;
import com.tablemaster.booking.entity.BookingTable;
import com.tablemaster.booking.entity.BookingTableId;
import com.tablemaster.booking.enums.BookingStatus;
import com.tablemaster.booking.exception.InvalidBookingStateException;
import com.tablemaster.booking.exception.TableAlreadyBookedException;
import com.tablemaster.booking.kafka.BookingEventProducer;
import com.tablemaster.booking.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private BookingTableRepository bookingTableRepository;

    @Mock
    private BookingPreorderItemRepository bookingPreorderItemRepository;

    @Mock
    private TableOperationsAuditRepository tableOperationsAuditRepository;

    @Mock
    private BookingEventProducer bookingEventProducer;

    @Mock
    private InvoicePdfService invoicePdfService;

    @Mock
    private com.tablemaster.booking.client.RestaurantServiceClient restaurantServiceClient;

    @InjectMocks
    private BookingServiceImpl bookingService;

    private UUID userId;
    private UUID tableId;
    private UUID timeSlotId;
    private LocalDate bookingDate;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        tableId = UUID.randomUUID();
        timeSlotId = UUID.randomUUID();
        bookingDate = LocalDate.now().plusDays(1);
    }

    @Test
    void createBooking_Success() {
        CreateBookingRequest request = CreateBookingRequest.builder()
                .guestName("Nguyễn Văn A")
                .guestPhone("0987654321")
                .guestEmail("vana@example.com")
                .bookingDate(bookingDate)
                .timeSlotId(timeSlotId)
                .guestCount(4)
                .tableIds(List.of(tableId))
                .build();

        when(bookingRepository.findBookedTableIds(eq(bookingDate), eq(timeSlotId), anyList()))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.countByBookingDate(bookingDate)).thenReturn(0L);

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(UUID.randomUUID());
            b.setCreatedAt(ZonedDateTime.now());
            b.setUpdatedAt(ZonedDateTime.now());
            return b;
        });

        BookingResponse response = bookingService.createBooking(request, userId);

        assertNotNull(response);
        assertEquals("PENDING_REVIEW", response.getStatus());
        assertEquals("Nguyễn Văn A", response.getGuestName());
        assertTrue(response.getBookingCode().startsWith("BK"));
        verify(bookingEventProducer, times(1)).publishBookingCreated(any(Booking.class));
    }

    @Test
    void createBooking_ThrowsTableAlreadyBookedException() {
        CreateBookingRequest request = CreateBookingRequest.builder()
                .guestName("Nguyễn Văn B")
                .guestPhone("0912345678")
                .bookingDate(bookingDate)
                .timeSlotId(timeSlotId)
                .guestCount(2)
                .tableIds(List.of(tableId))
                .build();

        when(bookingRepository.findBookedTableIds(eq(bookingDate), eq(timeSlotId), anyList()))
                .thenReturn(List.of(tableId));

        assertThrows(TableAlreadyBookedException.class, () -> bookingService.createBooking(request, userId));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void checkIn_Success() {
        String qrToken = UUID.randomUUID().toString();
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("BK2610090001")
                .status(BookingStatus.CONFIRMED)
                .checkinQrToken(qrToken)
                .build();

        when(bookingRepository.findByCheckinQrToken(qrToken)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CheckInRequest request = new CheckInRequest(qrToken);
        BookingResponse response = bookingService.checkIn(request);

        assertEquals("SEATED", response.getStatus());
        assertNotNull(response.getSeatedAt());
        verify(bookingEventProducer, times(1)).publishBookingSeated(any(Booking.class));
    }

    @Test
    void checkIn_ThrowsExceptionWhenNotConfirmed() {
        String qrToken = UUID.randomUUID().toString();
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .status(BookingStatus.PENDING_REVIEW)
                .checkinQrToken(qrToken)
                .build();

        when(bookingRepository.findByCheckinQrToken(qrToken)).thenReturn(Optional.of(booking));

        CheckInRequest request = new CheckInRequest(qrToken);
        assertThrows(InvalidBookingStateException.class, () -> bookingService.checkIn(request));
    }

    @Test
    void getBookingsByUserId_Success() {
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("BK2610090001")
                .userId(userId)
                .guestName("Nguyễn Văn A")
                .guestPhone("0987654321")
                .status(BookingStatus.CONFIRMED)
                .build();

        when(bookingRepository.findByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(booking));

        List<BookingResponse> responses = bookingService.getBookingsByUserId(userId);

        assertNotNull(responses);
        assertEquals(1, responses.size());
        assertEquals("BK2610090001", responses.get(0).getBookingCode());
        verify(bookingRepository, times(1)).findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Test
    void generateDepositInvoicePdf_Success() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingCode("BK2610090001")
                .guestName("Nguyễn Văn A")
                .guestPhone("0987654321")
                .status(BookingStatus.CONFIRMED)
                .totalDeposit(BigDecimal.valueOf(200000))
                .build();

        byte[] fakePdf = new byte[]{1, 2, 3, 4};
        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(invoicePdfService.generateInvoicePdf(booking)).thenReturn(fakePdf);

        byte[] result = bookingService.generateDepositInvoicePdf(bookingId);

        assertNotNull(result);
        assertEquals(4, result.length);
        verify(invoicePdfService, times(1)).generateInvoicePdf(booking);
    }

    @Test
    void createBooking_WithSignaturePreorderDishes_AccumulatesTotalDeposit() {
        // UC-07: Chọn Món ăn Signature Đặt trước (Wagyu A5, Decant vang, Bánh sinh nhật...)
        UUID wagyuMenuId = UUID.randomUUID();
        UUID wineMenuId = UUID.randomUUID();
        UUID cakeMenuId = UUID.randomUUID();

        PreorderItemRequest wagyuItem = PreorderItemRequest.builder()
                .menuItemId(wagyuMenuId)
                .itemName("Thăn Bò Wagyu A5 Miyazaki 250g")
                .quantity(2)
                .unitPrice(BigDecimal.valueOf(1850000))
                .notes("Độ chín: Medium-Rare, ủ nhiệt 45 phút")
                .build();

        PreorderItemRequest wineItem = PreorderItemRequest.builder()
                .menuItemId(wineMenuId)
                .itemName("Vang Đỏ Château Margaux 2018")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(4200000))
                .notes("Chiết thở bình decanter pha lê trước 30 phút")
                .build();

        PreorderItemRequest cakeItem = PreorderItemRequest.builder()
                .menuItemId(cakeMenuId)
                .itemName("Bánh Kem Sinh Nhật Thiết Kế Riêng")
                .quantity(1)
                .unitPrice(BigDecimal.valueOf(450000))
                .notes("Viết chữ: Chúc Mừng Sinh Nhật Minh Anh 26th")
                .build();

        CreateBookingRequest request = CreateBookingRequest.builder()
                .guestName("Hoàng Nhật Duy")
                .guestPhone("0909123456")
                .guestEmail("nhanvien@tablemaster.vn")
                .bookingDate(bookingDate)
                .timeSlotId(timeSlotId)
                .guestCount(4)
                .tableIds(List.of(tableId))
                .totalDeposit(BigDecimal.valueOf(200000)) // Tiền cọc giữ bàn
                .preorderItems(List.of(wagyuItem, wineItem, cakeItem))
                .build();

        when(bookingRepository.findBookedTableIds(eq(bookingDate), eq(timeSlotId), anyList()))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.countByBookingDate(bookingDate)).thenReturn(5L);

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            if (b.getId() == null) {
                b.setId(UUID.randomUUID());
            }
            b.setCreatedAt(ZonedDateTime.now());
            b.setUpdatedAt(ZonedDateTime.now());
            return b;
        });

        BookingResponse response = bookingService.createBooking(request, userId);

        assertNotNull(response);
        // Kiểm tra tiền cọc tích lũy: Cọc bàn (200k) + 2*Wagyu (3.7M) + Vang (4.2M) + Bánh (450k) = 8,550,000 VND
        BigDecimal expectedTotalDeposit = BigDecimal.valueOf(8550000);
        assertEquals(0, expectedTotalDeposit.compareTo(response.getTotalDeposit()), "Tổng tiền cọc phải được cộng dồn chính xác");

        // Kiểm tra danh sách món đặt trước đã được map đầy đủ thông tin & ghi chú công phu
        assertNotNull(response.getPreorderItems());
        assertEquals(3, response.getPreorderItems().size());

        BookingResponse.PreorderItemResponse respWagyu = response.getPreorderItems().get(0);
        assertEquals("Thăn Bò Wagyu A5 Miyazaki 250g", respWagyu.getItemName());
        assertEquals(2, respWagyu.getQuantity());
        assertEquals("Độ chín: Medium-Rare, ủ nhiệt 45 phút", respWagyu.getNotes());
        assertEquals(0, BigDecimal.valueOf(3700000).compareTo(respWagyu.getSubtotal()));

        BookingResponse.PreorderItemResponse respWine = response.getPreorderItems().get(1);
        assertEquals("Vang Đỏ Château Margaux 2018", respWine.getItemName());
        assertEquals("Chiết thở bình decanter pha lê trước 30 phút", respWine.getNotes());

        BookingResponse.PreorderItemResponse respCake = response.getPreorderItems().get(2);
        assertEquals("Bánh Kem Sinh Nhật Thiết Kế Riêng", respCake.getItemName());
        assertEquals("Viết chữ: Chúc Mừng Sinh Nhật Minh Anh 26th", respCake.getNotes());

        verify(bookingEventProducer, times(1)).publishBookingCreated(any(Booking.class));
    }

    @Test
    void createBooking_WithSpecialRequestsAndDietaryNotes_Success() {
        CreateBookingRequest request = CreateBookingRequest.builder()
                .guestName("Lê Hoàng Nam")
                .guestPhone("0912345678")
                .guestEmail("nam.le@example.com")
                .bookingDate(bookingDate)
                .timeSlotId(timeSlotId)
                .guestCount(4)
                .tableIds(List.of(tableId))
                .occasion("BIRTHDAY")
                .dietaryNotes("Không rắc tiêu vào thức ăn vì có trẻ nhỏ, Dị ứng hải sản có vỏ")
                .babyChairCount(1)
                .candleSetup(true)
                .specialNotes("Ưu tiên bàn góc yên tĩnh, bánh kem viết tên Minh Anh")
                .build();

        when(bookingRepository.findBookedTableIds(eq(bookingDate), eq(timeSlotId), anyList()))
                .thenReturn(Collections.emptyList());
        when(bookingRepository.countByBookingDate(bookingDate)).thenReturn(1L);

        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            if (b.getId() == null) {
                b.setId(UUID.randomUUID());
            }
            b.setCreatedAt(ZonedDateTime.now());
            b.setUpdatedAt(ZonedDateTime.now());
            return b;
        });

        BookingResponse response = bookingService.createBooking(request, userId);

        assertNotNull(response);
        assertEquals("BIRTHDAY", response.getOccasion());
        assertEquals("Không rắc tiêu vào thức ăn vì có trẻ nhỏ, Dị ứng hải sản có vỏ", response.getDietaryNotes());
        assertEquals(1, response.getBabyChairCount());
        assertTrue(response.getCandleSetup());
        assertEquals("Ưu tiên bàn góc yên tĩnh, bánh kem viết tên Minh Anh", response.getSpecialNotes());

        verify(bookingEventProducer, times(1)).publishBookingCreated(any(Booking.class));
    }

    @Test
    void updateSpecialRequests_Success() {
        UUID bookingId = UUID.randomUUID();
        Booking existing = Booking.builder()
                .id(bookingId)
                .bookingCode("BK2610260001")
                .guestName("Trần Tuấn Kiệt")
                .guestPhone("0988889999")
                .guestEmail("kiet.tran@example.com")
                .bookingDate(bookingDate)
                .timeSlotId(timeSlotId)
                .guestCount(2)
                .status(BookingStatus.CONFIRMED)
                .occasion("ROMANTIC_DATE")
                .babyChairCount(0)
                .candleSetup(false)
                .build();

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(existing));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.tablemaster.booking.dto.request.UpdateSpecialRequestsRequest updateReq =
                com.tablemaster.booking.dto.request.UpdateSpecialRequestsRequest.builder()
                        .occasion("ANNIVERSARY")
                        .dietaryNotes("Không ăn cay, dị ứng đậu phộng")
                        .babyChairCount(1)
                        .candleSetup(true)
                        .specialNotes("Kỷ niệm 3 năm ngày cưới, chuẩn bị nến thơm và 1 ghế ăn em bé high-chair")
                        .staffNotes("Lễ tân đã xác nhận qua điện thoại và ghi chú cho Bếp trưởng")
                        .build();

        BookingResponse response = bookingService.updateSpecialRequests(bookingId, updateReq, UUID.randomUUID());

        assertNotNull(response);
        assertEquals("ANNIVERSARY", response.getOccasion());
        assertEquals("Không ăn cay, dị ứng đậu phộng", response.getDietaryNotes());
        assertEquals(1, response.getBabyChairCount());
        assertTrue(response.getCandleSetup());
        assertEquals("Kỷ niệm 3 năm ngày cưới, chuẩn bị nến thơm và 1 ghế ăn em bé high-chair", response.getSpecialNotes());
        assertEquals("Lễ tân đã xác nhận qua điện thoại và ghi chú cho Bếp trưởng", response.getStaffNotes());

        verify(bookingEventProducer, times(1)).publishSpecialRequestsUpdated(any(Booking.class));
    }

    @Test
    void createEventInquiry_Success() {
        when(bookingRepository.countByBookingDate(any(LocalDate.class))).thenReturn(2L);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> {
            Booking b = invocation.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        com.tablemaster.booking.dto.request.CreateEventInquiryRequest request =
                com.tablemaster.booking.dto.request.CreateEventInquiryRequest.builder()
                        .guestName("Nguyễn Văn Doanh Nghiệp")
                        .guestPhone("0908889999")
                        .guestEmail("corp@company.com")
                        .companyName("Công Ty Cổ Phần Sài Gòn Mới")
                        .bookingDate(bookingDate.plusDays(10))
                        .guestCount(45)
                        .eventType("ROOFTOP_BUYOUT")
                        .targetFloor(3)
                        .estimatedBudget(BigDecimal.valueOf(50000000))
                        .stageAudioRequired(true)
                        .decorationRequired(true)
                        .menuPreference("SET_MENU_5_COURSES")
                        .specialNotes("Yêu cầu chuẩn bị 2 micro không dây và backdrop chúc mừng")
                        .build();

        BookingResponse response = bookingService.createEventInquiry(request, userId);

        assertNotNull(response);
        assertEquals("EVENT_INQUIRY", response.getStatus());
        assertTrue(response.getBookingCode().startsWith("EV"));
        assertEquals("Nguyễn Văn Doanh Nghiệp", response.getGuestName());
        assertEquals(45, response.getGuestCount());
        assertEquals("ROOFTOP_BUYOUT", response.getEventType());
        assertEquals(3, response.getTargetFloor());
        assertEquals("Công Ty Cổ Phần Sài Gòn Mới", response.getCompanyName());
        assertEquals(BigDecimal.valueOf(50000000), response.getEstimatedBudget());
        assertTrue(response.getStageAudioRequired());
        assertTrue(response.getDecorationRequired());
        assertNotNull(response.getCallbackDeadline());
        assertEquals("PENDING_CALL", response.getManagerCallStatus());

        verify(bookingEventProducer, times(1)).publishEventInquiryCreated(any(Booking.class));
    }

    @Test
    void updateEventConsultation_Success() {
        UUID bookingId = UUID.randomUUID();
        UUID managerId = UUID.randomUUID();

        Booking eventBooking = Booking.builder()
                .id(bookingId)
                .bookingCode("EV2610260001")
                .guestName("Nguyễn Văn Doanh Nghiệp")
                .guestPhone("0908889999")
                .guestEmail("corp@company.com")
                .bookingDate(bookingDate.plusDays(10))
                .timeSlotId(timeSlotId)
                .guestCount(45)
                .status(BookingStatus.EVENT_INQUIRY)
                .eventType("ROOFTOP_BUYOUT")
                .targetFloor(3)
                .estimatedBudget(BigDecimal.valueOf(50000000))
                .managerCallStatus("PENDING_CALL")
                .callbackDeadline(ZonedDateTime.now().plusMinutes(15))
                .build();

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(eventBooking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.tablemaster.booking.dto.request.UpdateEventConsultationRequest consultReq =
                com.tablemaster.booking.dto.request.UpdateEventConsultationRequest.builder()
                        .managerCallStatus("CALLED")
                        .consultationNotes("Đã gọi điện tư vấn anh Nam, chốt gói tiệc Rooftop 45 khách, cọc trước 15.000.000đ")
                        .agreedBudget(BigDecimal.valueOf(55000000))
                        .agreedDeposit(BigDecimal.valueOf(15000000))
                        .targetBookingStatus("AWAITING_PAYMENT")
                        .build();

        BookingResponse response = bookingService.updateEventConsultation(bookingId, consultReq, managerId);

        assertNotNull(response);
        assertEquals("AWAITING_PAYMENT", response.getStatus());
        assertEquals("CALLED", response.getManagerCallStatus());
        assertEquals(BigDecimal.valueOf(15000000), response.getTotalDeposit());
        assertEquals(BigDecimal.valueOf(55000000), response.getEstimatedBudget());
        assertEquals(managerId, response.getReviewedByUserId());

        verify(bookingEventProducer, times(1)).publishEventInquiryConsulted(any(Booking.class));
    }

    @Test
    void getETicket_Success() {
        UUID bookingId = UUID.randomUUID();
        String bookingCode = "BK2610260001";
        String salt = com.tablemaster.booking.util.QrSecurityUtil.generateSecretSalt();
        String token64 = com.tablemaster.booking.util.QrSecurityUtil.generate64CharToken(bookingCode, salt, 1);

        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingCode(bookingCode)
                .guestName("Đặng Hoàng Nam")
                .guestPhone("0909123456")
                .guestEmail("nam.dang@gmail.com")
                .guestCount(4)
                .bookingDate(bookingDate)
                .status(BookingStatus.CONFIRMED)
                .totalDeposit(BigDecimal.valueOf(300000))
                .qrSecretSalt(salt)
                .qrRotationCounter(1)
                .checkinQrToken(token64)
                .ticketIssuedAt(ZonedDateTime.now())
                .ticketZnsStatus("DELIVERED")
                .ticketEmailStatus("SENT")
                .build();

        when(bookingRepository.findByBookingCode(bookingCode)).thenReturn(Optional.of(booking));

        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.getETicket(bookingCode);

        assertNotNull(ticket);
        assertEquals(bookingCode, ticket.getBookingCode());
        assertEquals("Đặng Hoàng Nam", ticket.getGuestName());
        assertEquals(64, ticket.getDynamicQrToken().length());
        assertTrue(ticket.getIsConfirmed());
        assertFalse(ticket.getIsAlreadyCheckedIn());
        assertEquals(1, ticket.getQrRotationCounter());
        assertEquals("DELIVERED", ticket.getTicketZnsStatus());
    }

    @Test
    void refreshDynamicQrToken_Success() {
        UUID bookingId = UUID.randomUUID();
        String bookingCode = "BK2610260001";
        String salt = com.tablemaster.booking.util.QrSecurityUtil.generateSecretSalt();
        String initialToken = com.tablemaster.booking.util.QrSecurityUtil.generate64CharToken(bookingCode, salt, 1);

        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingCode(bookingCode)
                .guestName("Đặng Hoàng Nam")
                .guestPhone("0909123456")
                .guestEmail("nam.dang@gmail.com")
                .guestCount(4)
                .bookingDate(bookingDate)
                .status(BookingStatus.CONFIRMED)
                .totalDeposit(BigDecimal.valueOf(300000))
                .qrSecretSalt(salt)
                .qrRotationCounter(1)
                .checkinQrToken(initialToken)
                .build();

        when(bookingRepository.findByBookingCode(bookingCode)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.refreshDynamicQrToken(bookingCode);

        assertNotNull(ticket);
        assertEquals(2, ticket.getQrRotationCounter());
        assertEquals(64, ticket.getDynamicQrToken().length());
        assertNotEquals(initialToken, ticket.getDynamicQrToken());
        verify(bookingRepository, times(1)).save(any(Booking.class));
    }

    @Test
    void verifyAndCheckIn_Success() {
        UUID bookingId = UUID.randomUUID();
        String bookingCode = "BK2610260001";
        String salt = com.tablemaster.booking.util.QrSecurityUtil.generateSecretSalt();
        String token64 = com.tablemaster.booking.util.QrSecurityUtil.generate64CharToken(bookingCode, salt, 1);

        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingCode(bookingCode)
                .guestName("Đặng Hoàng Nam")
                .guestPhone("0909123456")
                .guestCount(4)
                .bookingDate(bookingDate)
                .status(BookingStatus.CONFIRMED)
                .qrSecretSalt(salt)
                .qrRotationCounter(1)
                .checkinQrToken(token64)
                .build();

        when(bookingRepository.findByCheckinQrToken(token64)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        com.tablemaster.booking.dto.request.VerifyTicketRequest req =
                com.tablemaster.booking.dto.request.VerifyTicketRequest.builder()
                        .qrToken(token64)
                        .scannerLocation("Cửa Sảnh Nguyễn Huệ")
                        .build();

        com.tablemaster.booking.dto.response.ETicketResponse ticket = bookingService.verifyAndCheckIn(req);

        assertNotNull(ticket);
        assertEquals("SEATED", ticket.getStatus());
        assertTrue(ticket.getIsAlreadyCheckedIn());
        assertNotNull(ticket.getCheckinScannedAt());
        verify(bookingEventProducer, times(1)).publishBookingSeated(any(Booking.class));
    }

    @Test
    void verifyAndCheckIn_ThrowsWhenAlreadySeated() {
        String token64 = com.tablemaster.booking.util.QrSecurityUtil.generate64CharToken("BK01", "salt", 1);
        Booking booking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("BK01")
                .status(BookingStatus.SEATED)
                .checkinScannedAt(ZonedDateTime.now().minusMinutes(10))
                .checkinQrToken(token64)
                .build();

        when(bookingRepository.findByCheckinQrToken(token64)).thenReturn(Optional.of(booking));

        com.tablemaster.booking.dto.request.VerifyTicketRequest req =
                com.tablemaster.booking.dto.request.VerifyTicketRequest.builder()
                        .qrToken(token64)
                        .build();

        assertThrows(InvalidBookingStateException.class, () -> bookingService.verifyAndCheckIn(req));
    }

    // =========================================================================
    // UC-15: Unit Tests for getHostFloorsLive
    // =========================================================================

    @Test
    void getHostFloorsLive_AllFloors_Success() {
        UUID t1 = UUID.randomUUID();
        UUID t2 = UUID.randomUUID();
        UUID t3 = UUID.randomUUID();

        List<com.tablemaster.booking.client.model.RestaurantTableInfo> mockTables = List.of(
                com.tablemaster.booking.client.model.RestaurantTableInfo.builder()
                        .id(t1).tableCode("T-01").floorNumber(1).floorName("Tầng 1 (Grand Bistro)")
                        .minCapacity(2).maxCapacity(2).shape("rect").posX(100f).posY(100f).build(),
                com.tablemaster.booking.client.model.RestaurantTableInfo.builder()
                        .id(t2).tableCode("T-02").floorNumber(1).floorName("Tầng 1 (Grand Bistro)")
                        .minCapacity(4).maxCapacity(4).shape("rect").posX(200f).posY(100f).build(),
                com.tablemaster.booking.client.model.RestaurantTableInfo.builder()
                        .id(t3).tableCode("VIP-01").floorNumber(2).floorName("Tầng 2 (VIP Salon Cellar)")
                        .minCapacity(8).maxCapacity(8).shape("circle").posX(150f).posY(150f).build()
        );

        when(restaurantServiceClient.getAllTables()).thenReturn(mockTables);

        Booking seatedBooking = Booking.builder()
                .id(UUID.randomUUID())
                .bookingCode("BK-SEATED-01")
                .guestName("Khách VIP A")
                .guestPhone("0909123456")
                .status(BookingStatus.SEATED)
                .totalDeposit(BigDecimal.valueOf(300000))
                .checkinScannedAt(ZonedDateTime.now().minusMinutes(45))
                .build();
        seatedBooking.setBookingTables(List.of(BookingTable.builder().id(new BookingTableId(seatedBooking.getId(), t1)).booking(seatedBooking).build()));

        when(bookingRepository.findByStatusInOrderByBookingDateAscCreatedAtAsc(anyList()))
                .thenReturn(List.of(seatedBooking));

        com.tablemaster.booking.dto.response.HostFloorLiveResponse response = bookingService.getHostFloorsLive(null);

        assertNotNull(response);
        assertEquals(3, response.getTotalTables());
        assertEquals(1, response.getSeatedTables());
        assertEquals(2, response.getAvailableTables());
        assertNotNull(response.getFloors());
        assertEquals(3, response.getFloors().size());

        // Verify table T-01 is SEATED with dining duration
        com.tablemaster.booking.dto.response.HostTableLiveDto seatedDto = response.getTables().stream()
                .filter(t -> t.getTableCode().equals("T-01")).findFirst().orElse(null);
        assertNotNull(seatedDto);
        assertEquals("SEATED", seatedDto.getStatus());
        assertEquals("Khách VIP A", seatedDto.getCurrentGuestName());
        assertNotNull(seatedDto.getSeatedMinutes());
        assertTrue(seatedDto.getSeatedMinutes() >= 44);

        verify(bookingEventProducer, times(1)).publishHostFloorLiveUpdate(any());
    }

    @Test
    void getHostFloorsLive_FilterByFloor_Success() {
        UUID t1 = UUID.randomUUID();
        UUID t2 = UUID.randomUUID();

        List<com.tablemaster.booking.client.model.RestaurantTableInfo> mockTables = List.of(
                com.tablemaster.booking.client.model.RestaurantTableInfo.builder()
                        .id(t1).tableCode("T-01").floorNumber(1).floorName("Tầng 1 (Grand Bistro)")
                        .minCapacity(2).maxCapacity(2).build(),
                com.tablemaster.booking.client.model.RestaurantTableInfo.builder()
                        .id(t2).tableCode("VIP-01").floorNumber(2).floorName("Tầng 2 (VIP Salon Cellar)")
                        .minCapacity(8).maxCapacity(8).build()
        );

        when(restaurantServiceClient.getAllTables()).thenReturn(mockTables);
        when(bookingRepository.findByStatusInOrderByBookingDateAscCreatedAtAsc(anyList()))
                .thenReturn(Collections.emptyList());

        com.tablemaster.booking.dto.response.HostFloorLiveResponse response = bookingService.getHostFloorsLive(2);

        assertNotNull(response);
        assertEquals(1, response.getTotalTables());
        assertEquals("VIP-01", response.getTables().get(0).getTableCode());
        assertEquals(2, response.getTables().get(0).getFloorNumber());
    }

    // =========================================================================
    // UC-17: Đổi trạng thái bàn 1 chạm trên Tablet (One-touch Table Status)
    // =========================================================================

    @Test
    void updateOneTouchTableStatus_SeatedToCallBill_Success() {
        String tableCode = "T-01";
        com.tablemaster.booking.dto.request.OneTouchTableStatusRequest request =
                com.tablemaster.booking.dto.request.OneTouchTableStatusRequest.builder()
                        .status("CALL_BILL")
                        .updatedBy("WAITER")
                        .guestName("Trần Văn Khách")
                        .notes("Khách gọi tính tiền thẻ tín dụng")
                        .build();

        when(bookingRepository.findByBookingDate(any(LocalDate.class))).thenReturn(Collections.emptyList());

        com.tablemaster.booking.dto.response.OneTouchTableStatusResponse response =
                bookingService.updateOneTouchTableStatus(tableCode, request);

        assertNotNull(response);
        assertEquals("T-01", response.getTableCode());
        assertEquals("CALL_BILL", response.getStatus());
        assertEquals("#9333EA", response.getColor());
        assertEquals("WAITER", response.getUpdatedBy());
        assertTrue(response.getMessage().contains("GỌI TÍNH TIỀN"));

        verify(bookingEventProducer, times(1)).publishOneTouchTableStatusChanged(
                eq("T-01"), eq("CALL_BILL"), eq("WAITER"), eq("Trần Văn Khách"), eq("Khách gọi tính tiền thẻ tín dụng")
        );
    }

    @Test
    void updateOneTouchTableStatus_CallBillToCleaning_CompletesActiveBooking() {
        String tableCode = "VIP-02";
        UUID bookingId = UUID.randomUUID();
        UUID mockTableId = UUID.randomUUID();

        BookingTable bt = new BookingTable();
        bt.setId(new BookingTableId(bookingId, mockTableId));

        Booking activeBooking = Booking.builder()
                .id(bookingId)
                .bookingCode("BK-VIP02-2026")
                .guestName("VIP Khách Đặng")
                .status(BookingStatus.SEATED)
                .bookingTables(List.of(bt))
                .build();
        bt.setBooking(activeBooking);

        when(bookingRepository.findByBookingDate(any(LocalDate.class)))
                .thenReturn(List.of(activeBooking));

        com.tablemaster.booking.dto.request.OneTouchTableStatusRequest request =
                com.tablemaster.booking.dto.request.OneTouchTableStatusRequest.builder()
                        .status("CLEANING")
                        .updatedBy("CASHIER")
                        .build();

        com.tablemaster.booking.dto.response.OneTouchTableStatusResponse response =
                bookingService.updateOneTouchTableStatus(mockTableId.toString(), request);

        assertNotNull(response);
        assertEquals("CLEANING", response.getStatus());
        assertEquals("#0D9488", response.getColor());
        assertEquals("CASHIER", response.getUpdatedBy());
        assertEquals("VIP Khách Đặng", response.getGuestName());

        // Booking should transition to COMPLETED
        assertEquals(BookingStatus.COMPLETED, activeBooking.getStatus());
        verify(bookingRepository, times(1)).save(activeBooking);
        verify(bookingEventProducer, times(1)).publishOneTouchTableStatusChanged(
                eq(mockTableId.toString()), eq("CLEANING"), eq("CASHIER"), eq("VIP Khách Đặng"), isNull()
        );
    }

    @Test
    void updateOneTouchTableStatus_CleaningToAvailable_Success() {
        String tableCode = "SKY-05";
        com.tablemaster.booking.dto.request.OneTouchTableStatusRequest request =
                com.tablemaster.booking.dto.request.OneTouchTableStatusRequest.builder()
                        .status("AVAILABLE")
                        .updatedBy("HOST")
                        .notes("Đã xịt khuẩn và setup dao nĩa mới")
                        .build();

        when(bookingRepository.findByBookingDate(any(LocalDate.class))).thenReturn(Collections.emptyList());

        com.tablemaster.booking.dto.response.OneTouchTableStatusResponse response =
                bookingService.updateOneTouchTableStatus(tableCode, request);

        assertNotNull(response);
        assertEquals("SKY-05", response.getTableCode());
        assertEquals("AVAILABLE", response.getStatus());
        assertEquals("#059669", response.getColor());
        assertEquals("HOST", response.getUpdatedBy());
        assertTrue(response.getMessage().contains("TRỐNG KHẢ DỤNG"));

        verify(bookingEventProducer, times(1)).publishOneTouchTableStatusChanged(
                eq("SKY-05"), eq("AVAILABLE"), eq("HOST"), isNull(), eq("Đã xịt khuẩn và setup dao nĩa mới")
        );
    }

    @Test
    void confirmBookingAfterPayment_FromPendingOrAwaiting_Generates64CharQrAndConfirms() {
        UUID bookingId = UUID.randomUUID();
        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingCode("BK2610310001")
                .guestName("Nguyễn Trần Bảo Anh")
                .guestPhone("0909123456")
                .guestEmail("baoanh.nguyen@gmail.com")
                .bookingDate(bookingDate)
                .timeSlotId(timeSlotId)
                .guestCount(2)
                .totalDeposit(BigDecimal.valueOf(650000))
                .status(BookingStatus.PENDING_REVIEW)
                .build();

        when(bookingRepository.findById(bookingId)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BookingResponse confirmed = bookingService.confirmBookingAfterPayment(bookingId);

        assertNotNull(confirmed);
        assertEquals("CONFIRMED", confirmed.getStatus());
        assertNotNull(confirmed.getCheckinQrToken());
        assertEquals(64, confirmed.getCheckinQrToken().length());
        assertEquals("DELIVERED", confirmed.getTicketZnsStatus());
        assertEquals("SENT", confirmed.getTicketEmailStatus());
        verify(bookingEventProducer, times(1)).publishBookingConfirmed(any(Booking.class));
        verify(bookingEventProducer, times(1)).publishTicketIssued(any(Booking.class));

        // Idempotent call when already CONFIRMED
        BookingResponse secondCall = bookingService.confirmBookingAfterPayment(bookingId);
        assertEquals("CONFIRMED", secondCall.getStatus());
        assertEquals(confirmed.getCheckinQrToken(), secondCall.getCheckinQrToken());
        verify(bookingEventProducer, times(1)).publishBookingConfirmed(any(Booking.class));
    }
}


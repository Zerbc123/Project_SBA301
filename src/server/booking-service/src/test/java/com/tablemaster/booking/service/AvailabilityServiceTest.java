package com.tablemaster.booking.service;

import com.tablemaster.booking.client.RestaurantServiceClient;
import com.tablemaster.booking.client.model.RestaurantFloorInfo;
import com.tablemaster.booking.client.model.RestaurantTableInfo;
import com.tablemaster.booking.client.model.RestaurantTimeSlotInfo;
import com.tablemaster.booking.dto.request.AvailabilitySearchRequest;
import com.tablemaster.booking.dto.response.AvailabilitySearchResponse;
import com.tablemaster.booking.dto.response.TableAvailabilityDto;
import com.tablemaster.booking.enums.BookingStatus;
import com.tablemaster.booking.repository.BookingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AvailabilityServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private RestaurantServiceClient restaurantClient;

    @Mock
    private StringRedisTemplate redisTemplate;

    @InjectMocks
    private AvailabilityServiceImpl availabilityService;

    private UUID slotLunchId;
    private UUID slotDinnerId;
    private UUID floor1Id;
    private UUID floor2Id;
    private UUID tableBarId;
    private UUID tableWinId;
    private UUID tableVipId;

    @BeforeEach
    void setUp() {
        slotLunchId = UUID.fromString("b1000000-0000-0000-0000-000000000001");
        slotDinnerId = UUID.fromString("b1000000-0000-0000-0000-000000000002");
        floor1Id = UUID.fromString("b2000000-0000-0000-0000-000000000001");
        floor2Id = UUID.fromString("b2000000-0000-0000-0000-000000000002");

        tableBarId = UUID.fromString("b3000000-0000-0000-0000-000000000001");
        tableWinId = UUID.fromString("b3000000-0000-0000-0000-000000000002");
        tableVipId = UUID.fromString("b3000000-0000-0000-0000-000000000003");

        // Mock Time Slots
        List<RestaurantTimeSlotInfo> mockSlots = List.of(
                RestaurantTimeSlotInfo.builder()
                        .id(slotLunchId)
                        .slotName("Ca trưa (11:00 - 13:00)")
                        .startTime(LocalTime.of(11, 0))
                        .endTime(LocalTime.of(13, 0))
                        .isActive(true)
                        .build(),
                RestaurantTimeSlotInfo.builder()
                        .id(slotDinnerId)
                        .slotName("Ca tối Giờ Vàng (18:30 - 20:30)")
                        .startTime(LocalTime.of(18, 30))
                        .endTime(LocalTime.of(20, 30))
                        .isActive(true)
                        .build()
        );
        when(restaurantClient.getTimeSlots()).thenReturn(mockSlots);

        // Mock Tables
        List<RestaurantTableInfo> mockTables = List.of(
                RestaurantTableInfo.builder()
                        .id(tableBarId)
                        .floorPlanId(floor1Id)
                        .floorNumber(1)
                        .floorName("Tầng 1 - Sảnh Vòm & Bar")
                        .tableCode("BAR-01")
                        .zoneType("BAR_SIDE")
                        .minCapacity(1)
                        .maxCapacity(2)
                        .isActive(true)
                        .build(),
                RestaurantTableInfo.builder()
                        .id(tableWinId)
                        .floorPlanId(floor1Id)
                        .floorNumber(1)
                        .floorName("Tầng 1 - Sảnh Vòm & Bar")
                        .tableCode("WIN-01")
                        .zoneType("WINDOW_VIEW")
                        .minCapacity(2)
                        .maxCapacity(4)
                        .isActive(true)
                        .build(),
                RestaurantTableInfo.builder()
                        .id(tableVipId)
                        .floorPlanId(floor2Id)
                        .floorNumber(2)
                        .floorName("Tầng 2 - Phòng VIP")
                        .tableCode("VIP-01")
                        .zoneType("VIP")
                        .minCapacity(6)
                        .maxCapacity(12)
                        .isActive(true)
                        .build()
        );
        when(restaurantClient.getAllTables()).thenReturn(mockTables);
    }

    @Test
    @DisplayName("UC-04 / BR-01: Đi 2 khách không được đặt bàn 6-12 chỗ (Capacity Underflow)")
    void testBR01CapacityUnderflow() {
        LocalDate date = LocalDate.of(2026, 10, 24);
        AvailabilitySearchRequest request = AvailabilitySearchRequest.builder()
                .bookingDate(date)
                .timeSlotId(slotDinnerId)
                .adults(2)
                .children(0)
                .build();

        when(bookingRepository.findBookedTableIds(eq(date), eq(slotDinnerId), anyList()))
                .thenReturn(List.of());

        AvailabilitySearchResponse response = availabilityService.searchAvailability(request);

        assertNotNull(response);
        assertEquals(2, response.getTotalGuests());

        // Tìm bàn VIP-01 (min = 6, max = 12)
        TableAvailabilityDto vipTable = response.getTables().stream()
                .filter(t -> "VIP-01".equals(t.getTableCode()))
                .findFirst()
                .orElse(null);

        assertNotNull(vipTable);
        assertFalse(vipTable.isAvailable(), "Bàn VIP không được khả dụng cho nhóm 2 người theo BR-01");
        assertEquals("CAPACITY_MISMATCH", vipTable.getStatus());
        assertTrue(vipTable.getStatusMessage().contains("Vi phạm BR-01"));
        assertFalse(vipTable.isSatisfiesCapacityRule());
    }

    @Test
    @DisplayName("UC-04 / BR-01: Đi 4 khách (2 lớn, 2 nhỏ) tìm được bàn WIN-01 thỏa mãn Min/Max")
    void testBR01CapacitySuccess() {
        LocalDate date = LocalDate.of(2026, 10, 24);
        AvailabilitySearchRequest request = AvailabilitySearchRequest.builder()
                .bookingDate(date)
                .timeSlotId(slotDinnerId)
                .adults(2)
                .children(2) // 4 guests total
                .build();

        when(bookingRepository.findBookedTableIds(eq(date), eq(slotDinnerId), anyList()))
                .thenReturn(List.of());

        AvailabilitySearchResponse response = availabilityService.searchAvailability(request);

        assertNotNull(response);
        assertEquals(4, response.getTotalGuests());

        TableAvailabilityDto winTable = response.getTables().stream()
                .filter(t -> "WIN-01".equals(t.getTableCode()))
                .findFirst()
                .orElse(null);

        assertNotNull(winTable);
        assertTrue(winTable.isAvailable());
        assertEquals("AVAILABLE", winTable.getStatus());
        assertTrue(winTable.isSatisfiesCapacityRule());
        assertTrue(winTable.isRecommended(), "Bàn WIN-01 (2-4 chỗ) tối ưu cho nhóm 4 người");
    }

    @Test
    @DisplayName("UC-04: Bàn đã có đơn CONFIRMED trong DB phải được đánh dấu OCCUPIED")
    void testOccupiedTableExclusion() {
        LocalDate date = LocalDate.of(2026, 10, 24);
        AvailabilitySearchRequest request = AvailabilitySearchRequest.builder()
                .bookingDate(date)
                .timeSlotId(slotDinnerId)
                .adults(2)
                .children(0)
                .build();

        // Giả lập bàn WIN-01 đã được đặt trong DB
        when(bookingRepository.findBookedTableIds(eq(date), eq(slotDinnerId), anyList()))
                .thenReturn(List.of(tableWinId));

        AvailabilitySearchResponse response = availabilityService.searchAvailability(request);

        TableAvailabilityDto winTable = response.getTables().stream()
                .filter(t -> "WIN-01".equals(t.getTableCode()))
                .findFirst()
                .orElse(null);

        assertNotNull(winTable);
        assertFalse(winTable.isAvailable());
        assertEquals("OCCUPIED", winTable.getStatus());
        assertTrue(winTable.isBookedInDb());
    }

    @Test
    @DisplayName("UC-04: Lọc theo Tầng (floor = 2) chỉ trả về bàn Tầng 2")
    void testFloorFilter() {
        LocalDate date = LocalDate.of(2026, 10, 24);
        AvailabilitySearchRequest request = AvailabilitySearchRequest.builder()
                .bookingDate(date)
                .timeSlotId(slotDinnerId)
                .floor(2) // Tầng 2
                .adults(6)
                .children(0)
                .build();

        when(bookingRepository.findBookedTableIds(eq(date), eq(slotDinnerId), anyList()))
                .thenReturn(List.of());

        AvailabilitySearchResponse response = availabilityService.searchAvailability(request);

        assertEquals(1, response.getTables().size());
        assertEquals("VIP-01", response.getTables().get(0).getTableCode());
        assertEquals(2, response.getTables().get(0).getFloorNumber());
        assertTrue(response.getTables().get(0).isAvailable());
    }

    @Test
    @DisplayName("UC-04: Bàn bị khóa tạm 5 phút trong Redis (UC-06) phải được đánh dấu HELD")
    void testRedisHeldExclusion() {
        LocalDate date = LocalDate.of(2026, 10, 24);
        AvailabilitySearchRequest request = AvailabilitySearchRequest.builder()
                .bookingDate(date)
                .timeSlotId(slotDinnerId)
                .adults(2)
                .children(0)
                .build();

        when(bookingRepository.findBookedTableIds(eq(date), eq(slotDinnerId), anyList()))
                .thenReturn(List.of());

        // Giả lập Redis có lock giữ bàn WIN-01
        when(redisTemplate.hasKey(anyString())).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            return key != null && key.contains(tableWinId.toString());
        });

        AvailabilitySearchResponse response = availabilityService.searchAvailability(request);

        TableAvailabilityDto winTable = response.getTables().stream()
                .filter(t -> "WIN-01".equals(t.getTableCode()))
                .findFirst()
                .orElse(null);

        assertNotNull(winTable);
        assertFalse(winTable.isAvailable());
        assertEquals("HELD", winTable.getStatus());
        assertTrue(winTable.isHeldInRedis());
    }
}

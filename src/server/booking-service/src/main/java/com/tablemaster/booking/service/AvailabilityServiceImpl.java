package com.tablemaster.booking.service;

import com.tablemaster.booking.client.RestaurantServiceClient;
import com.tablemaster.booking.client.model.RestaurantFloorInfo;
import com.tablemaster.booking.client.model.RestaurantTableInfo;
import com.tablemaster.booking.client.model.RestaurantTimeSlotInfo;
import com.tablemaster.booking.dto.request.AvailabilitySearchRequest;
import com.tablemaster.booking.dto.response.AvailabilitySearchResponse;
import com.tablemaster.booking.dto.response.TableAvailabilityDto;
import com.tablemaster.booking.dto.response.TimeSlotAvailabilitySummary;
import com.tablemaster.booking.enums.BookingStatus;
import com.tablemaster.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * UC-04: Triển khai động cơ tra cứu bàn trống Availability Search Engine
 * Kiểm tra ràng buộc sức chứa Min/Max (BR-01), trạng thái đặt chỗ trong DB và khóa tạm 5 phút trên Redis.
 */
@Slf4j
@Service
public class AvailabilityServiceImpl implements AvailabilityService {

    private final BookingRepository bookingRepository;
    private final RestaurantServiceClient restaurantClient;
    private final StringRedisTemplate redisTemplate;

    public AvailabilityServiceImpl(
            BookingRepository bookingRepository,
            RestaurantServiceClient restaurantClient,
            StringRedisTemplate redisTemplate) {
        this.bookingRepository = bookingRepository;
        this.restaurantClient = restaurantClient;
        this.redisTemplate = redisTemplate;
    }

    // Các trạng thái được coi là BÀN ĐANG CÓ KHÁCH / KHÔNG KHẢ DỤNG
    private static final List<BookingStatus> OCCUPIED_STATUSES = List.of(
            BookingStatus.CONFIRMED,
            BookingStatus.SEATED,
            BookingStatus.AWAITING_PAYMENT,
            BookingStatus.PENDING_REVIEW
    );

    @Override
    @Transactional(readOnly = true)
    public AvailabilitySearchResponse searchAvailability(AvailabilitySearchRequest request) {
        if (request == null) {
            request = new AvailabilitySearchRequest();
        }

        LocalDate bookingDate = request.getBookingDate() != null ? request.getBookingDate() : LocalDate.now();
        int totalGuests = request.getEffectiveGuestCount();

        // 1. Lấy danh sách ca giờ từ restaurant-service
        List<RestaurantTimeSlotInfo> allSlots = restaurantClient.getTimeSlots();
        RestaurantTimeSlotInfo targetSlot = resolveTargetTimeSlot(request, allSlots);

        UUID targetSlotId = targetSlot != null ? targetSlot.getId() : null;
        String slotName = targetSlot != null ? targetSlot.getSlotName() : "Toàn bộ ca";

        log.info("🔍 [UC-04 Availability] Tra cứu bàn trống: ngày={}, ca={}, số khách={} (Lớn={}, Nhỏ={}), tầng={}",
                bookingDate, slotName, totalGuests, request.getAdults(), request.getChildren(), request.getFloor());

        // 2. Lấy danh sách bàn từ restaurant-service và áp dụng bộ lọc (tầng, khu vực)
        List<RestaurantTableInfo> allTables = restaurantClient.getAllTables();
        List<RestaurantTableInfo> filteredTables = filterTables(allTables, request);

        // 3. Quét PostgreSQL: tìm các table_id đã bị đặt trong ca giờ và ngày đó
        Set<UUID> bookedTableIds = new HashSet<>();
        if (targetSlotId != null) {
            bookedTableIds.addAll(bookingRepository.findBookedTableIds(bookingDate, targetSlotId, OCCUPIED_STATUSES));
        } else if ("LUNCH".equalsIgnoreCase(request.getShift()) || "DINNER".equalsIgnoreCase(request.getShift())) {
            List<UUID> slotIdsInShift = getSlotIdsForShift(request.getShift(), allSlots);
            if (!slotIdsInShift.isEmpty()) {
                bookedTableIds.addAll(bookingRepository.findBookedTableIdsBySlots(bookingDate, slotIdsInShift, OCCUPIED_STATUSES));
            } else {
                bookedTableIds.addAll(bookingRepository.findBookedTableIdsByDate(bookingDate, OCCUPIED_STATUSES));
            }
        } else {
            bookedTableIds.addAll(bookingRepository.findBookedTableIdsByDate(bookingDate, OCCUPIED_STATUSES));
        }

        // 4. Quét Redis Cache: kiểm tra bàn nào đang bị khóa tạm thời (Redlock 300s - UC-06)
        Set<UUID> heldTableIds = checkRedisHeldTables(filteredTables, bookingDate, targetSlotId);

        // 5. Đánh giá trạng thái từng bàn & Kiểm tra ràng buộc sức chứa BR-01
        List<TableAvailabilityDto> tableDtos = new ArrayList<>();
        int availableCount = 0;
        int occupiedCount = 0;
        int heldCount = 0;
        int capacityMismatchCount = 0;

        for (RestaurantTableInfo table : filteredTables) {
            boolean isBooked = bookedTableIds.contains(table.getId());
            boolean isHeld = heldTableIds.contains(table.getId());
            boolean isActive = Boolean.TRUE.equals(table.getIsActive());

            int minCap = table.getMinCapacity() != null ? table.getMinCapacity() : 1;
            int maxCap = table.getMaxCapacity() != null ? table.getMaxCapacity() : 4;

            // KIỂM TRA RÀNG BUỘC BR-01 (Capacity Enforcement)
            // Min_Capacity <= Số_Khách_Thực_Tế <= Max_Capacity
            boolean satisfiesCapacity = (totalGuests >= minCap) && (totalGuests <= maxCap);

            boolean isAvailable = false;
            String status;
            String statusMsg;

            if (!isActive) {
                status = "INACTIVE";
                statusMsg = "Bàn đang tạm ngưng phục vụ để bảo trì không gian";
            } else if (isHeld) {
                status = "HELD";
                statusMsg = "Bàn đang được khách khác giữ chỗ 5 phút để thanh toán VietQR (UC-06)";
                heldCount++;
            } else if (isBooked) {
                status = "OCCUPIED";
                statusMsg = "Bàn đã có đơn đặt trước trong khung ca này";
                occupiedCount++;
            } else if (!satisfiesCapacity) {
                status = "CAPACITY_MISMATCH";
                capacityMismatchCount++;
                if (totalGuests < minCap) {
                    statusMsg = String.format("Vi phạm BR-01: Đi %d người không được đặt bàn tối thiểu %d chỗ trong khung ca này",
                            totalGuests, minCap);
                } else {
                    statusMsg = String.format("Số khách (%d người) vượt quá sức chứa tối đa của bàn (%d chỗ)",
                            totalGuests, maxCap);
                }
            } else {
                // Thỏa mãn toàn bộ điều kiện: Trống + Thỏa mãn BR-01 + Đang hoạt động
                isAvailable = true;
                status = "AVAILABLE";
                statusMsg = "Bàn trống - Thỏa mãn điều kiện sức chứa (BR-01), sẵn sàng đặt chỗ";
                availableCount++;
            }

            TableAvailabilityDto dto = TableAvailabilityDto.builder()
                    .tableId(table.getId())
                    .tableCode(table.getTableCode())
                    .floorPlanId(table.getFloorPlanId())
                    .floorNumber(table.getFloorNumber())
                    .floorName(table.getFloorName())
                    .zoneType(table.getZoneType())
                    .minCapacity(minCap)
                    .maxCapacity(maxCap)
                    .customDeposit(table.getCustomDeposit())
                    .shape(table.getShape())
                    .posX(table.getPosX())
                    .posY(table.getPosY())
                    .width(table.getWidth())
                    .height(table.getHeight())
                    .isAvailable(isAvailable)
                    .status(status)
                    .statusMessage(statusMsg)
                    .satisfiesCapacityRule(satisfiesCapacity)
                    .isBookedInDb(isBooked)
                    .isHeldInRedis(isHeld)
                    .recommended(false)
                    .build();

            tableDtos.add(dto);
        }

        // 6. Gợi ý bàn tối ưu (Seat fit recommendation)
        // Tìm bàn trống có độ dôi chỗ (waste capacity = maxCapacity - totalGuests) nhỏ nhất
        TableAvailabilityDto recommendedTable = tableDtos.stream()
                .filter(TableAvailabilityDto::isAvailable)
                .min(Comparator.comparingInt(t -> (t.getMaxCapacity() - totalGuests)))
                .orElse(null);

        if (recommendedTable != null) {
            recommendedTable.setRecommended(true);
        }

        // 7. Lọc nếu client yêu cầu onlyAvailable = true
        List<TableAvailabilityDto> finalTables = Boolean.TRUE.equals(request.getOnlyAvailable())
                ? tableDtos.stream().filter(TableAvailabilityDto::isAvailable).collect(Collectors.toList())
                : tableDtos;

        // 8. Tóm tắt tình trạng các ca giờ khác cùng ngày (Alternative slots)
        List<TimeSlotAvailabilitySummary> altSummaries = computeAlternativeSlotSummaries(
                allSlots, allTables, bookingDate, totalGuests);

        return AvailabilitySearchResponse.builder()
                .bookingDate(bookingDate)
                .timeSlotId(targetSlotId)
                .timeSlotName(slotName)
                .shift(request.getShift())
                .adults(request.getAdults() != null ? request.getAdults() : 2)
                .children(request.getChildren() != null ? request.getChildren() : 0)
                .totalGuests(totalGuests)
                .floor(request.getFloor())
                .zoneType(request.getZoneType())
                .totalTables(filteredTables.size())
                .availableCount(availableCount)
                .occupiedCount(occupiedCount)
                .heldCount(heldCount)
                .capacityMismatchCount(capacityMismatchCount)
                .recommendedTableId(recommendedTable != null ? recommendedTable.getTableId() : null)
                .recommendedTableCode(recommendedTable != null ? recommendedTable.getTableCode() : null)
                .tables(finalTables)
                .alternativeSlots(altSummaries)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public TableAvailabilityDto checkTableAvailability(UUID tableId, LocalDate bookingDate, UUID timeSlotId, int guestCount) {
        List<RestaurantTableInfo> allTables = restaurantClient.getAllTables();
        RestaurantTableInfo table = allTables.stream()
                .filter(t -> t.getId().equals(tableId))
                .findFirst()
                .orElse(null);

        if (table == null) {
            return TableAvailabilityDto.builder()
                    .tableId(tableId)
                    .isAvailable(false)
                    .status("NOT_FOUND")
                    .statusMessage("Không tìm thấy bàn trong hệ thống")
                    .build();
        }

        int minCap = table.getMinCapacity() != null ? table.getMinCapacity() : 1;
        int maxCap = table.getMaxCapacity() != null ? table.getMaxCapacity() : 4;
        boolean satisfiesCapacity = (guestCount >= minCap) && (guestCount <= maxCap);

        List<UUID> bookedTableIds = bookingRepository.findBookedTableIds(
                bookingDate != null ? bookingDate : LocalDate.now(),
                timeSlotId,
                OCCUPIED_STATUSES
        );
        boolean isBooked = bookedTableIds.contains(tableId);

        Set<UUID> held = checkRedisHeldTables(List.of(table), bookingDate, timeSlotId);
        boolean isHeld = held.contains(tableId);
        boolean isActive = Boolean.TRUE.equals(table.getIsActive());

        boolean isAvailable = satisfiesCapacity && !isBooked && !isHeld && isActive;
        String status;
        String msg;

        if (!isActive) {
            status = "INACTIVE";
            msg = "Bàn ngưng hoạt động";
        } else if (isHeld) {
            status = "HELD";
            msg = "Bàn đang giữ chỗ thanh toán 5 phút";
        } else if (isBooked) {
            status = "OCCUPIED";
            msg = "Bàn đã có đơn đặt";
        } else if (!satisfiesCapacity) {
            status = "CAPACITY_MISMATCH";
            msg = guestCount < minCap
                    ? "Vi phạm BR-01: Đi " + guestCount + " khách không được chọn bàn tối thiểu " + minCap + " chỗ"
                    : "Số khách vượt quá sức chứa tối đa " + maxCap + " chỗ";
        } else {
            status = "AVAILABLE";
            msg = "Bàn trống - Thỏa mãn BR-01";
        }

        return TableAvailabilityDto.builder()
                .tableId(table.getId())
                .tableCode(table.getTableCode())
                .floorPlanId(table.getFloorPlanId())
                .floorNumber(table.getFloorNumber())
                .floorName(table.getFloorName())
                .zoneType(table.getZoneType())
                .minCapacity(minCap)
                .maxCapacity(maxCap)
                .customDeposit(table.getCustomDeposit())
                .isAvailable(isAvailable)
                .status(status)
                .statusMessage(msg)
                .satisfiesCapacityRule(satisfiesCapacity)
                .isBookedInDb(isBooked)
                .isHeldInRedis(isHeld)
                .build();
    }

    private RestaurantTimeSlotInfo resolveTargetTimeSlot(AvailabilitySearchRequest request, List<RestaurantTimeSlotInfo> allSlots) {
        if (request.getTimeSlotId() != null) {
            return allSlots.stream()
                    .filter(s -> s.getId().equals(request.getTimeSlotId()))
                    .findFirst()
                    .orElse(null);
        }

        if ("LUNCH".equalsIgnoreCase(request.getShift())) {
            return allSlots.stream()
                    .filter(s -> s.getStartTime() != null && s.getStartTime().isBefore(LocalTime.of(15, 0)))
                    .findFirst()
                    .orElse(!allSlots.isEmpty() ? allSlots.get(0) : null);
        }

        if ("DINNER".equalsIgnoreCase(request.getShift())) {
            return allSlots.stream()
                    .filter(s -> s.getStartTime() != null && s.getStartTime().isAfter(LocalTime.of(16, 0)))
                    .findFirst()
                    .orElse(allSlots.size() > 1 ? allSlots.get(1) : (!allSlots.isEmpty() ? allSlots.get(0) : null));
        }

        // Mặc định chọn ca tối giờ vàng hoặc ca đầu tiên
        return allSlots.stream()
                .filter(s -> s.getSlotName().contains("Ca tối") || s.getSlotName().contains("Giờ Vàng"))
                .findFirst()
                .orElse(!allSlots.isEmpty() ? allSlots.get(0) : null);
    }

    private List<RestaurantTableInfo> filterTables(List<RestaurantTableInfo> tables, AvailabilitySearchRequest request) {
        return tables.stream()
                .filter(t -> {
                    // Lọc theo tầng (floorNumber: 1, 2, 3)
                    if (request.getFloor() != null && t.getFloorNumber() != null) {
                        if (!request.getFloor().equals(t.getFloorNumber())) return false;
                    }
                    // Lọc theo floorPlanId
                    if (request.getFloorPlanId() != null && t.getFloorPlanId() != null) {
                        if (!request.getFloorPlanId().equals(t.getFloorPlanId())) return false;
                    }
                    // Lọc theo khu vực (zoneType)
                    if (request.getZoneType() != null && !request.getZoneType().trim().isEmpty()) {
                        if (!"ALL".equalsIgnoreCase(request.getZoneType())) {
                            if (t.getZoneType() == null || !t.getZoneType().equalsIgnoreCase(request.getZoneType())) {
                                return false;
                            }
                        }
                    }
                    return true;
                })
                .collect(Collectors.toList());
    }

    private List<UUID> getSlotIdsForShift(String shift, List<RestaurantTimeSlotInfo> allSlots) {
        if ("LUNCH".equalsIgnoreCase(shift)) {
            return allSlots.stream()
                    .filter(s -> s.getStartTime() != null && s.getStartTime().isBefore(LocalTime.of(15, 0)))
                    .map(RestaurantTimeSlotInfo::getId)
                    .collect(Collectors.toList());
        }
        if ("DINNER".equalsIgnoreCase(shift)) {
            return allSlots.stream()
                    .filter(s -> s.getStartTime() != null && s.getStartTime().isAfter(LocalTime.of(16, 0)))
                    .map(RestaurantTimeSlotInfo::getId)
                    .collect(Collectors.toList());
        }
        return Collections.emptyList();
    }

    private Set<UUID> checkRedisHeldTables(List<RestaurantTableInfo> tables, LocalDate bookingDate, UUID timeSlotId) {
        Set<UUID> held = new HashSet<>();
        if (redisTemplate == null) return held;

        for (RestaurantTableInfo t : tables) {
            try {
                String keySpecific = String.format("lock:table:%s:%s:%s", t.getId(), bookingDate, timeSlotId != null ? timeSlotId : "all");
                String keyGeneric = String.format("lock:table:%s", t.getId());
                String keyHold = String.format("table:hold:%s", t.getId());

                Boolean hasKeySpecific = redisTemplate.hasKey(keySpecific);
                Boolean hasKeyGeneric = redisTemplate.hasKey(keyGeneric);
                Boolean hasKeyHold = redisTemplate.hasKey(keyHold);

                if (Boolean.TRUE.equals(hasKeySpecific) || Boolean.TRUE.equals(hasKeyGeneric) || Boolean.TRUE.equals(hasKeyHold)) {
                    held.add(t.getId());
                }
            } catch (Exception e) {
                log.debug("Redis không khả dụng khi kiểm tra bàn {}: {}", t.getTableCode(), e.getMessage());
            }
        }
        return held;
    }

    private List<TimeSlotAvailabilitySummary> computeAlternativeSlotSummaries(
            List<RestaurantTimeSlotInfo> allSlots,
            List<RestaurantTableInfo> allTables,
            LocalDate bookingDate,
            int totalGuests) {

        List<TimeSlotAvailabilitySummary> summaries = new ArrayList<>();
        for (RestaurantTimeSlotInfo slot : allSlots) {
            List<UUID> bookedInSlot = bookingRepository.findBookedTableIds(
                    bookingDate, slot.getId(), OCCUPIED_STATUSES);

            int availableCount = 0;
            for (RestaurantTableInfo t : allTables) {
                if (!Boolean.TRUE.equals(t.getIsActive())) continue;
                if (bookedInSlot.contains(t.getId())) continue;

                int minCap = t.getMinCapacity() != null ? t.getMinCapacity() : 1;
                int maxCap = t.getMaxCapacity() != null ? t.getMaxCapacity() : 4;
                if (totalGuests >= minCap && totalGuests <= maxCap) {
                    availableCount++;
                }
            }

            String shift = (slot.getStartTime() != null && slot.getStartTime().isBefore(LocalTime.of(15, 0)))
                    ? "LUNCH" : "DINNER";

            summaries.add(TimeSlotAvailabilitySummary.builder()
                    .timeSlotId(slot.getId())
                    .slotName(slot.getSlotName())
                    .startTime(slot.getStartTime())
                    .endTime(slot.getEndTime())
                    .shift(shift)
                    .availableTablesCount(availableCount)
                    .totalTablesCount(allTables.size())
                    .isAvailable(availableCount > 0)
                    .build());
        }
        return summaries;
    }
}

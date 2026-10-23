package com.tablemaster.booking.client;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tablemaster.booking.client.model.RestaurantFloorInfo;
import com.tablemaster.booking.client.model.RestaurantTableInfo;
import com.tablemaster.booking.client.model.RestaurantTimeSlotInfo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Client kết nối và truy xuất thông tin mặt bằng, danh sách bàn và ca giờ từ restaurant-service.
 * Thiết kế chuẩn Resilient Microservices:
 * - Gọi REST API qua HTTP
 * - Bộ nhớ đệm TTL ngắn hạn (In-memory Cache 60s) tránh nghẽn mạng
 * - Fallback tự động về Seed Data khi restaurant-service tạm thời chưa bật hoặc gặp sự cố
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RestaurantServiceClient {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${restaurant-service.url:http://localhost:8082}")
    private String restaurantServiceUrl;

    // Cache đơn giản chống thắt cổ chai
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private final Map<String, Long> cacheExpiry = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 60_000L; // 60s

    /**
     * Lấy danh sách tất cả các bàn ăn
     */
    public List<RestaurantTableInfo> getAllTables() {
        String cacheKey = "all_tables";
        if (isCacheValid(cacheKey)) {
            @SuppressWarnings("unchecked")
            List<RestaurantTableInfo> cached = (List<RestaurantTableInfo>) cache.get(cacheKey);
            return cached;
        }

        List<RestaurantTableInfo> tables = fetchTablesFromService();
        if (tables == null || tables.isEmpty()) {
            tables = getFallbackTables();
        }

        // Bổ sung thông tin tầng (floorNumber, floorName) cho từng bàn
        enrichTablesWithFloorInfo(tables);

        cache.put(cacheKey, tables);
        cacheExpiry.put(cacheKey, System.currentTimeMillis() + CACHE_TTL_MS);
        return tables;
    }

    /**
     * Lấy danh sách các mặt bằng / tầng
     */
    public List<RestaurantFloorInfo> getFloorPlans() {
        String cacheKey = "floor_plans";
        if (isCacheValid(cacheKey)) {
            @SuppressWarnings("unchecked")
            List<RestaurantFloorInfo> cached = (List<RestaurantFloorInfo>) cache.get(cacheKey);
            return cached;
        }

        List<RestaurantFloorInfo> floors = fetchFloorPlansFromService();
        if (floors == null || floors.isEmpty()) {
            floors = getFallbackFloors();
        }

        cache.put(cacheKey, floors);
        cacheExpiry.put(cacheKey, System.currentTimeMillis() + CACHE_TTL_MS);
        return floors;
    }

    /**
     * Lấy danh sách các ca giờ
     */
    public List<RestaurantTimeSlotInfo> getTimeSlots() {
        String cacheKey = "time_slots";
        if (isCacheValid(cacheKey)) {
            @SuppressWarnings("unchecked")
            List<RestaurantTimeSlotInfo> cached = (List<RestaurantTimeSlotInfo>) cache.get(cacheKey);
            return cached;
        }

        List<RestaurantTimeSlotInfo> slots = fetchTimeSlotsFromService();
        if (slots == null || slots.isEmpty()) {
            slots = getFallbackTimeSlots();
        }

        cache.put(cacheKey, slots);
        cacheExpiry.put(cacheKey, System.currentTimeMillis() + CACHE_TTL_MS);
        return slots;
    }

    private boolean isCacheValid(String key) {
        Long expiry = cacheExpiry.get(key);
        return expiry != null && System.currentTimeMillis() < expiry && cache.containsKey(key);
    }

    private List<RestaurantTableInfo> fetchTablesFromService() {
        try {
            String url = restaurantServiceUrl + "/api/v1/restaurant/tables";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode dataNode = root.has("data") ? root.get("data") : root;
                if (dataNode.isArray()) {
                    List<RestaurantTableInfo> list = new ArrayList<>();
                    for (JsonNode node : dataNode) {
                        RestaurantTableInfo table = RestaurantTableInfo.builder()
                                .id(UUID.fromString(node.get("id").asText()))
                                .floorPlanId(node.hasNonNull("floorPlanId") ? UUID.fromString(node.get("floorPlanId").asText()) : null)
                                .tableCode(node.hasNonNull("tableCode") ? node.get("tableCode").asText() : "")
                                .zoneType(node.hasNonNull("zoneType") ? node.get("zoneType").asText() : "STANDARD")
                                .minCapacity(node.hasNonNull("minCapacity") ? node.get("minCapacity").asInt() : 2)
                                .maxCapacity(node.hasNonNull("maxCapacity") ? node.get("maxCapacity").asInt() : 4)
                                .customDeposit(node.hasNonNull("customDeposit") ? new BigDecimal(node.get("customDeposit").asText()) : null)
                                .isActive(node.hasNonNull("isActive") ? node.get("isActive").asBoolean() : true)
                                .posX(node.hasNonNull("posX") ? (float) node.get("posX").asDouble() : 100.0f)
                                .posY(node.hasNonNull("posY") ? (float) node.get("posY").asDouble() : 100.0f)
                                .width(node.hasNonNull("width") ? (float) node.get("width").asDouble() : 80.0f)
                                .height(node.hasNonNull("height") ? (float) node.get("height").asDouble() : 80.0f)
                                .shape(node.hasNonNull("shape") ? node.get("shape").asText() : "RECT")
                                .build();
                        list.add(table);
                    }
                    return list;
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ [RestaurantClient] Không thể gọi restaurant-service ({}): {}. Kích hoạt chế độ Fallback Catalog.",
                    restaurantServiceUrl, e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<RestaurantFloorInfo> fetchFloorPlansFromService() {
        try {
            String url = restaurantServiceUrl + "/api/v1/restaurant/floor-plans";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode dataNode = root.has("data") ? root.get("data") : root;
                if (dataNode.isArray()) {
                    List<RestaurantFloorInfo> list = new ArrayList<>();
                    for (JsonNode node : dataNode) {
                        list.add(RestaurantFloorInfo.builder()
                                .id(UUID.fromString(node.get("id").asText()))
                                .floorNumber(node.get("floorNumber").asInt())
                                .name(node.get("name").asText())
                                .isPublished(node.hasNonNull("isPublished") ? node.get("isPublished").asBoolean() : true)
                                .build());
                    }
                    return list;
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ [RestaurantClient] Lỗi tải FloorPlans từ {}: {}", restaurantServiceUrl, e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<RestaurantTimeSlotInfo> fetchTimeSlotsFromService() {
        try {
            String url = restaurantServiceUrl + "/api/v1/restaurant/time-slots";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode dataNode = root.has("data") ? root.get("data") : root;
                if (dataNode.isArray()) {
                    List<RestaurantTimeSlotInfo> list = new ArrayList<>();
                    for (JsonNode node : dataNode) {
                        list.add(RestaurantTimeSlotInfo.builder()
                                .id(UUID.fromString(node.get("id").asText()))
                                .slotName(node.get("slotName").asText())
                                .startTime(LocalTime.parse(node.get("startTime").asText()))
                                .endTime(LocalTime.parse(node.get("endTime").asText()))
                                .maxCapacity(node.hasNonNull("maxCapacity") ? node.get("maxCapacity").asInt() : 50)
                                .isActive(node.hasNonNull("isActive") ? node.get("isActive").asBoolean() : true)
                                .build());
                    }
                    return list;
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ [RestaurantClient] Lỗi tải TimeSlots từ {}: {}", restaurantServiceUrl, e.getMessage());
        }
        return Collections.emptyList();
    }

    private void enrichTablesWithFloorInfo(List<RestaurantTableInfo> tables) {
        List<RestaurantFloorInfo> floors = getFloorPlans();
        Map<UUID, RestaurantFloorInfo> floorMap = new HashMap<>();
        for (RestaurantFloorInfo f : floors) {
            floorMap.put(f.getId(), f);
        }

        for (RestaurantTableInfo t : tables) {
            if (t.getFloorPlanId() != null && floorMap.containsKey(t.getFloorPlanId())) {
                RestaurantFloorInfo f = floorMap.get(t.getFloorPlanId());
                t.setFloorNumber(f.getFloorNumber());
                t.setFloorName(f.getName());
            } else if (t.getFloorNumber() == null) {
                t.setFloorNumber(1);
                t.setFloorName("Tầng 1 - Sảnh Vòm & Bar");
            }
        }
    }

    /**
     * Fallback Seed Data chuẩn đồng bộ với 03-restaurant-schema.sql
     */
    public List<RestaurantTableInfo> getFallbackTables() {
        UUID f1 = UUID.fromString("b2000000-0000-0000-0000-000000000001");
        UUID f2 = UUID.fromString("b2000000-0000-0000-0000-000000000002");
        UUID f3 = UUID.fromString("b2000000-0000-0000-0000-000000000003");

        return new ArrayList<>(List.of(
                RestaurantTableInfo.builder()
                        .id(UUID.fromString("b3000000-0000-0000-0000-000000000001"))
                        .floorPlanId(f1)
                        .floorNumber(1)
                        .floorName("Tầng 1 - Sảnh Vòm & Bar")
                        .tableCode("BAR-01")
                        .zoneType("BAR_SIDE")
                        .minCapacity(1)
                        .maxCapacity(2)
                        .customDeposit(new BigDecimal("100000.00"))
                        .isActive(true)
                        .posX(200f).posY(300f).width(70f).height(70f).shape("CIRCLE")
                        .build(),
                RestaurantTableInfo.builder()
                        .id(UUID.fromString("b3000000-0000-0000-0000-000000000002"))
                        .floorPlanId(f1)
                        .floorNumber(1)
                        .floorName("Tầng 1 - Sảnh Vòm & Bar")
                        .tableCode("WIN-01")
                        .zoneType("WINDOW_VIEW")
                        .minCapacity(2)
                        .maxCapacity(4)
                        .customDeposit(new BigDecimal("200000.00"))
                        .isActive(true)
                        .posX(400f).posY(100f).width(100f).height(80f).shape("RECT")
                        .build(),
                RestaurantTableInfo.builder()
                        .id(UUID.fromString("b3000000-0000-0000-0000-000000000003"))
                        .floorPlanId(f2)
                        .floorNumber(2)
                        .floorName("Tầng 2 - Phòng VIP Riêng Tư")
                        .tableCode("VIP-01")
                        .zoneType("VIP")
                        .minCapacity(6)
                        .maxCapacity(12)
                        .customDeposit(new BigDecimal("500000.00"))
                        .isActive(true)
                        .posX(150f).posY(150f).width(140f).height(90f).shape("RECT")
                        .build(),
                RestaurantTableInfo.builder()
                        .id(UUID.fromString("b3000000-0000-0000-0000-000000000004"))
                        .floorPlanId(f3)
                        .floorNumber(3)
                        .floorName("Tầng 3 - Sky Lounge Ngoài Trời")
                        .tableCode("OUT-01")
                        .zoneType("OUTDOOR")
                        .minCapacity(2)
                        .maxCapacity(4)
                        .customDeposit(new BigDecimal("300000.00"))
                        .isActive(true)
                        .posX(300f).posY(200f).width(90f).height(90f).shape("SQUARE")
                        .build(),
                RestaurantTableInfo.builder()
                        .id(UUID.fromString("b3000000-0000-0000-0000-000000000005"))
                        .floorPlanId(f3)
                        .floorNumber(3)
                        .floorName("Tầng 3 - Sky Lounge Ngoài Trời")
                        .tableCode("OUT-02")
                        .zoneType("OUTDOOR")
                        .minCapacity(4)
                        .maxCapacity(6)
                        .customDeposit(new BigDecimal("300000.00"))
                        .isActive(true)
                        .posX(500f).posY(200f).width(110f).height(80f).shape("RECT")
                        .build()
        ));
    }

    public List<RestaurantFloorInfo> getFallbackFloors() {
        return new ArrayList<>(List.of(
                RestaurantFloorInfo.builder()
                        .id(UUID.fromString("b2000000-0000-0000-0000-000000000001"))
                        .floorNumber(1)
                        .name("Tầng 1 - Sảnh Vòm & Bar")
                        .isPublished(true)
                        .build(),
                RestaurantFloorInfo.builder()
                        .id(UUID.fromString("b2000000-0000-0000-0000-000000000002"))
                        .floorNumber(2)
                        .name("Tầng 2 - Phòng VIP Riêng Tư")
                        .isPublished(true)
                        .build(),
                RestaurantFloorInfo.builder()
                        .id(UUID.fromString("b2000000-0000-0000-0000-000000000003"))
                        .floorNumber(3)
                        .name("Tầng 3 - Sky Lounge Ngoài Trời")
                        .isPublished(true)
                        .build()
        ));
    }

    public List<RestaurantTimeSlotInfo> getFallbackTimeSlots() {
        return new ArrayList<>(List.of(
                RestaurantTimeSlotInfo.builder()
                        .id(UUID.fromString("b1000000-0000-0000-0000-000000000001"))
                        .slotName("Ca trưa 1 (11:00 - 13:00)")
                        .startTime(LocalTime.of(11, 0))
                        .endTime(LocalTime.of(13, 0))
                        .maxCapacity(40)
                        .isActive(true)
                        .build(),
                RestaurantTimeSlotInfo.builder()
                        .id(UUID.fromString("b1000000-0000-0000-0000-000000000002"))
                        .slotName("Ca tối Giờ Vàng (18:30 - 20:30)")
                        .startTime(LocalTime.of(18, 30))
                        .endTime(LocalTime.of(20, 30))
                        .maxCapacity(60)
                        .isActive(true)
                        .build(),
                RestaurantTimeSlotInfo.builder()
                        .id(UUID.fromString("b1000000-0000-0000-0000-000000000003"))
                        .slotName("Ca đêm Rooftop (21:00 - 23:30)")
                        .startTime(LocalTime.of(21, 0))
                        .endTime(LocalTime.of(23, 30))
                        .maxCapacity(40)
                        .isActive(true)
                        .build()
        ));
    }
}

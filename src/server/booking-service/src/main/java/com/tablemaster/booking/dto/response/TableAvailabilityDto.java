package com.tablemaster.booking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * UC-04: Chi tiết trạng thái khả dụng của từng bàn theo bộ lọc và ràng buộc BR-01
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TableAvailabilityDto {

    private UUID tableId;
    private String tableCode;

    // Thông tin mặt bằng & tầng
    private UUID floorPlanId;
    private Integer floorNumber;
    private String floorName;

    // Khu vực trải nghiệm
    private String zoneType;

    // Sức chứa Min / Max (BR-01)
    private Integer minCapacity;
    private Integer maxCapacity;

    // Tiền cọc tùy chỉnh của bàn nếu có
    private BigDecimal customDeposit;

    // Tọa độ & hình dạng bàn (cho sơ đồ 2D)
    private String shape;
    private Float posX;
    private Float posY;
    private Float width;
    private Float height;

    // Trạng thái khả dụng
    private boolean isAvailable;

    /**
     * Mã trạng thái:
     * - "AVAILABLE": Bàn trống thỏa mãn BR-01 và không trùng lịch
     * - "OCCUPIED": Đã có đơn đặt (CONFIRMED / SEATED / AWAITING_PAYMENT / PENDING_REVIEW)
     * - "HELD": Đang bị tạm khóa giữ chỗ 5 phút (Redis Redlock TTL 300s - UC-06)
     * - "CAPACITY_MISMATCH": Vi phạm quy tắc sức chứa BR-01
     * - "INACTIVE": Bàn đang tạm ngưng hoạt động / bảo trì
     */
    private String status;

    // Diễn giải chi tiết cho người dùng
    private String statusMessage;

    // Kết quả kiểm tra BR-01: min_capacity <= guest_count <= max_capacity
    private boolean satisfiesCapacityRule;

    // Chi tiết kiểm tra từ DB và Cache
    private boolean isBookedInDb;
    private boolean isHeldInRedis;

    // Đánh dấu bàn được gợi ý tối ưu nhất cho số lượng khách (Seat fit optimization)
    private boolean recommended;
}

package com.tablemaster.booking.dto.request;

import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.UUID;

/**
 * UC-04: Request DTO tra cứu bàn trống theo ca giờ & số người (Availability Search Engine)
 * Hỗ trợ bộ lọc theo:
 * - Ngày dùng bữa (bookingDate)
 * - Khung ca (timeSlotId hoặc shift: LUNCH, DINNER)
 * - Số lượng người lớn (adults) & trẻ em (children)
 * - Tầng (floor / floorPlanId)
 * - Khu vực trải nghiệm (zoneType: STANDARD, BAR_SIDE, WINDOW_VIEW, VIP, OUTDOOR)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySearchRequest {

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate bookingDate;

    // UUID ca giờ cụ thể
    private UUID timeSlotId;

    // Khung ca: "LUNCH" (Ca trưa 11:30 - 13:30), "DINNER" (Ca tối 18:30 - 20:30), "ALL"
    private String shift;

    @Min(value = 1, message = "Số lượng người lớn tối thiểu là 1")
    @Builder.Default
    private Integer adults = 2;

    @Min(value = 0, message = "Số lượng trẻ em không được âm")
    @Builder.Default
    private Integer children = 0;

    // Tổng số khách (nếu client truyền sẵn hoặc computed = adults + children)
    private Integer guestCount;

    // Số tầng (1, 2, 3)
    private Integer floor;

    // UUID của floor_plans
    private UUID floorPlanId;

    // Khu vực: OUTDOOR, BAR_SIDE, VIP, WINDOW_VIEW, STANDARD
    private String zoneType;

    // Chỉ trả về bàn trống (true) hay trả về toàn bộ danh sách kèm lý do (false)
    @Builder.Default
    private Boolean onlyAvailable = false;

    /**
     * Tính tổng số khách thực tế = adults + children (hoặc guestCount nếu được set)
     */
    public int getEffectiveGuestCount() {
        if (guestCount != null && guestCount > 0) {
            return guestCount;
        }
        int a = (adults != null && adults > 0) ? adults : 2;
        int c = (children != null && children > 0) ? children : 0;
        return a + c;
    }
}

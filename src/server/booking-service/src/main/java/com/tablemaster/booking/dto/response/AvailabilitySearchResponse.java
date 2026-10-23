package com.tablemaster.booking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * UC-04: Kết quả tổng hợp tra cứu bàn trống Availability Search Engine
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySearchResponse {

    // Tiêu chí tìm kiếm đã áp dụng
    private LocalDate bookingDate;
    private UUID timeSlotId;
    private String timeSlotName;
    private String shift;
    private int adults;
    private int children;
    private int totalGuests;
    private Integer floor;
    private String zoneType;

    // Thống kê số lượng
    private int totalTables;
    private int availableCount;
    private int occupiedCount;
    private int heldCount;
    private int capacityMismatchCount;

    // Bàn được hệ thống gợi ý phù hợp nhất (Seat optimization)
    private UUID recommendedTableId;
    private String recommendedTableCode;

    // Danh sách chi tiết các bàn
    @Builder.Default
    private List<TableAvailabilityDto> tables = new ArrayList<>();

    // Tình trạng khả dụng ở các ca giờ khác cùng ngày (để khách tiện đổi ca nếu ca này đã kín chỗ)
    @Builder.Default
    private List<TimeSlotAvailabilitySummary> alternativeSlots = new ArrayList<>();
}

package com.tablemaster.analytics.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyShiftSummaryResponse {
    private LocalDate date;
    private List<ShiftMetricItemResponse> shifts;
    private BigDecimal totalDailyRevenue;
    private BigDecimal totalDepositCollected;
    private int totalBookings;
    private int totalSeated;
    private int totalNoShows;
    private BigDecimal averageRevpash;
    private Float averageOccupancyRate;
    private Float noShowRate;
}

package com.tablemaster.analytics.dto.response;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShiftMetricItemResponse {
    private UUID id;
    private LocalDate metricDate;
    private UUID timeSlotId;
    private String slotName;
    private Integer totalBookings;
    private Integer totalSeated;
    private Integer totalNoShows;
    private BigDecimal totalDepositCollected;
    private BigDecimal noShowPenaltyIncome;
    private BigDecimal totalFoodRevenue;
    private BigDecimal totalShiftRevenue; // totalFoodRevenue + noShowPenaltyIncome
    private BigDecimal revpashScore;
    private Float occupancyRate;
}

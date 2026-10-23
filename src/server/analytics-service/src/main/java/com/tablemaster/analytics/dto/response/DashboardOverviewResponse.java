package com.tablemaster.analytics.dto.response;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardOverviewResponse {
    private DailyShiftSummaryResponse todayMetrics;
    private List<TableHeatmapResponse> topHotTables;
    private Map<String, Long> vipTierDistribution;
    private List<VipCustomerResponse> topVipCustomers;
}

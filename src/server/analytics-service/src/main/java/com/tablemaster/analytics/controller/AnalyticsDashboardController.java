package com.tablemaster.analytics.controller;

import com.tablemaster.analytics.dto.response.*;
import com.tablemaster.analytics.enums.LoyaltyTier;
import com.tablemaster.analytics.service.DailyShiftAnalyticsService;
import com.tablemaster.analytics.service.TablePopularityService;
import com.tablemaster.analytics.service.VipCustomerService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller cung cấp các báo cáo BI & Analytics cho Dashboard Quản lý
 */
@RestController
@RequestMapping("/api/v1/analytics")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Validated
@Slf4j
public class AnalyticsDashboardController {

    private final DailyShiftAnalyticsService shiftService;
    private final TablePopularityService tableService;
    private final VipCustomerService vipService;

    /**
     * Tổng quan toàn bộ số liệu BI cho Dashboard Admin / Chủ nhà hàng
     */
    @GetMapping("/overview")
    public ApiResponse<DashboardOverviewResponse> getOverview(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        DailyShiftSummaryResponse todayMetrics = shiftService.getDailySummary(date);
        List<TableHeatmapResponse> topHotTables = tableService.getTopTables(5);
        Map<String, Long> tierDist = vipService.getTierDistribution();
        List<VipCustomerResponse> topVip = vipService.getTopVipCustomers(5);

        DashboardOverviewResponse overview = DashboardOverviewResponse.builder()
                .todayMetrics(todayMetrics)
                .topHotTables(topHotTables)
                .vipTierDistribution(tierDist)
                .topVipCustomers(topVip)
                .build();

        return ApiResponse.ok("Lấy tổng quan Dashboard thành công", overview);
    }

    /**
     * Báo cáo chi tiết các ca phục vụ & chỉ số RevPASH theo ngày
     */
    @GetMapping("/shifts/daily")
    public ApiResponse<DailyShiftSummaryResponse> getDailyShifts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        return ApiResponse.ok(shiftService.getDailySummary(date));
    }

    /**
     * Báo cáo doanh thu & chỉ số theo khoảng ngày (Tuần / Tháng)
     */
    @GetMapping("/shifts/range")
    public ApiResponse<List<DailyShiftSummaryResponse>> getShiftRange(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ApiResponse.ok(shiftService.getSummaryRange(startDate, endDate));
    }

    /**
     * Dữ liệu Bản đồ nhiệt (Heatmap 2D) của toàn bộ bàn ăn
     */
    @GetMapping("/tables/heatmap")
    public ApiResponse<List<TableHeatmapResponse>> getTableHeatmap() {
        return ApiResponse.ok("Lấy dữ liệu Heatmap 2D thành công", tableService.getHeatmapData());
    }

    /**
     * Bảng xếp hạng Top bàn ăn mang lại doanh thu cao nhất
     * Tích hợp @Min và @Max để chống DoS query quá lớn
     */
    @GetMapping("/tables/ranking")
    public ApiResponse<List<TableHeatmapResponse>> getTopTables(
            @RequestParam(defaultValue = "10") @Min(value = 1, message = "Số lượng tối thiểu là 1")
            @Max(value = 100, message = "Số lượng tối đa không vượt quá 100") int limit) {
        return ApiResponse.ok(tableService.getTopTables(limit));
    }

    /**
     * Danh sách khách hàng VIP theo phân hạng (BRONZE, SILVER, GOLD, PLATINUM)
     */
    @GetMapping("/customers/vip")
    public ApiResponse<List<VipCustomerResponse>> getVipCustomers(
            @RequestParam(required = false) LoyaltyTier tier) {
        return ApiResponse.ok(vipService.getVipCustomers(tier));
    }

    /**
     * Chi tiết hồ sơ tiêu dùng & lịch sử của một khách hàng
     */
    @GetMapping("/customers/{userId}")
    public ApiResponse<VipCustomerResponse> getCustomerInsight(@PathVariable UUID userId) {
        VipCustomerResponse insight = vipService.getCustomerInsight(userId);
        if (insight == null) {
            return ApiResponse.error(404, "Không tìm thấy hồ sơ khách hàng");
        }
        return ApiResponse.ok(insight);
    }
}

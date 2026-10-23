package com.tablemaster.analytics.service;

import com.tablemaster.analytics.dto.response.DailyShiftSummaryResponse;
import com.tablemaster.analytics.dto.response.ShiftMetricItemResponse;
import com.tablemaster.analytics.entity.DailyShiftMetric;
import com.tablemaster.analytics.repository.DailyShiftMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DailyShiftAnalyticsService {

    private final DailyShiftMetricRepository shiftMetricRepository;

    private static final int TOTAL_RESTAURANT_SEATS = 40;
    private static final int SHIFT_DURATION_HOURS = 2;
    private static final int TOTAL_TABLES = 18;

    @Transactional(readOnly = true)
    public DailyShiftSummaryResponse getDailySummary(LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        List<DailyShiftMetric> metrics = shiftMetricRepository.findAllByMetricDateOrderByCreatedAtAsc(date);
        List<ShiftMetricItemResponse> shiftResponses = metrics.stream()
                .map(this::mapToShiftResponse)
                .collect(Collectors.toList());

        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalDeposits = BigDecimal.ZERO;
        int totalBookings = 0;
        int totalSeated = 0;
        int totalNoShows = 0;

        for (DailyShiftMetric m : metrics) {
            BigDecimal shiftTotal = m.getTotalFoodRevenue().add(m.getNoShowPenaltyIncome());
            totalRevenue = totalRevenue.add(shiftTotal);
            totalDeposits = totalDeposits.add(m.getTotalDepositCollected());
            totalBookings += m.getTotalBookings();
            totalSeated += m.getTotalSeated();
            totalNoShows += m.getTotalNoShows();
        }

        BigDecimal avgRevpash = BigDecimal.ZERO;
        Float avgOccupancy = 0.0f;
        Float noShowRate = 0.0f;

        if (!metrics.isEmpty()) {
            BigDecimal totalRevpash = metrics.stream()
                    .map(DailyShiftMetric::getRevpashScore)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            avgRevpash = totalRevpash.divide(BigDecimal.valueOf(metrics.size()), 2, RoundingMode.HALF_UP);

            double sumOccupancy = metrics.stream().mapToDouble(DailyShiftMetric::getOccupancyRate).sum();
            avgOccupancy = (float) (sumOccupancy / metrics.size());
        }

        if (totalBookings > 0) {
            noShowRate = ((float) totalNoShows / totalBookings) * 100.0f;
        }

        return DailyShiftSummaryResponse.builder()
                .date(date)
                .shifts(shiftResponses)
                .totalDailyRevenue(totalRevenue)
                .totalDepositCollected(totalDeposits)
                .totalBookings(totalBookings)
                .totalSeated(totalSeated)
                .totalNoShows(totalNoShows)
                .averageRevpash(avgRevpash)
                .averageOccupancyRate(avgOccupancy)
                .noShowRate(noShowRate)
                .build();
    }

    @Transactional(readOnly = true)
    public List<DailyShiftSummaryResponse> getSummaryRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) {
            startDate = LocalDate.now().minusDays(7);
        }
        if (endDate == null) {
            endDate = LocalDate.now();
        }

        List<DailyShiftMetric> allMetrics = shiftMetricRepository.findAllByMetricDateBetweenOrderByMetricDateAsc(startDate, endDate);
        return allMetrics.stream()
                .map(DailyShiftMetric::getMetricDate)
                .distinct()
                .map(this::getDailySummary)
                .collect(Collectors.toList());
    }

    @Transactional
    public DailyShiftMetric recordBookingCompletion(LocalDate date, UUID timeSlotId, String slotName, BigDecimal billAmount, int guestCount) {
        DailyShiftMetric metric = getOrCreateMetric(date, timeSlotId, slotName);

        metric.setTotalSeated(metric.getTotalSeated() + 1);
        metric.setTotalFoodRevenue(metric.getTotalFoodRevenue().add(billAmount));

        metric.setRevpashScore(calculateRevpash(metric.getTotalFoodRevenue().add(metric.getNoShowPenaltyIncome())));
        metric.setOccupancyRate(calculateOccupancy(metric.getTotalSeated()));

        return shiftMetricRepository.save(metric);
    }

    @Transactional
    public DailyShiftMetric recordBookingDeposit(LocalDate date, UUID timeSlotId, String slotName, BigDecimal depositAmount) {
        DailyShiftMetric metric = getOrCreateMetric(date, timeSlotId, slotName);

        metric.setTotalBookings(metric.getTotalBookings() + 1);
        metric.setTotalDepositCollected(metric.getTotalDepositCollected().add(depositAmount));

        return shiftMetricRepository.save(metric);
    }

    @Transactional
    public DailyShiftMetric recordNoShow(LocalDate date, UUID timeSlotId, String slotName, BigDecimal penaltyAmount) {
        DailyShiftMetric metric = getOrCreateMetric(date, timeSlotId, slotName);

        metric.setTotalNoShows(metric.getTotalNoShows() + 1);
        metric.setNoShowPenaltyIncome(metric.getNoShowPenaltyIncome().add(penaltyAmount));

        metric.setRevpashScore(calculateRevpash(metric.getTotalFoodRevenue().add(metric.getNoShowPenaltyIncome())));

        return shiftMetricRepository.save(metric);
    }

    private DailyShiftMetric getOrCreateMetric(LocalDate date, UUID timeSlotId, String slotName) {
        return shiftMetricRepository.findByMetricDateAndTimeSlotId(date, timeSlotId)
                .orElseGet(() -> DailyShiftMetric.builder()
                        .metricDate(date)
                        .timeSlotId(timeSlotId)
                        .slotName(slotName != null ? slotName : "Ca chuẩn")
                        .totalBookings(0)
                        .totalSeated(0)
                        .totalNoShows(0)
                        .totalDepositCollected(BigDecimal.ZERO)
                        .noShowPenaltyIncome(BigDecimal.ZERO)
                        .totalFoodRevenue(BigDecimal.ZERO)
                        .revpashScore(BigDecimal.ZERO)
                        .occupancyRate(0.0f)
                        .build());
    }

    private BigDecimal calculateRevpash(BigDecimal totalRevenue) {
        int availableSeatHours = TOTAL_RESTAURANT_SEATS * SHIFT_DURATION_HOURS;
        if (availableSeatHours == 0) return BigDecimal.ZERO;
        return totalRevenue.divide(BigDecimal.valueOf(availableSeatHours), 2, RoundingMode.HALF_UP);
    }

    private Float calculateOccupancy(int totalSeated) {
        if (TOTAL_TABLES == 0) return 0.0f;
        float rate = ((float) totalSeated / TOTAL_TABLES) * 100.0f;
        return Math.min(100.0f, Math.round(rate * 10.0f) / 10.0f);
    }

    private ShiftMetricItemResponse mapToShiftResponse(DailyShiftMetric m) {
        BigDecimal totalShiftRev = m.getTotalFoodRevenue().add(m.getNoShowPenaltyIncome());
        return ShiftMetricItemResponse.builder()
                .id(m.getId())
                .metricDate(m.getMetricDate())
                .timeSlotId(m.getTimeSlotId())
                .slotName(m.getSlotName())
                .totalBookings(m.getTotalBookings())
                .totalSeated(m.getTotalSeated())
                .totalNoShows(m.getTotalNoShows())
                .totalDepositCollected(m.getTotalDepositCollected())
                .noShowPenaltyIncome(m.getNoShowPenaltyIncome())
                .totalFoodRevenue(m.getTotalFoodRevenue())
                .totalShiftRevenue(totalShiftRev)
                .revpashScore(m.getRevpashScore())
                .occupancyRate(m.getOccupancyRate())
                .build();
    }
}

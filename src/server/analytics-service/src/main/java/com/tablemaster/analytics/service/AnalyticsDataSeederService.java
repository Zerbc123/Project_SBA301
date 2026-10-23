package com.tablemaster.analytics.service;

import com.tablemaster.analytics.entity.DailyShiftMetric;
import com.tablemaster.analytics.enums.LoyaltyTier;
import com.tablemaster.analytics.entity.TablePopularityStat;
import com.tablemaster.analytics.entity.VipCustomerInsight;
import com.tablemaster.analytics.repository.DailyShiftMetricRepository;
import com.tablemaster.analytics.repository.TablePopularityStatRepository;
import com.tablemaster.analytics.repository.VipCustomerInsightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalyticsDataSeederService {

    private final DailyShiftMetricRepository shiftRepo;
    private final TablePopularityStatRepository tableRepo;
    private final VipCustomerInsightRepository vipRepo;

    @Transactional
    public void seedMockDataIfEmpty() {
        if (shiftRepo.count() == 0 || tableRepo.count() == 0) {
            log.info("[DataSeeder] Cơ sở dữ liệu Analytics đang trống, tự động nạp dữ liệu khởi tạo ban đầu...");
            forceSeedSampleData();
        } else {
            log.info("[DataSeeder] Dữ liệu Analytics đã tồn tại, bỏ qua bước seed tự động.");
        }
    }

    @Transactional
    public void forceSeedSampleData() {
        log.info("[DataSeeder] Bắt đầu nạp dữ liệu mẫu Analytics cho hệ thống...");

        // 1. Seed ca phục vụ hôm nay & 7 ngày gần nhất
        LocalDate today = LocalDate.now();
        for (int i = 0; i <= 6; i++) {
            LocalDate date = today.minusDays(i);
            seedShiftIfAbsent(date, "SLOT-LUNCH-1130", "Ca trưa tiêu chuẩn (11:30 - 13:30)", 15, 14, 1,
                    new BigDecimal("3500000.00"), new BigDecimal("350000.00"), new BigDecimal("24500000.00"),
                    new BigDecimal("306250.00"), 77.8f);

            seedShiftIfAbsent(date, "SLOT-DINNER-1800", "Ca tối Giờ Vàng (18:00 - 20:00)", 22, 21, 1,
                    new BigDecimal("5500000.00"), new BigDecimal("350000.00"), new BigDecimal("58000000.00"),
                    new BigDecimal("725000.00"), 94.5f);

            seedShiftIfAbsent(date, "SLOT-DINNER-2000", "Ca tối muộn (20:00 - 22:00)", 12, 10, 2,
                    new BigDecimal("3000000.00"), new BigDecimal("700000.00"), new BigDecimal("29000000.00"),
                    new BigDecimal("362500.00"), 61.1f);
        }

        // 2. Seed thống kê độ hot các bàn ăn
        seedTableStatIfAbsent("TBL-VIP-01", "VIP-01", "PRIVATE_VIP", 45, 1, new BigDecimal("135000000.00"));
        seedTableStatIfAbsent("TBL-VIP-02", "VIP-02", "PRIVATE_VIP", 38, 0, new BigDecimal("114000000.00"));
        seedTableStatIfAbsent("TBL-WIN-01", "WIN-01", "WINDOW_VIEW", 52, 2, new BigDecimal("98000000.00"));
        seedTableStatIfAbsent("TBL-WIN-02", "WIN-02", "WINDOW_VIEW", 48, 1, new BigDecimal("86000000.00"));
        seedTableStatIfAbsent("TBL-OUT-01", "OUT-01", "OUTDOOR", 35, 3, new BigDecimal("62000000.00"));
        seedTableStatIfAbsent("TBL-STD-01", "STD-01", "STANDARD", 40, 2, new BigDecimal("55000000.00"));
        seedTableStatIfAbsent("TBL-STD-02", "STD-02", "STANDARD", 28, 4, new BigDecimal("38000000.00"));

        // 3. Seed khách hàng thân thiết VIP
        seedVipIfAbsent("USR-VIP-001", "+84909123456", "Trần Quốc Toản (Chủ tịch VinGroup)", 18, new BigDecimal("48500000.00"), 5.5f, "PRIVATE_VIP", LoyaltyTier.PLATINUM);
        seedVipIfAbsent("USR-VIP-002", "+84918765432", "Phạm Nhật Minh", 12, new BigDecimal("26000000.00"), 4.0f, "WINDOW_VIEW", LoyaltyTier.PLATINUM);
        seedVipIfAbsent("USR-VIP-003", "+84983112233", "Lê Thanh Hà", 8, new BigDecimal("16500000.00"), 3.2f, "PRIVATE_VIP", LoyaltyTier.GOLD);
        seedVipIfAbsent("USR-VIP-004", "+84977445566", "Nguyễn Hoàng Nam", 5, new BigDecimal("8900000.00"), 2.5f, "OUTDOOR", LoyaltyTier.SILVER);
        seedVipIfAbsent("USR-VIP-005", "+84903889900", "Đỗ Quỳnh Chi", 2, new BigDecimal("3200000.00"), 2.0f, "STANDARD", LoyaltyTier.BRONZE);

        log.info("[DataSeeder] Đã hoàn tất nạp dữ liệu mẫu Analytics!");
    }

    private void seedShiftIfAbsent(LocalDate date, String slotCode, String slotName, int bookings, int seated, int noShows,
                                   BigDecimal deposits, BigDecimal penalties, BigDecimal foodRev, BigDecimal revpash, float occupancy) {
        UUID slotId = UUID.nameUUIDFromBytes(slotCode.getBytes());
        if (shiftRepo.findByMetricDateAndTimeSlotId(date, slotId).isEmpty()) {
            shiftRepo.save(DailyShiftMetric.builder()
                    .metricDate(date)
                    .timeSlotId(slotId)
                    .slotName(slotName)
                    .totalBookings(bookings)
                    .totalSeated(seated)
                    .totalNoShows(noShows)
                    .totalDepositCollected(deposits)
                    .noShowPenaltyIncome(penalties)
                    .totalFoodRevenue(foodRev)
                    .revpashScore(revpash)
                    .occupancyRate(occupancy)
                    .build());
        }
    }

    private void seedTableStatIfAbsent(String tableIdStr, String code, String zone, int resCount, int cancelCount, BigDecimal revenue) {
        UUID tableId = UUID.nameUUIDFromBytes(tableIdStr.getBytes());
        if (tableRepo.findByTableId(tableId).isEmpty()) {
            tableRepo.save(TablePopularityStat.builder()
                    .tableId(tableId)
                    .tableCode(code)
                    .zoneType(zone)
                    .totalReservations(resCount)
                    .cancelCount(cancelCount)
                    .totalRevenueGenerated(revenue)
                    .build());
        }
    }

    private void seedVipIfAbsent(String userIdStr, String phone, String name, int visits, BigDecimal spent, float avgParty, String zone, LoyaltyTier tier) {
        UUID userId = UUID.nameUUIDFromBytes(userIdStr.getBytes());
        if (vipRepo.findByUserId(userId).isEmpty()) {
            vipRepo.save(VipCustomerInsight.builder()
                    .userId(userId)
                    .phoneNumber(phone)
                    .fullName(name)
                    .totalVisits(visits)
                    .totalSpent(spent)
                    .averagePartySize(avgParty)
                    .lastVisitDate(LocalDate.now().minusDays(1))
                    .favoriteZone(zone)
                    .loyaltyTier(tier)
                    .build());
        }
    }
}

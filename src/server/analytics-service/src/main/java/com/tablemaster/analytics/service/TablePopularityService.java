package com.tablemaster.analytics.service;

import com.tablemaster.analytics.dto.response.TableHeatmapResponse;
import com.tablemaster.analytics.entity.TablePopularityStat;
import com.tablemaster.analytics.repository.TablePopularityStatRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TablePopularityService {

    private final TablePopularityStatRepository tableStatRepository;

    @Transactional(readOnly = true)
    public List<TableHeatmapResponse> getHeatmapData() {
        List<TablePopularityStat> allStats = tableStatRepository.findAllByOrderByTotalRevenueGeneratedDesc();

        if (allStats.isEmpty()) {
            return List.of();
        }

        BigDecimal maxRevenue = allStats.get(0).getTotalRevenueGenerated();
        if (maxRevenue.compareTo(BigDecimal.ZERO) == 0) {
            maxRevenue = BigDecimal.ONE;
        }

        BigDecimal finalMaxRev = maxRevenue;
        return allStats.stream()
                .map(stat -> mapToHeatmapResponse(stat, finalMaxRev))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TableHeatmapResponse> getTopTables(int limit) {
        List<TableHeatmapResponse> all = getHeatmapData();
        return all.stream().limit(Math.max(1, limit)).collect(Collectors.toList());
    }

    @Transactional
    public TablePopularityStat recordReservationUsage(UUID tableId, String tableCode, String zoneType, BigDecimal revenue) {
        TablePopularityStat stat = tableStatRepository.findByTableId(tableId)
                .orElseGet(() -> TablePopularityStat.builder()
                        .tableId(tableId)
                        .tableCode(tableCode != null ? tableCode : "TBL-UNKNOWN")
                        .zoneType(zoneType != null ? zoneType : "STANDARD")
                        .totalReservations(0)
                        .cancelCount(0)
                        .totalRevenueGenerated(BigDecimal.ZERO)
                        .build());

        stat.setTotalReservations(stat.getTotalReservations() + 1);
        stat.setTotalRevenueGenerated(stat.getTotalRevenueGenerated().add(revenue != null ? revenue : BigDecimal.ZERO));
        if (tableCode != null) stat.setTableCode(tableCode);
        if (zoneType != null) stat.setZoneType(zoneType);

        return tableStatRepository.save(stat);
    }

    @Transactional
    public TablePopularityStat recordCancellation(UUID tableId) {
        TablePopularityStat stat = tableStatRepository.findByTableId(tableId).orElse(null);
        if (stat != null) {
            stat.setCancelCount(stat.getCancelCount() + 1);
            return tableStatRepository.save(stat);
        }
        return null;
    }

    private TableHeatmapResponse mapToHeatmapResponse(TablePopularityStat stat, BigDecimal maxRevenue) {
        double score = 0.0;
        if (maxRevenue.compareTo(BigDecimal.ZERO) > 0) {
            score = stat.getTotalRevenueGenerated()
                    .divide(maxRevenue, 4, java.math.RoundingMode.HALF_UP)
                    .doubleValue() * 100.0;
        }

        String heatLevel;
        String colorHex;

        if (score >= 80.0) {
            heatLevel = "HOT";
            colorHex = "#EF4444"; // Đỏ rực
        } else if (score >= 50.0) {
            heatLevel = "WARM";
            colorHex = "#F59E0B"; // Cam vàng
        } else if (score >= 20.0) {
            heatLevel = "NORMAL";
            colorHex = "#10B981"; // Xanh lá
        } else {
            heatLevel = "COOL";
            colorHex = "#3B82F6"; // Xanh lam
        }

        return TableHeatmapResponse.builder()
                .id(stat.getId())
                .tableId(stat.getTableId())
                .tableCode(stat.getTableCode())
                .zoneType(stat.getZoneType())
                .totalReservations(stat.getTotalReservations())
                .cancelCount(stat.getCancelCount())
                .totalRevenueGenerated(stat.getTotalRevenueGenerated())
                .heatScore(Math.round(score * 10.0) / 10.0)
                .heatLevel(heatLevel)
                .colorHex(colorHex)
                .build();
    }
}

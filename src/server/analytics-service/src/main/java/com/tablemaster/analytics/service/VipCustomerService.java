package com.tablemaster.analytics.service;

import com.tablemaster.analytics.dto.response.VipCustomerResponse;
import com.tablemaster.analytics.enums.LoyaltyTier;
import com.tablemaster.analytics.entity.VipCustomerInsight;
import com.tablemaster.analytics.repository.VipCustomerInsightRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class VipCustomerService {

    private final VipCustomerInsightRepository vipRepository;

    @Transactional(readOnly = true)
    public List<VipCustomerResponse> getVipCustomers(LoyaltyTier tier) {
        List<VipCustomerInsight> list;
        if (tier != null) {
            list = vipRepository.findAllByLoyaltyTierOrderByTotalSpentDesc(tier);
        } else {
            list = vipRepository.findAllByOrderByTotalSpentDesc();
        }
        return list.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<VipCustomerResponse> getTopVipCustomers(int limit) {
        return vipRepository.findTop5ByOrderByTotalSpentDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public VipCustomerResponse getCustomerInsight(UUID userId) {
        return vipRepository.findByUserId(userId)
                .map(this::mapToResponse)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public Map<String, Long> getTierDistribution() {
        Map<String, Long> dist = new LinkedHashMap<>();
        for (LoyaltyTier t : LoyaltyTier.values()) {
            dist.put(t.name(), 0L);
        }

        List<Object[]> results = vipRepository.countByLoyaltyTier();
        for (Object[] row : results) {
            if (row[0] != null && row[1] != null) {
                dist.put(row[0].toString(), (Long) row[1]);
            }
        }
        return dist;
    }

    @Transactional
    public VipCustomerInsight recordCustomerMeal(
            UUID userId,
            String phoneNumber,
            String fullName,
            int partySize,
            BigDecimal mealCost,
            String zoneType,
            LocalDate visitDate) {

        VipCustomerInsight insight = vipRepository.findByUserId(userId)
                .orElseGet(() -> VipCustomerInsight.builder()
                        .userId(userId)
                        .phoneNumber(phoneNumber != null ? phoneNumber : "N/A")
                        .fullName(fullName != null ? fullName : "Khách hàng thân thiết")
                        .totalVisits(0)
                        .totalSpent(BigDecimal.ZERO)
                        .averagePartySize(0.0f)
                        .favoriteZone(zoneType != null ? zoneType : "STANDARD")
                        .loyaltyTier(LoyaltyTier.BRONZE)
                        .build());

        int prevVisits = insight.getTotalVisits();
        int newVisits = prevVisits + 1;
        BigDecimal newSpent = insight.getTotalSpent().add(mealCost != null ? mealCost : BigDecimal.ZERO);
        float newAvgParty = ((insight.getAveragePartySize() * prevVisits) + partySize) / newVisits;

        insight.setTotalVisits(newVisits);
        insight.setTotalSpent(newSpent);
        insight.setAveragePartySize(newAvgParty);
        insight.setLastVisitDate(visitDate != null ? visitDate : LocalDate.now());
        if (zoneType != null && !zoneType.isBlank()) {
            insight.setFavoriteZone(zoneType);
        }

        // Tự động thăng hạng theo thuật toán định mức chi tiêu & lượt ăn
        LoyaltyTier calculatedTier = LoyaltyTier.evaluate(newVisits, newSpent);
        insight.setLoyaltyTier(calculatedTier);

        return vipRepository.save(insight);
    }

    private VipCustomerResponse mapToResponse(VipCustomerInsight v) {
        return VipCustomerResponse.builder()
                .id(v.getId())
                .userId(v.getUserId())
                .phoneNumber(v.getPhoneNumber())
                .fullName(v.getFullName())
                .totalVisits(v.getTotalVisits())
                .totalSpent(v.getTotalSpent())
                .averagePartySize(v.getAveragePartySize())
                .lastVisitDate(v.getLastVisitDate())
                .favoriteZone(v.getFavoriteZone())
                .loyaltyTier(v.getLoyaltyTier())
                .build();
    }
}

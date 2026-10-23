package com.tablemaster.analytics.dto.response;

import com.tablemaster.analytics.enums.LoyaltyTier;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VipCustomerResponse {
    private UUID id;
    private UUID userId;
    private String phoneNumber;
    private String fullName;
    private Integer totalVisits;
    private BigDecimal totalSpent;
    private Float averagePartySize;
    private LocalDate lastVisitDate;
    private String favoriteZone;
    private LoyaltyTier loyaltyTier;
}

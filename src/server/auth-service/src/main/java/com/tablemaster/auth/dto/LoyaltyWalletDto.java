package com.tablemaster.auth.dto;

import com.tablemaster.auth.entity.VipTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyWalletDto {
    private UUID userId;
    private Integer loyaltyPoints;
    private VipTier vipTier;
    private String vipTierName;
    private Integer pointsToNextTier;
    private Integer depositDiscountPercent;
}

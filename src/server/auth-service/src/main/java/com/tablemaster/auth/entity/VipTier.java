package com.tablemaster.auth.entity;

import lombok.Getter;

@Getter
public enum VipTier {
    BRONZE("Đồng", 0, 0),
    SILVER("Bạc", 500, 5),
    GOLD("Vàng", 1000, 10),
    DIAMOND("Kim Cương", 2500, 15);

    private final String displayName;
    private final int minPoints;
    private final int depositDiscountPercent;

    VipTier(String displayName, int minPoints, int depositDiscountPercent) {
        this.displayName = displayName;
        this.minPoints = minPoints;
        this.depositDiscountPercent = depositDiscountPercent;
    }

    public static VipTier fromPoints(Integer points) {
        if (points == null || points < 500) {
            return BRONZE;
        }
        if (points < 1000) {
            return SILVER;
        }
        if (points < 2500) {
            return GOLD;
        }
        return DIAMOND;
    }

    public Integer getNextTierPoints(Integer currentPoints) {
        int pts = currentPoints != null ? currentPoints : 0;
        if (pts < 500) return 500 - pts;
        if (pts < 1000) return 1000 - pts;
        if (pts < 2500) return 2500 - pts;
        return 0; // Max tier
    }
}

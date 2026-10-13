package com.tablemaster.analytics.enums;

import java.math.BigDecimal;

/**
 * Phân hạng khách hàng thân thiết (VIP Loyalty Tiers)
 * Dùng cho phân tích hành vi khách hàng & chiến lược chăm sóc khách hàng VIP
 */
public enum LoyaltyTier {
    BRONZE,
    SILVER,
    GOLD,
    PLATINUM;

    /**
     * Tự động đánh giá và nâng hạng dựa trên số lần dùng bữa & tổng chi tiêu tích lũy
     */
    public static LoyaltyTier evaluate(int totalVisits, BigDecimal totalSpent) {
        if (totalVisits >= 10 || (totalSpent != null && totalSpent.compareTo(new BigDecimal("20000000")) >= 0)) {
            return PLATINUM;
        }
        if (totalVisits >= 6 || (totalSpent != null && totalSpent.compareTo(new BigDecimal("10000000")) >= 0)) {
            return GOLD;
        }
        if (totalVisits >= 3 || (totalSpent != null && totalSpent.compareTo(new BigDecimal("5000000")) >= 0)) {
            return SILVER;
        }
        return BRONZE;
    }
}

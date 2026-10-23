package com.tablemaster.analytics.repository;

import com.tablemaster.analytics.enums.LoyaltyTier;
import com.tablemaster.analytics.entity.VipCustomerInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VipCustomerInsightRepository extends JpaRepository<VipCustomerInsight, UUID> {

    Optional<VipCustomerInsight> findByUserId(UUID userId);

    Optional<VipCustomerInsight> findByPhoneNumber(String phoneNumber);

    List<VipCustomerInsight> findAllByLoyaltyTierOrderByTotalSpentDesc(LoyaltyTier loyaltyTier);

    List<VipCustomerInsight> findAllByOrderByTotalSpentDesc();

    List<VipCustomerInsight> findTop5ByOrderByTotalSpentDesc();

    @Query("SELECT v.loyaltyTier, COUNT(v) FROM VipCustomerInsight v GROUP BY v.loyaltyTier")
    List<Object[]> countByLoyaltyTier();
}

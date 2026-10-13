package com.tablemaster.analytics.entity;

import com.tablemaster.analytics.enums.LoyaltyTier;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "vip_customer_insights", indexes = {
    @Index(name = "idx_vip_tier_spent", columnList = "loyalty_tier, total_spent DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VipCustomerInsight {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false, unique = true)
    private UUID userId;

    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(name = "total_visits")
    @Builder.Default
    private Integer totalVisits = 0;

    @Column(name = "total_spent", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalSpent = BigDecimal.ZERO;

    @Column(name = "average_party_size")
    @Builder.Default
    private Float averagePartySize = 0.0f;

    @Column(name = "last_visit_date")
    private LocalDate lastVisitDate;

    @Column(name = "favorite_zone", length = 50)
    @Builder.Default
    private String favoriteZone = "STANDARD";

    @Enumerated(EnumType.STRING)
    @Column(name = "loyalty_tier", nullable = false, length = 30)
    @Builder.Default
    private LoyaltyTier loyaltyTier = LoyaltyTier.BRONZE;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}

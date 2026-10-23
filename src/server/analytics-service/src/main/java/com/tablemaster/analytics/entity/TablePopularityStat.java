package com.tablemaster.analytics.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "table_popularity_stats", indexes = {
    @Index(name = "idx_popularity_revenue", columnList = "total_revenue_generated DESC"),
    @Index(name = "idx_popularity_zone", columnList = "zone_type, total_reservations DESC")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TablePopularityStat {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "table_id", nullable = false, unique = true)
    private UUID tableId;

    @Column(name = "table_code", nullable = false, length = 30)
    private String tableCode;

    @Column(name = "zone_type", nullable = false, length = 50)
    private String zoneType;

    @Column(name = "total_reservations")
    @Builder.Default
    private Integer totalReservations = 0;

    @Column(name = "cancel_count")
    @Builder.Default
    private Integer cancelCount = 0;

    @Column(name = "total_revenue_generated", precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal totalRevenueGenerated = BigDecimal.ZERO;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}

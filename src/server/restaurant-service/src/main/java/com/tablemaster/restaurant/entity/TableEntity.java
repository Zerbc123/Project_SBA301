package com.tablemaster.restaurant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "tables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "floor_plan_id", nullable = false)
    private UUID floorPlanId;

    @Column(name = "table_code", unique = true, nullable = false, length = 30)
    private String tableCode;

    @Column(name = "zone_type", nullable = false, length = 50)
    @Builder.Default
    private String zoneType = "STANDARD"; // OUTDOOR, BAR_COUNTER, PRIVATE_VIP, WINDOW_VIEW, STANDARD

    @Column(name = "min_capacity", nullable = false)
    @Builder.Default
    private Integer minCapacity = 2;

    @Column(name = "max_capacity", nullable = false)
    @Builder.Default
    private Integer maxCapacity = 4;

    @Column(name = "custom_deposit", precision = 12, scale = 2)
    private BigDecimal customDeposit;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "pos_x", nullable = false)
    @Builder.Default
    private Float posX = 100.0f;

    @Column(name = "pos_y", nullable = false)
    @Builder.Default
    private Float posY = 100.0f;

    @Column(name = "width", nullable = false)
    @Builder.Default
    private Float width = 80.0f;

    @Column(name = "height", nullable = false)
    @Builder.Default
    private Float height = 80.0f;

    @Column(name = "rotation", nullable = false)
    @Builder.Default
    private Float rotation = 0.0f;

    @Column(name = "shape", nullable = false, length = 20)
    @Builder.Default
    private String shape = "RECT";

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}

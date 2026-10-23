package com.tablemaster.restaurant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "floor_plans")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FloorPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "floor_number", unique = true, nullable = false)
    private Integer floorNumber;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "width_px", nullable = false)
    @Builder.Default
    private Integer widthPx = 1600;

    @Column(name = "height_px", nullable = false)
    @Builder.Default
    private Integer heightPx = 900;

    @Column(name = "grid_size", nullable = false)
    @Builder.Default
    private Integer gridSize = 20;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "layout_metadata", columnDefinition = "jsonb")
    @Builder.Default
    private String layoutMetadata = "{\"walls\":[], \"windows\":[], \"doors\":[], \"facilities\":[]}";

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private Boolean isPublished = true;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}

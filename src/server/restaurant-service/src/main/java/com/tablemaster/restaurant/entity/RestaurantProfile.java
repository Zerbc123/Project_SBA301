package com.tablemaster.restaurant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "restaurant_profile")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RestaurantProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 20)
    private String hotline;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "cover_image_url", columnDefinition = "TEXT")
    private String coverImageUrl;

    @Column(name = "opening_time", nullable = false)
    private LocalTime openingTime;

    @Column(name = "closing_time", nullable = false)
    private LocalTime closingTime;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "bank_bin", nullable = false, length = 10)
    private String bankBin;

    @Column(name = "bank_name", nullable = false, length = 50)
    private String bankName;

    @Column(name = "bank_account_no", nullable = false, length = 30)
    private String bankAccountNo;

    @Column(name = "bank_account_holder", nullable = false, length = 100)
    private String bankAccountHolder;

    @Column(name = "default_deposit_amount", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal defaultDepositAmount = BigDecimal.valueOf(200000.00);

    @Column(name = "cancellation_grace_hours", nullable = false)
    @Builder.Default
    private Integer cancellationGraceHours = 6;

    @Column(name = "hold_timeout_seconds", nullable = false)
    @Builder.Default
    private Integer holdTimeoutSeconds = 300;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private ZonedDateTime updatedAt;
}

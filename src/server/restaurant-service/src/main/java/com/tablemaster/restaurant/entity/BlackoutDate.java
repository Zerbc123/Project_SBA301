package com.tablemaster.restaurant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "blackout_dates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BlackoutDate {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "event_date", unique = true, nullable = false)
    private LocalDate eventDate;

    @Column(name = "event_name", nullable = false, length = 150)
    private String eventName;

    @Column(name = "is_closed", nullable = false)
    @Builder.Default
    private Boolean isClosed = false;

    @Column(name = "custom_deposit_amount", precision = 12, scale = 2)
    private BigDecimal customDepositAmount;

    @Column(name = "require_special_menu", nullable = false)
    @Builder.Default
    private Boolean requireSpecialMenu = false;

    @Column(columnDefinition = "TEXT")
    private String note;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}

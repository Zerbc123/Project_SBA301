package com.tablemaster.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.ZonedDateTime;
import java.util.UUID;

@Entity
@Table(name = "reviews", indexes = {
        @Index(name = "idx_reviews_user_id", columnList = "user_id"),
        @Index(name = "idx_reviews_booking_id", columnList = "booking_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "food_rating", nullable = false)
    private Integer foodRating;

    @Column(name = "service_rating", nullable = false)
    private Integer serviceRating;

    @Column(name = "ambiance_rating", nullable = false)
    private Integer ambianceRating;

    @Column(name = "overall_rating", nullable = false)
    private Integer overallRating;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "points_awarded", nullable = false)
    private Integer pointsAwarded;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private ZonedDateTime createdAt;
}

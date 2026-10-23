package com.tablemaster.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewDto {
    private UUID id;
    private UUID userId;
    private String customerName;
    private String customerAvatar;
    private UUID bookingId;
    private Integer foodRating;
    private Integer serviceRating;
    private Integer ambianceRating;
    private Integer overallRating;
    private String comment;
    private Integer pointsAwarded;
    private ZonedDateTime createdAt;
}

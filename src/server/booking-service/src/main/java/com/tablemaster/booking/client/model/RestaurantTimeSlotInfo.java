package com.tablemaster.booking.client.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantTimeSlotInfo {
    private UUID id;
    private String slotName;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer maxCapacity;
    private Boolean isActive;
}

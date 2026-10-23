package com.tablemaster.booking.client.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantFloorInfo {
    private UUID id;
    private Integer floorNumber;
    private String name;
    private Boolean isPublished;
}

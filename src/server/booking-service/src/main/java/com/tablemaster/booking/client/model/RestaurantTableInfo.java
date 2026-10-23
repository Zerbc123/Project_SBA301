package com.tablemaster.booking.client.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantTableInfo {
    private UUID id;
    private UUID floorPlanId;
    private Integer floorNumber;
    private String floorName;
    private String tableCode;
    private String zoneType;
    private Integer minCapacity;
    private Integer maxCapacity;
    private BigDecimal customDeposit;
    private Boolean isActive;
    private Float posX;
    private Float posY;
    private Float width;
    private Float height;
    private String shape;
}

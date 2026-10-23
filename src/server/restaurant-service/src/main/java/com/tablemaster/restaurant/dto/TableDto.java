package com.tablemaster.restaurant.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TableDto {
    private UUID id;

    @NotNull(message = "ID mặt bằng không được để trống")
    private UUID floorPlanId;

    @NotBlank(message = "Mã bàn không được để trống")
    private String tableCode;

    private String zoneType;

    @NotNull(message = "Sức chứa tối thiểu không được để trống")
    @Min(value = 1, message = "Sức chứa tối thiểu phải ít nhất là 1")
    private Integer minCapacity;

    @NotNull(message = "Sức chứa tối đa không được để trống")
    @Min(value = 1, message = "Sức chứa tối đa phải ít nhất là 1")
    private Integer maxCapacity;

    private BigDecimal customDeposit;
    private Boolean isActive;

    @NotNull(message = "Tọa độ X không được để trống")
    private Float posX;

    @NotNull(message = "Tọa độ Y không được để trống")
    private Float posY;

    private Float width;
    private Float height;
    private Float rotation;

    private String shape;
    private ZonedDateTime updatedAt;
}

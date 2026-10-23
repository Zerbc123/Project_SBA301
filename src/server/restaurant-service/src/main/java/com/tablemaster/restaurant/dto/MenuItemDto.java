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
public class MenuItemDto {
    private UUID id;

    @NotNull(message = "Danh mục không được để trống")
    private UUID categoryId;

    private String categoryName;

    @NotBlank(message = "Tên món ăn không được để trống")
    private String name;

    private String description;

    @NotNull(message = "Giá tiền không được để trống")
    @Min(value = 0, message = "Giá tiền không được âm")
    private BigDecimal price;

    private String imageUrl;
    private Boolean isPreorderAvailable;
    private Boolean isActive;
    private ZonedDateTime createdAt;
}

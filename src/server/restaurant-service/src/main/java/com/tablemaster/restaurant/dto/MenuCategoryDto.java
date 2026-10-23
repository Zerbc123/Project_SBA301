package com.tablemaster.restaurant.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MenuCategoryDto {
    private UUID id;

    @NotBlank(message = "Tên danh mục không được để trống")
    private String name;

    private Integer displayOrder;
    private Boolean isActive;
    private ZonedDateTime createdAt;

    // Optional items belonging to this category
    private List<MenuItemDto> items;
}

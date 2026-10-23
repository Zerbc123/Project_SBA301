package com.tablemaster.restaurant.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class FloorPlanDto {
    private UUID id;

    @NotNull(message = "Số tầng không được để trống")
    private Integer floorNumber;

    @NotBlank(message = "Tên mặt bằng không được để trống")
    private String name;

    @NotNull(message = "Chiều rộng không được để trống")
    @Min(value = 300, message = "Chiều rộng tối thiểu 300px")
    private Integer widthPx;

    @NotNull(message = "Chiều cao không được để trống")
    @Min(value = 200, message = "Chiều cao tối thiểu 200px")
    private Integer heightPx;

    @NotNull(message = "Kích thước lưới không được để trống")
    @Min(value = 5, message = "Kích thước lưới tối thiểu 5px")
    private Integer gridSize;

    private String layoutMetadata;
    private Boolean isPublished;
    private ZonedDateTime updatedAt;

    // Optional list of tables belonging to this floor
    private List<TableDto> tables;
}

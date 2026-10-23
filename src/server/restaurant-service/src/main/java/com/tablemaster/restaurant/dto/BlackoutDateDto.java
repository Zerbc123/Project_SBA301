package com.tablemaster.restaurant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlackoutDateDto {
    private UUID id;

    @NotNull(message = "Ngày diễn ra sự kiện không được để trống")
    private LocalDate eventDate;

    @NotBlank(message = "Tên sự kiện / ngày lễ không được để trống")
    private String eventName;

    private Boolean isClosed;
    private BigDecimal customDepositAmount;
    private Boolean requireSpecialMenu;
    private String note;
    private ZonedDateTime createdAt;
}

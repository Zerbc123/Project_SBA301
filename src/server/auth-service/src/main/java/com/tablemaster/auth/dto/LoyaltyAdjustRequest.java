package com.tablemaster.auth.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoyaltyAdjustRequest {

    @NotNull(message = "Số điểm thay đổi không được để trống")
    private Integer pointsDelta;

    private String reason;

    private String referenceId;
}

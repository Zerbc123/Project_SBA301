package com.tablemaster.booking.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * DTO: Quét QR Check-in tại sảnh
 * POST /api/v1/bookings/check-in
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckInRequest {

    @NotBlank(message = "Mã QR Token không được để trống")
    private String qrToken;
}

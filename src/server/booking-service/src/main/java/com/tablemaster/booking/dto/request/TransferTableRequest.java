package com.tablemaster.booking.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * DTO: Chuyển bàn cho khách (Table Re-assignment)
 * POST /api/v1/bookings/{id}/transfer-table
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransferTableRequest {

    @NotNull(message = "Bàn nguồn không được để trống")
    private UUID sourceTableId;

    @NotNull(message = "Bàn đích không được để trống")
    private UUID targetTableId;

    // Lý do chuyển bàn: "Khách thích view cửa sổ"
    private String reason;
}

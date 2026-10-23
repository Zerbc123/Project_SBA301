package com.tablemaster.booking.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * DTO: Lễ tân duyệt đơn & gửi yêu cầu cọc VietQR
 * POST /api/v1/bookings/{id}/approve-and-request-deposit
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApproveDepositRequest {

    // Ghi chú của Lễ tân sau cuộc gọi Telesales
    private String staffNotes;

    // Thời gian cho phép khách cọc (phút), mặc định 60 phút
    @Builder.Default
    @Min(value = 10, message = "Thời gian tối thiểu 10 phút")
    @Max(value = 1440, message = "Thời gian tối đa 24 giờ (1440 phút)")
    private Integer deadlineMinutes = 60;

    // Số tiền cọc (có thể điều chỉnh lại so với ban đầu)
    private BigDecimal depositAmount;
}

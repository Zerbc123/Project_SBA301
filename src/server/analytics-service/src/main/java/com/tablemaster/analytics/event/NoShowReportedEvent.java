package com.tablemaster.analytics.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Sự kiện khách bỏ bàn (No-Show) không đến nhận chỗ
 * Được bắn qua Kafka topic: booking.no-show
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class NoShowReportedEvent {

    @NotBlank(message = "Mã đặt bàn (bookingId) không được để trống")
    @Size(max = 64, message = "bookingId không vượt quá 64 ký tự")
    private String bookingId;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Ngày phải theo định dạng YYYY-MM-DD")
    private String date; // YYYY-MM-DD

    private String slotId;
    private String slotName;

    @NotNull(message = "Tiền phạt cọc không được null")
    @DecimalMin(value = "0.0", inclusive = true, message = "Tiền phạt cọc không được là số âm")
    @Digits(integer = 12, fraction = 2, message = "Tiền phạt cọc vượt quá giới hạn cho phép")
    @Builder.Default
    private BigDecimal penaltyAmount = BigDecimal.ZERO;
}

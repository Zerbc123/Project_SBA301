package com.tablemaster.analytics.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Sự kiện hoàn tất đặt bàn và dùng bữa tại nhà hàng
 * Được bắn qua Kafka topic: booking.completed
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class BookingCompletedEvent {

    @NotBlank(message = "Mã đặt bàn (bookingId) không được để trống")
    @Size(max = 64, message = "bookingId không vượt quá 64 ký tự")
    private String bookingId;

    @NotBlank(message = "Mã người dùng (userId) không được để trống")
    @Size(max = 64, message = "userId không vượt quá 64 ký tự")
    private String userId;

    @NotBlank(message = "Tên khách hàng không được để trống")
    @Size(max = 100, message = "Tên khách hàng không vượt quá 100 ký tự")
    private String customerName;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(\\+84|0)[0-9]{9,10}$", message = "Số điện thoại không đúng định dạng chuẩn (+84/0...)")
    private String phoneNumber;

    @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Ngày phải theo định dạng YYYY-MM-DD")
    private String date; // format: YYYY-MM-DD

    private String slotId;
    private String slotName;
    private String tableId;
    private String tableCode;
    private String zoneType;

    @NotNull(message = "Hóa đơn thanh toán không được null")
    @DecimalMin(value = "0.0", inclusive = true, message = "Hóa đơn thanh toán không được là số âm")
    @Digits(integer = 12, fraction = 2, message = "Hóa đơn vượt quá giới hạn số cho phép")
    @Builder.Default
    private BigDecimal foodBill = BigDecimal.ZERO;

    @NotNull(message = "Số lượng khách không được null")
    @Min(value = 1, message = "Số lượng khách tối thiểu là 1")
    @Max(value = 100, message = "Số lượng khách vượt quá quy mô bàn (tối đa 100)")
    @Builder.Default
    private Integer guestCount = 2;
}

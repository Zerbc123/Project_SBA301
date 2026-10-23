package com.tablemaster.restaurant.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RestaurantProfileDto {
    private UUID id;

    @NotBlank(message = "Tên nhà hàng không được để trống")
    private String name;

    @NotBlank(message = "Số hotline không được để trống")
    private String hotline;

    @NotBlank(message = "Email không được để trống")
    @Email(message = "Email không đúng định dạng")
    private String email;

    @NotBlank(message = "Địa chỉ không được để trống")
    private String address;

    private String description;
    private String coverImageUrl;

    @NotNull(message = "Giờ mở cửa không được để trống")
    private LocalTime openingTime;

    @NotNull(message = "Giờ đóng cửa không được để trống")
    private LocalTime closingTime;

    private Boolean isActive;

    @NotBlank(message = "Mã BIN ngân hàng không được để trống")
    private String bankBin;

    @NotBlank(message = "Tên ngân hàng không được để trống")
    private String bankName;

    @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
    private String bankAccountNo;

    @NotBlank(message = "Chủ tài khoản ngân hàng không được để trống")
    private String bankAccountHolder;

    @NotNull(message = "Mức tiền cọc mặc định không được để trống")
    @Min(value = 0, message = "Tiền cọc mặc định không thể âm")
    private BigDecimal defaultDepositAmount;

    @NotNull(message = "Thời gian hủy cọc không được để trống")
    @Min(value = 0, message = "Thời gian hủy cọc không thể âm")
    private Integer cancellationGraceHours;

    @NotNull(message = "Thời gian giữ chỗ tạm thời không được để trống")
    @Min(value = 30, message = "Thời gian giữ chỗ tối thiểu là 30 giây")
    private Integer holdTimeoutSeconds;

    private ZonedDateTime updatedAt;
}

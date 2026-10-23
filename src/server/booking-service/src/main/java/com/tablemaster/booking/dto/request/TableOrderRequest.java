package com.tablemaster.booking.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * DTO: Nhân viên phục vụ gọi thêm món tại bàn (In-Dining Orders)
 * POST /api/v1/bookings/{id}/table-orders
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableOrderRequest {

    @NotNull(message = "ID bàn không được để trống")
    private UUID tableId;

    @NotEmpty(message = "Danh sách món không được rỗng")
    @Valid
    private List<OrderItemRequest> items;

    /**
     * DTO nested: Thông tin từng món gọi thêm
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemRequest {

        // NULL nếu là món nhập ngoài menu (Phụ thu đặc biệt)
        private UUID menuItemId;

        @NotBlank(message = "Tên món không được để trống")
        @Size(max = 150)
        private String itemName;

        @NotNull(message = "Số lượng không được để trống")
        @Min(value = 1, message = "Số lượng phải ít nhất 1")
        private Integer quantity;

        @NotNull(message = "Đơn giá không được để trống")
        @DecimalMin(value = "0.0", inclusive = false)
        private BigDecimal unitPrice;

        // Ghi chú chế biến bếp: "Medium-rare, ít đá, không hành"
        private String notes;
    }
}

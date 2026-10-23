package com.tablemaster.booking.dto.response;

import com.tablemaster.booking.entity.TableOrderItem;
import lombok.*;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * DTO Response cho món gọi thêm tại bàn
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableOrderItemResponse {

    private UUID id;
    private UUID bookingId;
    private UUID tableId;
    private UUID menuItemId;
    private String itemName;
    private Integer quantity;
    private BigDecimal unitPrice;
    private String status;
    private String notes;
    private UUID orderedByUserId;
    private ZonedDateTime createdAt;

    public static TableOrderItemResponse fromEntity(TableOrderItem item) {
        return TableOrderItemResponse.builder()
                .id(item.getId())
                .bookingId(item.getBooking().getId())
                .tableId(item.getTableId())
                .menuItemId(item.getMenuItemId())
                .itemName(item.getItemName())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .status(item.getStatus().name())
                .notes(item.getNotes())
                .orderedByUserId(item.getOrderedByUserId())
                .createdAt(item.getCreatedAt())
                .build();
    }
}

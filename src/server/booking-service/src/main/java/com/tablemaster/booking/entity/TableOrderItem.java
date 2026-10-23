package com.tablemaster.booking.entity;

import com.tablemaster.booking.enums.OrderItemStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.ZonedDateTime;
import java.util.UUID;

/**
 * Bảng món gọi thêm tại bàn qua Tablet Phục vụ (table_order_items)
 * Nhân viên phục vụ bấm "Gọi thêm món" trên Mobile App
 */
@Entity
@Table(name = "table_order_items", indexes = {
        @Index(name = "idx_table_order_items", columnList = "booking_id, table_id, status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TableOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // Ref tablemaster_restaurant.tables(id) - không FK vì khác DB
    @Column(name = "table_id", nullable = false)
    private UUID tableId;

    // Ref menu_items (NULL nếu là món nhập ngoài menu - Phụ thu đặc biệt)
    @Column(name = "menu_item_id")
    private UUID menuItemId;

    @Column(name = "item_name", nullable = false, length = 150)
    private String itemName;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    // Trạng thái: PREPARING → SERVED / CANCELLED
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private OrderItemStatus status = OrderItemStatus.PREPARING;

    // Ghi chú chế biến bếp (Medium-rare, ít đá, không hành...)
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    // Ref tablemaster_auth.users(id) - Nhân viên phục vụ gọi món
    @Column(name = "ordered_by_user_id")
    private UUID orderedByUserId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private ZonedDateTime createdAt;
}

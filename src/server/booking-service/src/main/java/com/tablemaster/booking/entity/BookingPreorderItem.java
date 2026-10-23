package com.tablemaster.booking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Bảng món ăn đặt trước từ Web (booking_preorder_items)
 * Khách chọn các món Signature đặt trước khi cọc bàn (Wagyu, Rượu vang...)
 */
@Entity
@Table(name = "booking_preorder_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingPreorderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // Ref tablemaster_restaurant.menu_items(id) - không FK vì khác DB
    @Column(name = "menu_item_id", nullable = false)
    private UUID menuItemId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 12, scale = 2, nullable = false)
    private BigDecimal unitPrice;

    @Column(name = "subtotal", precision = 12, scale = 2, nullable = false)
    private BigDecimal subtotal;
}

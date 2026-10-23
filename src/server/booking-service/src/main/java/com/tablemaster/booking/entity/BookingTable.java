package com.tablemaster.booking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Bảng liên kết đặt bàn & ghép bàn (booking_tables)
 * Hỗ trợ chọn 1 bàn hoặc ghép nhiều bàn cho 1 đơn đặt
 * Composite PK: (booking_id, table_id)
 */
@Entity
@Table(name = "booking_tables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingTable {

    @EmbeddedId
    private BookingTableId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("bookingId")
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // table_id là UUID tham chiếu đến tablemaster_restaurant.tables(id)
    // Không dùng FK vì thuộc DB khác (Database-per-Service)
    public UUID getTableId() {
        return id != null ? id.getTableId() : null;
    }
}

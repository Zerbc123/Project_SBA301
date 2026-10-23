package com.tablemaster.booking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

/**
 * Embedded composite key cho bảng booking_tables (booking_id, table_id)
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class BookingTableId implements Serializable {

    @Column(name = "booking_id")
    private UUID bookingId;

    @Column(name = "table_id")
    private UUID tableId;
}

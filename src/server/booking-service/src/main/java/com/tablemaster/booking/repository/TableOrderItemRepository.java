package com.tablemaster.booking.repository;

import com.tablemaster.booking.entity.TableOrderItem;
import com.tablemaster.booking.enums.OrderItemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TableOrderItemRepository extends JpaRepository<TableOrderItem, UUID> {

    List<TableOrderItem> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    List<TableOrderItem> findByBookingIdOrderByCreatedAtAsc(UUID bookingId);

    List<TableOrderItem> findByBookingIdAndTableId(UUID bookingId, UUID tableId);

    List<TableOrderItem> findByBookingIdAndStatus(UUID bookingId, OrderItemStatus status);
}

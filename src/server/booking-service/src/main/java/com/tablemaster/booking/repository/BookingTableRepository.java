package com.tablemaster.booking.repository;

import com.tablemaster.booking.entity.BookingTable;
import com.tablemaster.booking.entity.BookingTableId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface BookingTableRepository extends JpaRepository<BookingTable, BookingTableId> {

    List<BookingTable> findByIdBookingId(UUID bookingId);

    void deleteByIdBookingId(UUID bookingId);
}

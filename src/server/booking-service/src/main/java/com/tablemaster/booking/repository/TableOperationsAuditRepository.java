package com.tablemaster.booking.repository;

import com.tablemaster.booking.entity.TableOperationsAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TableOperationsAuditRepository extends JpaRepository<TableOperationsAudit, UUID> {

    List<TableOperationsAudit> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);
}

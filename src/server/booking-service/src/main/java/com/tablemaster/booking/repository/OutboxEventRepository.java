package com.tablemaster.booking.repository;

import com.tablemaster.booking.entity.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    // Tìm các event chưa gửi (poller sẽ quét định kỳ)
    List<OutboxEvent> findByStatusOrderByCreatedAtAsc(String status);

    // Tìm các event thất bại dưới ngưỡng retry
    List<OutboxEvent> findByStatusAndRetryCountLessThanOrderByCreatedAtAsc(String status, int maxRetry);
}

package com.tablemaster.auth.repository;

import com.tablemaster.auth.entity.Review;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    List<Review> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Review> findByBookingId(UUID bookingId);

    boolean existsByBookingIdAndUserId(UUID bookingId, UUID userId);

    List<Review> findAllByOrderByCreatedAtDesc(Pageable pageable);
}

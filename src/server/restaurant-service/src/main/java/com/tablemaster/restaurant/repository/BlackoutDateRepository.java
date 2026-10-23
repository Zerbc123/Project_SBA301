package com.tablemaster.restaurant.repository;

import com.tablemaster.restaurant.entity.BlackoutDate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BlackoutDateRepository extends JpaRepository<BlackoutDate, UUID> {
    List<BlackoutDate> findAllByOrderByEventDateAsc();
    Optional<BlackoutDate> findByEventDate(LocalDate eventDate);
    boolean existsByEventDate(LocalDate eventDate);
    boolean existsByEventDateAndIdNot(LocalDate eventDate, UUID id);
}

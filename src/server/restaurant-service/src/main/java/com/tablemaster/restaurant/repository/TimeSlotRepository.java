package com.tablemaster.restaurant.repository;

import com.tablemaster.restaurant.entity.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, UUID> {
    List<TimeSlot> findAllByOrderByStartTimeAsc();
    List<TimeSlot> findByIsActiveTrueOrderByStartTimeAsc();
    Optional<TimeSlot> findByStartTimeAndEndTime(LocalTime startTime, LocalTime endTime);
}

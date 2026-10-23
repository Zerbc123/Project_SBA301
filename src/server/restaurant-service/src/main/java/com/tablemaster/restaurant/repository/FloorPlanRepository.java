package com.tablemaster.restaurant.repository;

import com.tablemaster.restaurant.entity.FloorPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FloorPlanRepository extends JpaRepository<FloorPlan, UUID> {
    List<FloorPlan> findAllByOrderByFloorNumberAsc();
    List<FloorPlan> findByIsPublishedTrueOrderByFloorNumberAsc();
    Optional<FloorPlan> findByFloorNumber(Integer floorNumber);
}

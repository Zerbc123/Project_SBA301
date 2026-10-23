package com.tablemaster.restaurant.repository;

import com.tablemaster.restaurant.entity.TableEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TableRepository extends JpaRepository<TableEntity, UUID> {
    List<TableEntity> findByFloorPlanId(UUID floorPlanId);
    List<TableEntity> findByFloorPlanIdAndIsActiveTrue(UUID floorPlanId);
    Optional<TableEntity> findByTableCode(String tableCode);
    boolean existsByTableCode(String tableCode);
    boolean existsByTableCodeAndIdNot(String tableCode, UUID id);
}

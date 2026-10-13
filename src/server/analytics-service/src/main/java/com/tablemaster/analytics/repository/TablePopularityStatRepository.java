package com.tablemaster.analytics.repository;

import com.tablemaster.analytics.entity.TablePopularityStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TablePopularityStatRepository extends JpaRepository<TablePopularityStat, UUID> {

    Optional<TablePopularityStat> findByTableId(UUID tableId);

    Optional<TablePopularityStat> findByTableCode(String tableCode);

    List<TablePopularityStat> findAllByOrderByTotalRevenueGeneratedDesc();

    List<TablePopularityStat> findTop5ByOrderByTotalRevenueGeneratedDesc();

    List<TablePopularityStat> findAllByZoneTypeOrderByTotalReservationsDesc(String zoneType);
}

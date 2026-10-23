package com.tablemaster.analytics.repository;

import com.tablemaster.analytics.entity.DailyShiftMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DailyShiftMetricRepository extends JpaRepository<DailyShiftMetric, UUID> {

    Optional<DailyShiftMetric> findByMetricDateAndTimeSlotId(LocalDate metricDate, UUID timeSlotId);

    List<DailyShiftMetric> findAllByMetricDateOrderByCreatedAtAsc(LocalDate metricDate);

    List<DailyShiftMetric> findAllByMetricDateBetweenOrderByMetricDateAsc(LocalDate startDate, LocalDate endDate);
}

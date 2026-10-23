package com.tablemaster.booking.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.UUID;

/**
 * Tóm tắt tình trạng bàn trống theo từng ca giờ trong ngày
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeSlotAvailabilitySummary {
    private UUID timeSlotId;
    private String slotName;
    private LocalTime startTime;
    private LocalTime endTime;
    private String shift; // "LUNCH", "DINNER", "LATE_NIGHT"
    private int availableTablesCount;
    private int totalTablesCount;
    private boolean isAvailable;
}

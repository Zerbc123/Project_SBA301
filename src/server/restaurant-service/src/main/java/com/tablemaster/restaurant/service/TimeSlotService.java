package com.tablemaster.restaurant.service;

import com.tablemaster.restaurant.dto.TimeSlotDto;
import com.tablemaster.restaurant.entity.TimeSlot;
import com.tablemaster.restaurant.exception.BadRequestException;
import com.tablemaster.restaurant.exception.ConflictException;
import com.tablemaster.restaurant.exception.ErrorCode;
import com.tablemaster.restaurant.exception.ResourceNotFoundException;
import com.tablemaster.restaurant.repository.TimeSlotRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimeSlotService {

    private final TimeSlotRepository timeSlotRepository;

    @Transactional(readOnly = true)
    public List<TimeSlotDto> getAllTimeSlots(boolean activeOnly) {
        List<TimeSlot> slots = activeOnly
                ? timeSlotRepository.findByIsActiveTrueOrderByStartTimeAsc()
                : timeSlotRepository.findAllByOrderByStartTimeAsc();
        return slots.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TimeSlotDto getTimeSlotById(UUID id) {
        TimeSlot slot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TIME_SLOT_NOT_FOUND));
        return mapToDto(slot);
    }

    @Transactional
    public TimeSlotDto createTimeSlot(TimeSlotDto dto) {
        validateTimeSlot(dto, null);

        TimeSlot timeSlot = TimeSlot.builder()
                .slotName(dto.getSlotName())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .maxCapacity(dto.getMaxCapacity() != null ? dto.getMaxCapacity() : 50)
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .build();

        TimeSlot saved = timeSlotRepository.save(timeSlot);
        return mapToDto(saved);
    }

    @Transactional
    public TimeSlotDto updateTimeSlot(UUID id, TimeSlotDto dto) {
        TimeSlot slot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TIME_SLOT_NOT_FOUND));

        validateTimeSlot(dto, id);

        slot.setSlotName(dto.getSlotName());
        slot.setStartTime(dto.getStartTime());
        slot.setEndTime(dto.getEndTime());
        if (dto.getMaxCapacity() != null) {
            slot.setMaxCapacity(dto.getMaxCapacity());
        }
        if (dto.getIsActive() != null) {
            slot.setIsActive(dto.getIsActive());
        }

        TimeSlot saved = timeSlotRepository.save(slot);
        return mapToDto(saved);
    }

    @Transactional
    public void deleteTimeSlot(UUID id) {
        if (!timeSlotRepository.existsById(id)) {
            throw new ResourceNotFoundException(ErrorCode.TIME_SLOT_NOT_FOUND);
        }
        timeSlotRepository.deleteById(id);
    }

    @Transactional
    public TimeSlotDto toggleStatus(UUID id) {
        TimeSlot slot = timeSlotRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TIME_SLOT_NOT_FOUND));
        slot.setIsActive(!slot.getIsActive());
        return mapToDto(timeSlotRepository.save(slot));
    }

    private void validateTimeSlot(TimeSlotDto dto, UUID currentId) {
        if (dto.getStartTime().compareTo(dto.getEndTime()) >= 0) {
            throw new BadRequestException(ErrorCode.TIME_SLOT_INVALID_HOURS);
        }

        timeSlotRepository.findByStartTimeAndEndTime(dto.getStartTime(), dto.getEndTime())
                .ifPresent(existing -> {
                    if (currentId == null || !existing.getId().equals(currentId)) {
                        throw new ConflictException(ErrorCode.TIME_SLOT_ALREADY_EXISTS);
                    }
                });
    }

    private TimeSlotDto mapToDto(TimeSlot entity) {
        return TimeSlotDto.builder()
                .id(entity.getId())
                .slotName(entity.getSlotName())
                .startTime(entity.getStartTime())
                .endTime(entity.getEndTime())
                .maxCapacity(entity.getMaxCapacity())
                .isActive(entity.getIsActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

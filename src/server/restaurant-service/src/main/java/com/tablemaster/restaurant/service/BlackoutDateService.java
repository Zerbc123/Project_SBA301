package com.tablemaster.restaurant.service;

import com.tablemaster.restaurant.dto.BlackoutDateDto;
import com.tablemaster.restaurant.entity.BlackoutDate;
import com.tablemaster.restaurant.exception.ConflictException;
import com.tablemaster.restaurant.exception.ErrorCode;
import com.tablemaster.restaurant.exception.ResourceNotFoundException;
import com.tablemaster.restaurant.repository.BlackoutDateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BlackoutDateService {

    private final BlackoutDateRepository blackoutDateRepository;

    @Transactional(readOnly = true)
    public List<BlackoutDateDto> getAllBlackoutDates() {
        return blackoutDateRepository.findAllByOrderByEventDateAsc()
                .stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BlackoutDateDto getBlackoutDateById(UUID id) {
        BlackoutDate entity = blackoutDateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BLACKOUT_DATE_NOT_FOUND));
        return mapToDto(entity);
    }

    @Transactional(readOnly = true)
    public Optional<BlackoutDateDto> getByDate(LocalDate date) {
        return blackoutDateRepository.findByEventDate(date).map(this::mapToDto);
    }

    @Transactional
    public BlackoutDateDto createBlackoutDate(BlackoutDateDto dto) {
        if (blackoutDateRepository.existsByEventDate(dto.getEventDate())) {
            throw new ConflictException(ErrorCode.BLACKOUT_DATE_ALREADY_EXISTS);
        }

        BlackoutDate entity = BlackoutDate.builder()
                .eventDate(dto.getEventDate())
                .eventName(dto.getEventName())
                .isClosed(dto.getIsClosed() != null ? dto.getIsClosed() : false)
                .customDepositAmount(dto.getCustomDepositAmount())
                .requireSpecialMenu(dto.getRequireSpecialMenu() != null ? dto.getRequireSpecialMenu() : false)
                .note(dto.getNote())
                .build();

        BlackoutDate saved = blackoutDateRepository.save(entity);
        return mapToDto(saved);
    }

    @Transactional
    public BlackoutDateDto updateBlackoutDate(UUID id, BlackoutDateDto dto) {
        BlackoutDate entity = blackoutDateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.BLACKOUT_DATE_NOT_FOUND));

        if (!entity.getEventDate().equals(dto.getEventDate()) && blackoutDateRepository.existsByEventDateAndIdNot(dto.getEventDate(), id)) {
            throw new ConflictException(ErrorCode.BLACKOUT_DATE_ALREADY_EXISTS);
        }

        entity.setEventDate(dto.getEventDate());
        entity.setEventName(dto.getEventName());
        if (dto.getIsClosed() != null) entity.setIsClosed(dto.getIsClosed());
        entity.setCustomDepositAmount(dto.getCustomDepositAmount());
        if (dto.getRequireSpecialMenu() != null) entity.setRequireSpecialMenu(dto.getRequireSpecialMenu());
        entity.setNote(dto.getNote());

        BlackoutDate saved = blackoutDateRepository.save(entity);
        return mapToDto(saved);
    }

    @Transactional
    public void deleteBlackoutDate(UUID id) {
        if (!blackoutDateRepository.existsById(id)) {
            throw new ResourceNotFoundException(ErrorCode.BLACKOUT_DATE_NOT_FOUND);
        }
        blackoutDateRepository.deleteById(id);
    }

    private BlackoutDateDto mapToDto(BlackoutDate entity) {
        return BlackoutDateDto.builder()
                .id(entity.getId())
                .eventDate(entity.getEventDate())
                .eventName(entity.getEventName())
                .isClosed(entity.getIsClosed())
                .customDepositAmount(entity.getCustomDepositAmount())
                .requireSpecialMenu(entity.getRequireSpecialMenu())
                .note(entity.getNote())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

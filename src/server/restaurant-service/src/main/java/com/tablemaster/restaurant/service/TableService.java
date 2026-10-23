package com.tablemaster.restaurant.service;

import com.tablemaster.restaurant.dto.TableDto;
import com.tablemaster.restaurant.entity.TableEntity;
import com.tablemaster.restaurant.exception.BadRequestException;
import com.tablemaster.restaurant.exception.ConflictException;
import com.tablemaster.restaurant.exception.ErrorCode;
import com.tablemaster.restaurant.exception.ResourceNotFoundException;
import com.tablemaster.restaurant.repository.FloorPlanRepository;
import com.tablemaster.restaurant.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TableService {

    private final TableRepository tableRepository;
    private final FloorPlanRepository floorPlanRepository;

    @Transactional(readOnly = true)
    public List<TableDto> getAllTables(UUID floorPlanId, boolean activeOnly) {
        List<TableEntity> tables;
        if (floorPlanId != null) {
            tables = activeOnly
                    ? tableRepository.findByFloorPlanIdAndIsActiveTrue(floorPlanId)
                    : tableRepository.findByFloorPlanId(floorPlanId);
        } else {
            tables = tableRepository.findAll();
            if (activeOnly) {
                tables = tables.stream().filter(TableEntity::getIsActive).collect(Collectors.toList());
            }
        }
        return tables.stream().map(this::mapToDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TableDto getTableById(UUID id) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TABLE_NOT_FOUND));
        return mapToDto(table);
    }

    @Transactional(readOnly = true)
    public TableDto getTableByCode(String code) {
        TableEntity table = tableRepository.findByTableCode(code)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TABLE_NOT_FOUND));
        return mapToDto(table);
    }

    @Transactional
    public TableDto createTable(TableDto dto) {
        validateTable(dto, null);

        TableEntity table = TableEntity.builder()
                .floorPlanId(dto.getFloorPlanId())
                .tableCode(dto.getTableCode().trim().toUpperCase())
                .zoneType(dto.getZoneType() != null ? dto.getZoneType() : "STANDARD")
                .minCapacity(dto.getMinCapacity())
                .maxCapacity(dto.getMaxCapacity())
                .customDeposit(dto.getCustomDeposit())
                .isActive(dto.getIsActive() != null ? dto.getIsActive() : true)
                .posX(dto.getPosX() != null ? dto.getPosX() : 100.0f)
                .posY(dto.getPosY() != null ? dto.getPosY() : 100.0f)
                .width(dto.getWidth() != null ? dto.getWidth() : 80.0f)
                .height(dto.getHeight() != null ? dto.getHeight() : 80.0f)
                .rotation(dto.getRotation() != null ? dto.getRotation() : 0.0f)
                .shape(dto.getShape() != null ? dto.getShape().toUpperCase() : "RECT")
                .build();

        TableEntity saved = tableRepository.save(table);
        return mapToDto(saved);
    }

    @Transactional
    public TableDto updateTable(UUID id, TableDto dto) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TABLE_NOT_FOUND));

        validateTable(dto, id);

        table.setFloorPlanId(dto.getFloorPlanId());
        table.setTableCode(dto.getTableCode().trim().toUpperCase());
        if (dto.getZoneType() != null) table.setZoneType(dto.getZoneType());
        table.setMinCapacity(dto.getMinCapacity());
        table.setMaxCapacity(dto.getMaxCapacity());
        table.setCustomDeposit(dto.getCustomDeposit());
        if (dto.getIsActive() != null) table.setIsActive(dto.getIsActive());
        if (dto.getPosX() != null) table.setPosX(dto.getPosX());
        if (dto.getPosY() != null) table.setPosY(dto.getPosY());
        if (dto.getWidth() != null) table.setWidth(dto.getWidth());
        if (dto.getHeight() != null) table.setHeight(dto.getHeight());
        if (dto.getRotation() != null) table.setRotation(dto.getRotation());
        if (dto.getShape() != null) table.setShape(dto.getShape().toUpperCase());

        TableEntity saved = tableRepository.save(table);
        return mapToDto(saved);
    }

    @Transactional
    public List<TableDto> batchUpdatePositions(List<TableDto> tableDtos) {
        List<TableDto> result = new ArrayList<>();
        for (TableDto dto : tableDtos) {
            if (dto.getId() == null) continue;
            TableEntity table = tableRepository.findById(dto.getId()).orElse(null);
            if (table != null) {
                if (dto.getPosX() != null) table.setPosX(dto.getPosX());
                if (dto.getPosY() != null) table.setPosY(dto.getPosY());
                if (dto.getWidth() != null) table.setWidth(dto.getWidth());
                if (dto.getHeight() != null) table.setHeight(dto.getHeight());
                if (dto.getRotation() != null) table.setRotation(dto.getRotation());
                if (dto.getShape() != null) table.setShape(dto.getShape().toUpperCase());
                result.add(mapToDto(tableRepository.save(table)));
            }
        }
        return result;
    }

    @Transactional
    public TableDto toggleActive(UUID id) {
        TableEntity table = tableRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.TABLE_NOT_FOUND));
        table.setIsActive(!table.getIsActive());
        return mapToDto(tableRepository.save(table));
    }

    @Transactional
    public void deleteTable(UUID id) {
        if (!tableRepository.existsById(id)) {
            throw new ResourceNotFoundException(ErrorCode.TABLE_NOT_FOUND);
        }
        tableRepository.deleteById(id);
    }

    private void validateTable(TableDto dto, UUID currentId) {
        if (!floorPlanRepository.existsById(dto.getFloorPlanId())) {
            throw new ResourceNotFoundException(ErrorCode.FLOOR_PLAN_NOT_FOUND);
        }

        if (dto.getMinCapacity() > dto.getMaxCapacity()) {
            throw new BadRequestException(ErrorCode.TABLE_CAPACITY_INVALID);
        }

        String code = dto.getTableCode().trim().toUpperCase();
        boolean exists = (currentId == null)
                ? tableRepository.existsByTableCode(code)
                : tableRepository.existsByTableCodeAndIdNot(code, currentId);

        if (exists) {
            throw new ConflictException(ErrorCode.TABLE_CODE_ALREADY_EXISTS);
        }
    }

    public TableDto mapToDto(TableEntity entity) {
        return TableDto.builder()
                .id(entity.getId())
                .floorPlanId(entity.getFloorPlanId())
                .tableCode(entity.getTableCode())
                .zoneType(entity.getZoneType())
                .minCapacity(entity.getMinCapacity())
                .maxCapacity(entity.getMaxCapacity())
                .customDeposit(entity.getCustomDeposit())
                .isActive(entity.getIsActive())
                .posX(entity.getPosX())
                .posY(entity.getPosY())
                .width(entity.getWidth())
                .height(entity.getHeight())
                .rotation(entity.getRotation())
                .shape(entity.getShape())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}

package com.tablemaster.restaurant.service;

import com.tablemaster.restaurant.dto.FloorPlanDto;
import com.tablemaster.restaurant.dto.TableDto;
import com.tablemaster.restaurant.entity.FloorPlan;
import com.tablemaster.restaurant.entity.TableEntity;
import com.tablemaster.restaurant.exception.ConflictException;
import com.tablemaster.restaurant.exception.ErrorCode;
import com.tablemaster.restaurant.exception.ResourceNotFoundException;
import com.tablemaster.restaurant.repository.FloorPlanRepository;
import com.tablemaster.restaurant.repository.TableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FloorPlanService {

    private final FloorPlanRepository floorPlanRepository;
    private final TableRepository tableRepository;

    @Transactional(readOnly = true)
    public List<FloorPlanDto> getAllFloorPlans(boolean publishedOnly, boolean includeTables) {
        List<FloorPlan> plans = publishedOnly
                ? floorPlanRepository.findByIsPublishedTrueOrderByFloorNumberAsc()
                : floorPlanRepository.findAllByOrderByFloorNumberAsc();

        return plans.stream().map(plan -> {
            FloorPlanDto dto = mapToDto(plan);
            if (includeTables) {
                List<TableEntity> tables = tableRepository.findByFloorPlanId(plan.getId());
                dto.setTables(tables.stream().map(this::mapTableToDto).collect(Collectors.toList()));
            }
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public FloorPlanDto getFloorPlanById(UUID id, boolean includeTables) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FLOOR_PLAN_NOT_FOUND));

        FloorPlanDto dto = mapToDto(plan);
        if (includeTables) {
            List<TableEntity> tables = tableRepository.findByFloorPlanId(plan.getId());
            dto.setTables(tables.stream().map(this::mapTableToDto).collect(Collectors.toList()));
        }
        return dto;
    }

    @Transactional(readOnly = true)
    public FloorPlanDto getFloorPlanByNumber(Integer floorNumber, boolean includeTables) {
        FloorPlan plan = floorPlanRepository.findByFloorNumber(floorNumber)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FLOOR_PLAN_NOT_FOUND));

        FloorPlanDto dto = mapToDto(plan);
        if (includeTables) {
            List<TableEntity> tables = tableRepository.findByFloorPlanId(plan.getId());
            dto.setTables(tables.stream().map(this::mapTableToDto).collect(Collectors.toList()));
        }
        return dto;
    }

    @Transactional
    public FloorPlanDto createFloorPlan(FloorPlanDto dto) {
        floorPlanRepository.findByFloorNumber(dto.getFloorNumber()).ifPresent(existing -> {
            throw new ConflictException(ErrorCode.FLOOR_PLAN_ALREADY_EXISTS);
        });

        String layoutMeta = (dto.getLayoutMetadata() != null && !dto.getLayoutMetadata().trim().isEmpty())
                ? dto.getLayoutMetadata()
                : "{\"walls\":[], \"windows\":[], \"doors\":[], \"facilities\":[]}";

        FloorPlan plan = FloorPlan.builder()
                .floorNumber(dto.getFloorNumber())
                .name(dto.getName())
                .widthPx(dto.getWidthPx() != null ? dto.getWidthPx() : 1600)
                .heightPx(dto.getHeightPx() != null ? dto.getHeightPx() : 900)
                .gridSize(dto.getGridSize() != null ? dto.getGridSize() : 20)
                .layoutMetadata(layoutMeta)
                .isPublished(dto.getIsPublished() != null ? dto.getIsPublished() : true)
                .build();

        FloorPlan saved = floorPlanRepository.save(plan);
        return mapToDto(saved);
    }

    @Transactional
    public FloorPlanDto updateFloorPlan(UUID id, FloorPlanDto dto) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FLOOR_PLAN_NOT_FOUND));

        if (!plan.getFloorNumber().equals(dto.getFloorNumber())) {
            floorPlanRepository.findByFloorNumber(dto.getFloorNumber()).ifPresent(existing -> {
                throw new ConflictException(ErrorCode.FLOOR_PLAN_ALREADY_EXISTS);
            });
            plan.setFloorNumber(dto.getFloorNumber());
        }

        plan.setName(dto.getName());
        if (dto.getWidthPx() != null) plan.setWidthPx(dto.getWidthPx());
        if (dto.getHeightPx() != null) plan.setHeightPx(dto.getHeightPx());
        if (dto.getGridSize() != null) plan.setGridSize(dto.getGridSize());
        if (dto.getLayoutMetadata() != null) plan.setLayoutMetadata(dto.getLayoutMetadata());
        if (dto.getIsPublished() != null) plan.setIsPublished(dto.getIsPublished());

        FloorPlan saved = floorPlanRepository.save(plan);
        return mapToDto(saved);
    }

    @Transactional
    public FloorPlanDto updateLayoutMetadata(UUID id, String layoutMetadata) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FLOOR_PLAN_NOT_FOUND));
        String validMeta = (layoutMetadata != null && !layoutMetadata.trim().isEmpty())
                ? layoutMetadata
                : "{\"walls\":[], \"windows\":[], \"doors\":[], \"facilities\":[]}";
        plan.setLayoutMetadata(validMeta);
        return mapToDto(floorPlanRepository.save(plan));
    }

    @Transactional
    public FloorPlanDto togglePublished(UUID id) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.FLOOR_PLAN_NOT_FOUND));
        plan.setIsPublished(!plan.getIsPublished());
        return mapToDto(floorPlanRepository.save(plan));
    }

    @Transactional
    public void deleteFloorPlan(UUID id) {
        if (!floorPlanRepository.existsById(id)) {
            throw new ResourceNotFoundException(ErrorCode.FLOOR_PLAN_NOT_FOUND);
        }
        floorPlanRepository.deleteById(id);
    }

    private FloorPlanDto mapToDto(FloorPlan entity) {
        return FloorPlanDto.builder()
                .id(entity.getId())
                .floorNumber(entity.getFloorNumber())
                .name(entity.getName())
                .widthPx(entity.getWidthPx())
                .heightPx(entity.getHeightPx())
                .gridSize(entity.getGridSize())
                .layoutMetadata(entity.getLayoutMetadata())
                .isPublished(entity.getIsPublished())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private TableDto mapTableToDto(TableEntity entity) {
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

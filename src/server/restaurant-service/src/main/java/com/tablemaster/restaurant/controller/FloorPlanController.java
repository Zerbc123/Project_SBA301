package com.tablemaster.restaurant.controller;

import com.tablemaster.restaurant.dto.ApiResponse;
import com.tablemaster.restaurant.dto.FloorPlanDto;
import com.tablemaster.restaurant.dto.TableDto;
import com.tablemaster.restaurant.service.FloorPlanService;
import com.tablemaster.restaurant.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/floor-plans", "/api/v1/restaurant/floor-plans"})
@RequiredArgsConstructor
public class FloorPlanController {

    private final FloorPlanService floorPlanService;
    private final TableService tableService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FloorPlanDto>>> getAllFloorPlans(
            @RequestParam(value = "publishedOnly", defaultValue = "false") boolean publishedOnly,
            @RequestParam(value = "includeTables", defaultValue = "false") boolean includeTables) {
        return ResponseEntity.ok(ApiResponse.success(floorPlanService.getAllFloorPlans(publishedOnly, includeTables)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FloorPlanDto>> getFloorPlanById(
            @PathVariable("id") UUID id,
            @RequestParam(value = "includeTables", defaultValue = "true") boolean includeTables) {
        return ResponseEntity.ok(ApiResponse.success(floorPlanService.getFloorPlanById(id, includeTables)));
    }

    @GetMapping("/number/{floorNumber}")
    public ResponseEntity<ApiResponse<FloorPlanDto>> getFloorPlanByNumber(
            @PathVariable("floorNumber") Integer floorNumber,
            @RequestParam(value = "includeTables", defaultValue = "true") boolean includeTables) {
        return ResponseEntity.ok(ApiResponse.success(floorPlanService.getFloorPlanByNumber(floorNumber, includeTables)));
    }

    @GetMapping("/{id}/tables")
    public ResponseEntity<ApiResponse<List<TableDto>>> getTablesByFloorPlanId(
            @PathVariable("id") UUID id,
            @RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(ApiResponse.success(tableService.getAllTables(id, activeOnly)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FloorPlanDto>> createFloorPlan(@Valid @RequestBody FloorPlanDto dto) {
        FloorPlanDto created = floorPlanService.createFloorPlan(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo sơ đồ tầng thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FloorPlanDto>> updateFloorPlan(
            @PathVariable("id") UUID id,
            @Valid @RequestBody FloorPlanDto dto) {
        FloorPlanDto updated = floorPlanService.updateFloorPlan(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật sơ đồ tầng thành công", updated));
    }

    @PatchMapping("/{id}/layout")
    public ResponseEntity<ApiResponse<FloorPlanDto>> updateLayout(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, String> payload) {
        String layoutMetadata = payload.getOrDefault("layoutMetadata", "{}");
        FloorPlanDto updated = floorPlanService.updateLayoutMetadata(id, layoutMetadata);
        return ResponseEntity.ok(ApiResponse.success("Lưu cấu trúc sơ đồ thành công", updated));
    }

    @PatchMapping("/{id}/publish")
    public ResponseEntity<ApiResponse<FloorPlanDto>> togglePublish(@PathVariable("id") UUID id) {
        FloorPlanDto updated = floorPlanService.togglePublished(id);
        String msg = Boolean.TRUE.equals(updated.getIsPublished()) ? "Xuất bản sơ đồ thành công" : "Thu hồi xuất bản sơ đồ thành công";
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFloorPlan(@PathVariable("id") UUID id) {
        floorPlanService.deleteFloorPlan(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa sơ đồ tầng thành công", null));
    }
}

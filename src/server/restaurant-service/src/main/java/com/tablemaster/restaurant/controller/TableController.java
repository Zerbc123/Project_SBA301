package com.tablemaster.restaurant.controller;

import com.tablemaster.restaurant.dto.ApiResponse;
import com.tablemaster.restaurant.dto.TableDto;
import com.tablemaster.restaurant.service.TableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/tables", "/api/v1/restaurant/tables"})
@RequiredArgsConstructor
public class TableController {

    private final TableService tableService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TableDto>>> getAllTables(
            @RequestParam(value = "floorPlanId", required = false) UUID floorPlanId,
            @RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly) {
        return ResponseEntity.ok(ApiResponse.success(tableService.getAllTables(floorPlanId, activeOnly)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TableDto>> getTableById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(ApiResponse.success(tableService.getTableById(id)));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<ApiResponse<TableDto>> getTableByCode(@PathVariable("code") String code) {
        return ResponseEntity.ok(ApiResponse.success(tableService.getTableByCode(code)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TableDto>> createTable(@Valid @RequestBody TableDto dto) {
        TableDto created = tableService.createTable(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo bàn thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TableDto>> updateTable(
            @PathVariable("id") UUID id,
            @Valid @RequestBody TableDto dto) {
        TableDto updated = tableService.updateTable(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin bàn thành công", updated));
    }

    @PutMapping("/batch-positions")
    public ResponseEntity<ApiResponse<List<TableDto>>> batchUpdatePositions(@RequestBody List<TableDto> tableDtos) {
        List<TableDto> updated = tableService.batchUpdatePositions(tableDtos);
        return ResponseEntity.ok(ApiResponse.success("Lưu tọa độ vị trí các bàn thành công", updated));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<TableDto>> toggleActive(@PathVariable("id") UUID id) {
        TableDto updated = tableService.toggleActive(id);
        String msg = Boolean.TRUE.equals(updated.getIsActive()) ? "Kích hoạt bàn thành công" : "Ngừng hoạt động bàn thành công";
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTable(@PathVariable("id") UUID id) {
        tableService.deleteTable(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa bàn thành công", null));
    }
}

package com.tablemaster.restaurant.controller;

import com.tablemaster.restaurant.dto.ApiResponse;
import com.tablemaster.restaurant.dto.MenuItemDto;
import com.tablemaster.restaurant.service.MenuItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/menu/items", "/api/v1/restaurant/menu/items"})
@RequiredArgsConstructor
public class MenuItemController {

    private final MenuItemService itemService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MenuItemDto>>> getAllMenuItems(
            @RequestParam(value = "categoryId", required = false) UUID categoryId,
            @RequestParam(value = "activeOnly", required = false) Boolean activeOnly,
            @RequestParam(value = "preorderOnly", required = false) Boolean preorderOnly) {
        return ResponseEntity.ok(ApiResponse.success(itemService.getAllMenuItems(categoryId, activeOnly, preorderOnly)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuItemDto>> getMenuItemById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(ApiResponse.success(itemService.getMenuItemById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MenuItemDto>> createMenuItem(@Valid @RequestBody MenuItemDto dto) {
        MenuItemDto created = itemService.createMenuItem(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm món ăn thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuItemDto>> updateMenuItem(
            @PathVariable("id") UUID id,
            @Valid @RequestBody MenuItemDto dto) {
        MenuItemDto updated = itemService.updateMenuItem(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật món ăn thành công", updated));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<MenuItemDto>> toggleActive(@PathVariable("id") UUID id) {
        MenuItemDto updated = itemService.toggleActive(id);
        String msg = Boolean.TRUE.equals(updated.getIsActive()) ? "Kích hoạt món ăn thành công" : "Ngừng kích hoạt món ăn thành công";
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMenuItem(@PathVariable("id") UUID id) {
        itemService.deleteMenuItem(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa món ăn thành công", null));
    }
}

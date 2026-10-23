package com.tablemaster.restaurant.controller;

import com.tablemaster.restaurant.dto.ApiResponse;
import com.tablemaster.restaurant.dto.MenuCategoryDto;
import com.tablemaster.restaurant.service.MenuCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/menu/categories", "/api/v1/restaurant/menu/categories"})
@RequiredArgsConstructor
public class MenuCategoryController {

    private final MenuCategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<MenuCategoryDto>>> getAllCategories(
            @RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly,
            @RequestParam(value = "includeItems", defaultValue = "false") boolean includeItems) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getAllCategories(activeOnly, includeItems)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuCategoryDto>> getCategoryById(
            @PathVariable("id") UUID id,
            @RequestParam(value = "includeItems", defaultValue = "true") boolean includeItems) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getCategoryById(id, includeItems)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<MenuCategoryDto>> createCategory(@Valid @RequestBody MenuCategoryDto dto) {
        MenuCategoryDto created = categoryService.createCategory(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo danh mục món ăn thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MenuCategoryDto>> updateCategory(
            @PathVariable("id") UUID id,
            @Valid @RequestBody MenuCategoryDto dto) {
        MenuCategoryDto updated = categoryService.updateCategory(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật danh mục thành công", updated));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<MenuCategoryDto>> toggleActive(@PathVariable("id") UUID id) {
        MenuCategoryDto updated = categoryService.toggleActive(id);
        String msg = Boolean.TRUE.equals(updated.getIsActive()) ? "Kích hoạt danh mục thành công" : "Ngừng kích hoạt danh mục thành công";
        return ResponseEntity.ok(ApiResponse.success(msg, updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCategory(@PathVariable("id") UUID id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa danh mục thành công", null));
    }
}

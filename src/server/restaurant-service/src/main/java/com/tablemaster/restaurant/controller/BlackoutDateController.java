package com.tablemaster.restaurant.controller;

import com.tablemaster.restaurant.dto.ApiResponse;
import com.tablemaster.restaurant.dto.BlackoutDateDto;
import com.tablemaster.restaurant.service.BlackoutDateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/blackout-dates", "/api/v1/restaurant/blackout-dates"})
@RequiredArgsConstructor
public class BlackoutDateController {

    private final BlackoutDateService blackoutDateService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<BlackoutDateDto>>> getAllBlackoutDates() {
        return ResponseEntity.ok(ApiResponse.success(blackoutDateService.getAllBlackoutDates()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BlackoutDateDto>> getBlackoutDateById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(ApiResponse.success(blackoutDateService.getBlackoutDateById(id)));
    }

    @GetMapping("/check")
    public ResponseEntity<ApiResponse<BlackoutDateDto>> checkDate(
            @RequestParam("date") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return blackoutDateService.getByDate(date)
                .map(dto -> ResponseEntity.ok(ApiResponse.success(dto)))
                .orElse(ResponseEntity.ok(ApiResponse.success("Ngày bình thường, không có phụ thu hoặc đóng cửa", null)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BlackoutDateDto>> createBlackoutDate(@Valid @RequestBody BlackoutDateDto dto) {
        BlackoutDateDto created = blackoutDateService.createBlackoutDate(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cấu hình ngày đặc biệt thành công", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BlackoutDateDto>> updateBlackoutDate(
            @PathVariable("id") UUID id,
            @Valid @RequestBody BlackoutDateDto dto) {
        BlackoutDateDto updated = blackoutDateService.updateBlackoutDate(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật ngày đặc biệt thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBlackoutDate(@PathVariable("id") UUID id) {
        blackoutDateService.deleteBlackoutDate(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa cấu hình ngày đặc biệt thành công", null));
    }
}

package com.tablemaster.restaurant.controller;

import com.tablemaster.restaurant.dto.ApiResponse;
import com.tablemaster.restaurant.dto.RestaurantProfileDto;
import com.tablemaster.restaurant.service.RestaurantProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/restaurants", "/api/v1/restaurant"})
@RequiredArgsConstructor
public class RestaurantProfileController {

    private final RestaurantProfileService profileService;

    @GetMapping({"", "/profile"})
    public ResponseEntity<ApiResponse<RestaurantProfileDto>> getProfile() {
        return ResponseEntity.ok(ApiResponse.success(profileService.getProfile()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RestaurantProfileDto>> getProfileById(@PathVariable("id") UUID id) {
        return ResponseEntity.ok(ApiResponse.success(profileService.getProfileById(id)));
    }

    @PutMapping({"", "/profile", "/{id}"})
    public ResponseEntity<ApiResponse<RestaurantProfileDto>> updateProfile(
            @PathVariable(value = "id", required = false) UUID id,
            @Valid @RequestBody RestaurantProfileDto dto) {
        RestaurantProfileDto updated = profileService.updateProfile(id, dto);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật thông tin nhà hàng thành công", updated));
    }
}

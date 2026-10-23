package com.tablemaster.auth.controller;

import com.tablemaster.auth.dto.LoyaltyAdjustRequest;
import com.tablemaster.auth.dto.LoyaltyWalletDto;
import com.tablemaster.auth.dto.UserDto;
import com.tablemaster.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AuthService authService;

    @GetMapping
    public ResponseEntity<List<UserDto>> getAllUsers(
            @RequestParam(value = "role", required = false, defaultValue = "ALL") String role,
            @RequestParam(value = "userType", required = false, defaultValue = "ALL") String userType,
            @RequestParam(value = "search", required = false) String search) {
        List<UserDto> users = authService.getAllUsersForAdmin(role, userType, search);
        return ResponseEntity.ok(users);
    }

    @PutMapping("/{id}/toggle-status")
    public ResponseEntity<UserDto> toggleUserStatus(@PathVariable("id") UUID id) {
        UserDto updated = authService.toggleUserStatus(id);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/adjust-loyalty")
    public ResponseEntity<LoyaltyWalletDto> adjustLoyalty(
            @PathVariable("id") UUID id,
            @Valid @RequestBody LoyaltyAdjustRequest request) {
        LoyaltyWalletDto wallet = authService.adjustLoyaltyPoints(id.toString(), request);
        return ResponseEntity.ok(wallet);
    }

    @PostMapping("/{id}/set-password")
    public ResponseEntity<UserDto> setPassword(
            @PathVariable("id") UUID id,
            @RequestBody Map<String, String> body) {
        String newPassword = body != null ? body.get("newPassword") : null;
        UserDto updated = authService.setPasswordForUser(id, newPassword);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/sync-guest")
    public ResponseEntity<UserDto> syncGuestBooking(@RequestBody Map<String, String> body) {
        String name = body != null ? body.get("name") : null;
        String phone = body != null ? body.get("phone") : null;
        String email = body != null ? body.get("email") : null;
        UserDto synced = authService.syncGuestBookingUser(name, phone, email);
        return ResponseEntity.ok(synced);
    }
}

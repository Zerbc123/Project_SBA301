package com.tablemaster.auth.controller;

import com.tablemaster.auth.dto.*;
import com.tablemaster.auth.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        AuthResponse response = authService.register(registerRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        AuthResponse response = authService.login(loginRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest refreshRequest) {
        AuthResponse response = authService.refreshToken(refreshRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody(required = false) LogoutRequest logoutRequest) {
        authService.logout(authHeader, logoutRequest);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String userIdStr = authentication.getPrincipal().toString();
        UserDto currentUser = authService.getCurrentUser(userIdStr);
        return ResponseEntity.ok(currentUser);
    }

    @PutMapping("/me")
    public ResponseEntity<UserDto> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String userIdStr = authentication.getPrincipal().toString();
        UserDto updatedUser = authService.updateCurrentUser(userIdStr, request);
        return ResponseEntity.ok(updatedUser);
    }

    @GetMapping("/loyalty")
    public ResponseEntity<LoyaltyWalletDto> getLoyaltyWallet() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String userIdStr = authentication.getPrincipal().toString();
        LoyaltyWalletDto wallet = authService.getLoyaltyWallet(userIdStr);
        return ResponseEntity.ok(wallet);
    }

    @PostMapping("/loyalty/adjust")
    public ResponseEntity<LoyaltyWalletDto> adjustLoyaltyPoints(@Valid @RequestBody LoyaltyAdjustRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String userIdStr = authentication.getPrincipal().toString();
        LoyaltyWalletDto wallet = authService.adjustLoyaltyPoints(userIdStr, request);
        return ResponseEntity.ok(wallet);
    }
}

package com.tablemaster.auth.controller;

import com.tablemaster.auth.dto.LoyaltyAdjustRequest;
import com.tablemaster.auth.dto.LoyaltyWalletDto;
import com.tablemaster.auth.dto.UserDto;
import com.tablemaster.auth.entity.User;
import com.tablemaster.auth.repository.UserRepository;
import com.tablemaster.auth.service.AuthService;
import com.tablemaster.auth.util.PhoneNumberUtil;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserRepository userRepository;
    private final AuthService authService;

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUserById(@PathVariable("id") String idStr) {
        UUID id = UUID.fromString(idStr);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(authService.mapToUserDto(user));
    }

    @GetMapping("/by-phone/{phone}")
    public ResponseEntity<UserDto> getUserByPhone(@PathVariable("phone") String rawPhone) {
        String normalizedPhone = PhoneNumberUtil.normalizePhoneNumber(rawPhone);
        User user = userRepository.findByPhoneNumber(normalizedPhone)
                .orElseGet(() -> userRepository.findByPhoneNumber(rawPhone)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found by phone")));
        return ResponseEntity.ok(authService.mapToUserDto(user));
    }

    @GetMapping("/by-email/{email}")
    public ResponseEntity<UserDto> getUserByEmail(@PathVariable("email") String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found by email"));
        return ResponseEntity.ok(authService.mapToUserDto(user));
    }

    @PostMapping("/{id}/loyalty/adjust")
    public ResponseEntity<LoyaltyWalletDto> adjustLoyaltyPoints(
            @PathVariable("id") String idStr,
            @Valid @RequestBody LoyaltyAdjustRequest request) {
        LoyaltyWalletDto wallet = authService.adjustLoyaltyPoints(idStr, request);
        return ResponseEntity.ok(wallet);
    }
}

package com.tablemaster.auth.service;

import com.tablemaster.auth.dto.*;
import com.tablemaster.auth.entity.RefreshToken;
import com.tablemaster.auth.entity.User;
import com.tablemaster.auth.entity.UserRole;
import com.tablemaster.auth.entity.VipTier;
import com.tablemaster.auth.repository.RefreshTokenRepository;
import com.tablemaster.auth.repository.UserRepository;
import com.tablemaster.auth.security.JwtTokenProvider;
import com.tablemaster.auth.security.RedisTokenBlacklistService;
import com.tablemaster.auth.util.PhoneNumberUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTokenBlacklistService redisTokenBlacklistService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim().toLowerCase() : "";
        String phone = request.getPhone() != null ? request.getPhone().trim() : "";
        String normalizedPhone = PhoneNumberUtil.normalizePhoneNumber(phone);

        if (userRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email đã được sử dụng");
        }

        if (userRepository.findByPhoneNumber(normalizedPhone).isPresent() || userRepository.findByPhoneNumber(phone).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }

        User newUser = User.builder()
                .fullName(request.getFullName().trim())
                .email(email)
                .phoneNumber(normalizedPhone)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(UserRole.ROLE_CUSTOMER)
                .isActive(true)
                .build();

        userRepository.save(newUser);

        String accessToken = jwtTokenProvider.generateAccessToken(
                newUser.getId().toString(),
                newUser.getRole().name(),
                newUser.getEmail()
        );

        String rawRefreshToken = jwtTokenProvider.generateRefreshTokenString();
        String tokenHash = hashToken(rawRefreshToken);
        ZonedDateTime expiresAt = ZonedDateTime.now().plusNanos(jwtTokenProvider.getRefreshTokenExpirationMs() * 1_000_000L);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(newUser)
                .tokenHash(tokenHash)
                .deviceInfo("Web/Mobile App Registration")
                .expiresAt(expiresAt)
                .isRevoked(false)
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .user(mapToUserDto(newUser))
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getIdentifier() != null ? request.getIdentifier().trim() : "";
        String password = request.getPassword();

        if (identifier.isBlank() || password == null) {
            throw new BadCredentialsException("Identifier and password must be provided");
        }

        User user = findUserByIdentifier(identifier)
                .orElseThrow(() -> new BadCredentialsException("Invalid identifier or password"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Account is disabled");
        }

        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid identifier or password");
        }

        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getId().toString(),
                user.getRole().name(),
                user.getEmail()
        );

        String rawRefreshToken = jwtTokenProvider.generateRefreshTokenString();
        String tokenHash = hashToken(rawRefreshToken);

        ZonedDateTime expiresAt = ZonedDateTime.now().plusNanos(jwtTokenProvider.getRefreshTokenExpirationMs() * 1_000_000L);

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .deviceInfo("Web/Mobile App Session")
                .expiresAt(expiresAt)
                .isRevoked(false)
                .build();

        refreshTokenRepository.save(refreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .user(mapToUserDto(user))
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(RefreshRequest request) {
        String rawRefreshToken = request.getRefreshToken();
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token is required");
        }

        String tokenHash = hashToken(rawRefreshToken);
        RefreshToken refreshTokenEntity = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid refresh token"));

        if (Boolean.TRUE.equals(refreshTokenEntity.getIsRevoked())) {
            log.warn("Attempted use of revoked refresh token for user {}", refreshTokenEntity.getUser().getId());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token is revoked");
        }

        if (refreshTokenEntity.getExpiresAt().isBefore(ZonedDateTime.now())) {
            refreshTokenEntity.setIsRevoked(true);
            refreshTokenRepository.save(refreshTokenEntity);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token has expired");
        }

        // Token Rotation: revoke current refresh token
        refreshTokenEntity.setIsRevoked(true);
        refreshTokenRepository.save(refreshTokenEntity);

        User user = refreshTokenEntity.getUser();
        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User account is disabled");
        }

        String newAccessToken = jwtTokenProvider.generateAccessToken(
                user.getId().toString(),
                user.getRole().name(),
                user.getEmail()
        );

        String newRawRefreshToken = jwtTokenProvider.generateRefreshTokenString();
        String newTokenHash = hashToken(newRawRefreshToken);

        ZonedDateTime newExpiresAt = ZonedDateTime.now().plusNanos(jwtTokenProvider.getRefreshTokenExpirationMs() * 1_000_000L);

        RefreshToken newRefreshTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(newTokenHash)
                .deviceInfo(refreshTokenEntity.getDeviceInfo())
                .expiresAt(newExpiresAt)
                .isRevoked(false)
                .build();

        refreshTokenRepository.save(newRefreshTokenEntity);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRawRefreshToken)
                .user(mapToUserDto(user))
                .build();
    }

    @Transactional
    public void logout(String authorizationHeader, LogoutRequest logoutRequest) {
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String jwt = authorizationHeader.substring(7);
            if (jwtTokenProvider.validateToken(jwt)) {
                String jti = jwtTokenProvider.getJtiFromToken(jwt);
                long remainingMs = jwtTokenProvider.getRemainingMsFromToken(jwt);
                if (jti != null && remainingMs > 0) {
                    redisTokenBlacklistService.blacklistToken(jti, remainingMs);
                }
            }
        }

        if (logoutRequest != null && logoutRequest.getRefreshToken() != null && !logoutRequest.getRefreshToken().isBlank()) {
            String tokenHash = hashToken(logoutRequest.getRefreshToken());
            refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
                token.setIsRevoked(true);
                refreshTokenRepository.save(token);
            });
        }
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser(String userIdStr) {
        UUID userId = parseUserId(userIdStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return mapToUserDto(user);
    }

    @Transactional
    public UserDto updateCurrentUser(String userIdStr, UpdateProfileRequest request) {
        UUID userId = parseUserId(userIdStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User account is disabled");
        }

        if (request.getFullName() != null) {
            String trimmedName = request.getFullName().trim();
            if (trimmedName.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ và tên không được để trống");
            }
            if (trimmedName.length() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Họ và tên không được vượt quá 100 ký tự");
            }
            user.setFullName(trimmedName);
        }

        if (request.getAvatarUrl() != null) {
            String avatar = request.getAvatarUrl().trim();
            if (!avatar.isEmpty() && !avatar.matches("^https?://\\S+$")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Avatar URL phải bắt đầu bằng http:// hoặc https://");
            }
            user.setAvatarUrl(avatar.isEmpty() ? null : avatar);
        }

        if (request.getDietaryPreferences() != null) {
            user.setDietaryPreferences(request.getDietaryPreferences().trim());
        }

        userRepository.save(user);
        log.info("Updated profile and dietary preferences for user {}", userId);

        return mapToUserDto(user);
    }

    private UUID parseUserId(String userIdStr) {
        try {
            return UUID.fromString(userIdStr);
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user identity in token");
        }
    }

    private Optional<User> findUserByIdentifier(String identifier) {
        if (PhoneNumberUtil.isEmail(identifier)) {
            return userRepository.findByEmail(identifier.trim().toLowerCase());
        }

        String normalizedPhone = PhoneNumberUtil.normalizePhoneNumber(identifier);
        Optional<User> userByPhone = userRepository.findByPhoneNumber(normalizedPhone);
        if (userByPhone.isPresent()) {
            return userByPhone;
        }

        return userRepository.findByPhoneNumber(identifier);
    }

    @Transactional(readOnly = true)
    public LoyaltyWalletDto getLoyaltyWallet(String userIdStr) {
        UUID userId = parseUserId(userIdStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        int points = user.getLoyaltyPoints() != null ? user.getLoyaltyPoints() : 0;
        VipTier tier = VipTier.fromPoints(points);

        return LoyaltyWalletDto.builder()
                .userId(user.getId())
                .loyaltyPoints(points)
                .vipTier(tier)
                .vipTierName(tier.getDisplayName())
                .pointsToNextTier(tier.getNextTierPoints(points))
                .depositDiscountPercent(tier.getDepositDiscountPercent())
                .build();
    }

    @Transactional
    public LoyaltyWalletDto adjustLoyaltyPoints(String userIdStr, LoyaltyAdjustRequest request) {
        if (request == null || request.getPointsDelta() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Yêu cầu điều chỉnh điểm không hợp lệ");
        }
        if (request.getPointsDelta() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điểm điều chỉnh phải khác 0");
        }

        UUID userId = parseUserId(userIdStr);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (Boolean.FALSE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản người dùng đã bị vô hiệu hóa");
        }

        int currentPoints = user.getLoyaltyPoints() != null ? user.getLoyaltyPoints() : 0;
        int newPoints = currentPoints + request.getPointsDelta();

        if (newPoints < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Số dư điểm tích lũy không đủ để thực hiện giao dịch (Hiện có: " + currentPoints + ", cần trừ: " + Math.abs(request.getPointsDelta()) + ")");
        }

        user.setLoyaltyPoints(newPoints);
        userRepository.save(user);

        VipTier oldTier = VipTier.fromPoints(currentPoints);
        VipTier newTier = VipTier.fromPoints(newPoints);

        log.info("Adjusted loyalty points for user {}: delta={}, oldPoints={}, newPoints={}, reason={}, refId={}",
                userId, request.getPointsDelta(), currentPoints, newPoints, request.getReason(), request.getReferenceId());

        if (oldTier != newTier) {
            log.info("User {} tier changed: {} -> {}", userId, oldTier, newTier);
        }

        return LoyaltyWalletDto.builder()
                .userId(user.getId())
                .loyaltyPoints(newPoints)
                .vipTier(newTier)
                .vipTierName(newTier.getDisplayName())
                .pointsToNextTier(newTier.getNextTierPoints(newPoints))
                .depositDiscountPercent(newTier.getDepositDiscountPercent())
                .build();
    }

    @Transactional
    public LoyaltyWalletDto adjustLoyaltyPoints(UUID userId, int pointsDelta, String reason, String referenceId) {
        return adjustLoyaltyPoints(userId.toString(), LoyaltyAdjustRequest.builder()
                .pointsDelta(pointsDelta)
                .reason(reason)
                .referenceId(referenceId)
                .build());
    }

    public UserDto mapToUserDto(User user) {
        int points = user.getLoyaltyPoints() != null ? user.getLoyaltyPoints() : 0;
        VipTier tier = VipTier.fromPoints(points);
        boolean hasPassword = user.getPasswordHash() != null && !user.getPasswordHash().trim().isEmpty();

        return UserDto.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .phone(user.getPhoneNumber())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .loyaltyPoints(points)
                .vipTier(tier)
                .vipTierName(tier.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .dietaryPreferences(user.getDietaryPreferences())
                .hasPassword(hasPassword)
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt().toString() : null)
                .build();
    }

    @Transactional(readOnly = true)
    public List<UserDto> getAllUsersForAdmin(String roleFilter, String userType, String search) {
        List<User> allUsers = userRepository.findAll();
        String q = search != null ? search.trim().toLowerCase() : "";

        return allUsers.stream()
                .filter(u -> {
                    // Filter by role
                    if (roleFilter != null && !roleFilter.equalsIgnoreCase("ALL")) {
                        if (roleFilter.equalsIgnoreCase("STAFF")) {
                            if (u.getRole() == UserRole.ROLE_CUSTOMER) return false;
                        } else if (!u.getRole().name().equalsIgnoreCase(roleFilter)) {
                            return false;
                        }
                    }
                    // Filter by userType (GUEST vs REGISTERED)
                    boolean hasPass = u.getPasswordHash() != null && !u.getPasswordHash().trim().isEmpty();
                    if (userType != null && !userType.equalsIgnoreCase("ALL")) {
                        if (userType.equalsIgnoreCase("GUEST") && hasPass) return false;
                        if (userType.equalsIgnoreCase("REGISTERED") && !hasPass) return false;
                    }
                    // Search query
                    if (!q.isEmpty()) {
                        String name = u.getFullName() != null ? u.getFullName().toLowerCase() : "";
                        String phone = u.getPhoneNumber() != null ? u.getPhoneNumber().toLowerCase() : "";
                        String email = u.getEmail() != null ? u.getEmail().toLowerCase() : "";
                        return name.contains(q) || phone.contains(q) || email.contains(q);
                    }
                    return true;
                })
                .map(this::mapToUserDto)
                .toList();
    }

    @Transactional
    public UserDto toggleUserStatus(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
        user.setIsActive(!Boolean.TRUE.equals(user.getIsActive()));
        User saved = userRepository.save(user);
        return mapToUserDto(saved);
    }

    @Transactional
    public UserDto setPasswordForUser(UUID userId, String newPassword) {
        if (newPassword == null || newPassword.trim().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mật khẩu phải có tối thiểu 6 ký tự");
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
        user.setPasswordHash(passwordEncoder.encode(newPassword.trim()));
        User saved = userRepository.save(user);
        return mapToUserDto(saved);
    }

    @Transactional
    public UserDto syncGuestBookingUser(String name, String phone, String email) {
        String normalizedPhone = PhoneNumberUtil.normalizePhoneNumber(phone);
        Optional<User> existing = userRepository.findByPhoneNumber(normalizedPhone);
        if (existing.isEmpty() && phone != null) {
            existing = userRepository.findByPhoneNumber(phone.trim());
        }

        if (existing.isPresent()) {
            User u = existing.get();
            if ((u.getEmail() == null || u.getEmail().isEmpty()) && email != null && !email.trim().isEmpty()) {
                u.setEmail(email.trim().toLowerCase());
                u = userRepository.save(u);
            }
            return mapToUserDto(u);
        }

        // Create new guest diner (passwordHash = null)
        User guest = User.builder()
                .fullName(name != null && !name.trim().isEmpty() ? name.trim() : "Khách Vãng Lai")
                .phoneNumber(normalizedPhone)
                .email(email != null && !email.trim().isEmpty() ? email.trim().toLowerCase() : null)
                .passwordHash(null)
                .role(UserRole.ROLE_CUSTOMER)
                .isActive(true)
                .loyaltyPoints(0)
                .build();
        User saved = userRepository.save(guest);
        return mapToUserDto(saved);
    }

    public static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to hash token", e);
        }
    }
}

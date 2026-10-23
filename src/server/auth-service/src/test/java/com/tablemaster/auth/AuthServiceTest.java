package com.tablemaster.auth;

import com.tablemaster.auth.dto.*;
import com.tablemaster.auth.entity.RefreshToken;
import com.tablemaster.auth.entity.User;
import com.tablemaster.auth.entity.UserRole;
import com.tablemaster.auth.entity.VipTier;
import com.tablemaster.auth.repository.RefreshTokenRepository;
import com.tablemaster.auth.repository.UserRepository;
import com.tablemaster.auth.security.JwtTokenProvider;
import com.tablemaster.auth.security.RedisTokenBlacklistService;
import com.tablemaster.auth.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.time.ZonedDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private RedisTokenBlacklistService redisTokenBlacklistService;

    @InjectMocks
    private AuthService authService;

    private User activeAdminUser;
    private User inactiveUser;
    private String rawPassword;
    private String encodedPassword;

    @BeforeEach
    void setUp() {
        rawPassword = "Admin@123";
        encodedPassword = "$2a$10$gC7kFVQNOCOoVuo0I/U3x.9Y6DYmxvNqv.4FrkulnLo1V7wyjg90a";

        activeAdminUser = User.builder()
                .id(UUID.fromString("a0000000-0000-0000-0000-000000000001"))
                .email("admin@primebistro.vn")
                .phoneNumber("+84900000001")
                .passwordHash(encodedPassword)
                .fullName("Chủ Nhà Hàng (Admin)")
                .role(UserRole.ROLE_ADMIN)
                .isActive(true)
                .build();

        inactiveUser = User.builder()
                .id(UUID.fromString("a0000000-0000-0000-0000-000000000002"))
                .email("disabled@primebistro.vn")
                .phoneNumber("+84900000002")
                .passwordHash(encodedPassword)
                .fullName("Inactive Employee")
                .role(UserRole.ROLE_WAITER)
                .isActive(false)
                .build();
    }

    @Test
    void printBcryptHash() {
        org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
        String hash = encoder.encode("Admin@123");
        System.out.println("REAL_BCRYPT_HASH: " + hash);
        assertThat(encoder.matches("Admin@123", hash)).isTrue();
    }

    @Test
    @DisplayName("Scenario 1: Correct login with email + password")
    void testCorrectLoginEmail() {
        LoginRequest request = new LoginRequest("admin@primebistro.vn", rawPassword);

        when(userRepository.findByEmail("admin@primebistro.vn")).thenReturn(Optional.of(activeAdminUser));
        when(passwordEncoder.matches(rawPassword, encodedPassword)).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("mock-access-token");
        when(jwtTokenProvider.generateRefreshTokenString()).thenReturn("mock-refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(2592000000L);

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("mock-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("mock-refresh-token");
        assertThat(response.getUser()).isNotNull();
        assertThat(response.getUser().getEmail()).isEqualTo("admin@primebistro.vn");
        assertThat(response.getUser().getRole()).isEqualTo(UserRole.ROLE_ADMIN);

        verify(refreshTokenRepository, times(1)).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Scenario 1b: Correct login with phone number + password")
    void testCorrectLoginPhone() {
        LoginRequest request = new LoginRequest("0900000001", rawPassword);

        when(userRepository.findByPhoneNumber("+84900000001")).thenReturn(Optional.of(activeAdminUser));
        when(passwordEncoder.matches(rawPassword, encodedPassword)).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("mock-access-token");
        when(jwtTokenProvider.generateRefreshTokenString()).thenReturn("mock-refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(2592000000L);

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getUser().getPhone()).isEqualTo("+84900000001");
    }

    @Test
    @DisplayName("Scenario 2: Wrong password should throw BadCredentialsException")
    void testWrongPassword() {
        LoginRequest request = new LoginRequest("admin@primebistro.vn", "WrongPassword123");

        when(userRepository.findByEmail("admin@primebistro.vn")).thenReturn(Optional.of(activeAdminUser));
        when(passwordEncoder.matches("WrongPassword123", encodedPassword)).thenReturn(false);

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid identifier or password");
    }

    @Test
    @DisplayName("Scenario 3: Unknown user should throw BadCredentialsException")
    void testUnknownUser() {
        LoginRequest request = new LoginRequest("unknown@primebistro.vn", rawPassword);

        when(userRepository.findByEmail("unknown@primebistro.vn")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid identifier or password");
    }

    @Test
    @DisplayName("Scenario 4: Inactive user should throw ResponseStatusException FORBIDDEN")
    void testInactiveUser() {
        LoginRequest request = new LoginRequest("disabled@primebistro.vn", rawPassword);

        when(userRepository.findByEmail("disabled@primebistro.vn")).thenReturn(Optional.of(inactiveUser));

        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Scenario 5 & 8: Valid refresh token rotation")
    void testValidRefreshToken() {
        RefreshRequest request = new RefreshRequest("valid-old-refresh-token");
        String oldHash = AuthService.hashToken("valid-old-refresh-token");

        RefreshToken oldTokenEntity = RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(activeAdminUser)
                .tokenHash(oldHash)
                .expiresAt(ZonedDateTime.now().plusDays(10))
                .isRevoked(false)
                .deviceInfo("Test Device")
                .build();

        when(refreshTokenRepository.findByTokenHash(oldHash)).thenReturn(Optional.of(oldTokenEntity));
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("new-access-token");
        when(jwtTokenProvider.generateRefreshTokenString()).thenReturn("new-refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(2592000000L);

        AuthResponse response = authService.refreshToken(request);

        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("new-access-token");
        assertThat(response.getRefreshToken()).isEqualTo("new-refresh-token");
        assertThat(oldTokenEntity.getIsRevoked()).isTrue();

        verify(refreshTokenRepository, times(2)).save(any(RefreshToken.class));
    }

    @Test
    @DisplayName("Scenario 9: Revoked refresh token should be rejected")
    void testRevokedRefreshToken() {
        RefreshRequest request = new RefreshRequest("revoked-refresh-token");
        String hash = AuthService.hashToken("revoked-refresh-token");

        RefreshToken revokedToken = RefreshToken.builder()
                .user(activeAdminUser)
                .tokenHash(hash)
                .expiresAt(ZonedDateTime.now().plusDays(10))
                .isRevoked(true)
                .build();

        when(refreshTokenRepository.findByTokenHash(hash)).thenReturn(Optional.of(revokedToken));

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Scenario 10 & 11: Logout revokes refresh token and blacklists access token JTI")
    void testLogout() {
        String authHeader = "Bearer mock-access-token-jwt";
        LogoutRequest logoutRequest = new LogoutRequest("refresh-token-to-logout");

        when(jwtTokenProvider.validateToken("mock-access-token-jwt")).thenReturn(true);
        when(jwtTokenProvider.getJtiFromToken("mock-access-token-jwt")).thenReturn("jti-12345");
        when(jwtTokenProvider.getRemainingMsFromToken("mock-access-token-jwt")).thenReturn(800000L);

        String refreshHash = AuthService.hashToken("refresh-token-to-logout");
        RefreshToken tokenToRevoke = RefreshToken.builder()
                .tokenHash(refreshHash)
                .isRevoked(false)
                .build();

        when(refreshTokenRepository.findByTokenHash(refreshHash)).thenReturn(Optional.of(tokenToRevoke));

        authService.logout(authHeader, logoutRequest);

        verify(redisTokenBlacklistService, times(1)).blacklistToken("jti-12345", 800000L);
        assertThat(tokenToRevoke.getIsRevoked()).isTrue();
        verify(refreshTokenRepository, times(1)).save(tokenToRevoke);
    }

    @Test
    @DisplayName("Scenario 12: Successfully update profile and dietary preferences")
    void testUpdateProfileSuccess() {
        UUID userId = activeAdminUser.getId();
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("Nguyễn Văn A (Updated)")
                .avatarUrl("https://example.com/avatar.jpg")
                .dietaryPreferences("Dị ứng tôm cua, ăn chay ngày rằm")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));
        when(userRepository.save(any(User.class))).thenReturn(activeAdminUser);

        UserDto updatedDto = authService.updateCurrentUser(userId.toString(), request);

        assertThat(updatedDto).isNotNull();
        assertThat(updatedDto.getFullName()).isEqualTo("Nguyễn Văn A (Updated)");
        assertThat(updatedDto.getAvatarUrl()).isEqualTo("https://example.com/avatar.jpg");
        assertThat(updatedDto.getDietaryPreferences()).isEqualTo("Dị ứng tôm cua, ăn chay ngày rằm");
        verify(userRepository, times(1)).save(activeAdminUser);
    }

    @Test
    @DisplayName("Scenario 13: Updating profile for disabled account should throw FORBIDDEN")
    void testUpdateProfileDisabledUser() {
        UUID userId = inactiveUser.getId();
        UpdateProfileRequest request = UpdateProfileRequest.builder()
                .fullName("New Name")
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(inactiveUser));

        assertThatThrownBy(() -> authService.updateCurrentUser(userId.toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    @DisplayName("Scenario 14: Blank full name is rejected with BAD_REQUEST")
    void testUpdateProfileBlankName() {
        UUID userId = activeAdminUser.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));

        UpdateProfileRequest request = UpdateProfileRequest.builder().fullName("   ").build();

        assertThatThrownBy(() -> authService.updateCurrentUser(userId.toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Scenario 15: Invalid avatar URL is rejected with BAD_REQUEST")
    void testUpdateProfileInvalidAvatar() {
        UUID userId = activeAdminUser.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));

        UpdateProfileRequest request = UpdateProfileRequest.builder().avatarUrl("javascript:alert(1)").build();

        assertThatThrownBy(() -> authService.updateCurrentUser(userId.toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @DisplayName("Scenario 16: Partial update keeps untouched fields and empty dietary text clears it")
    void testUpdateProfilePartial() {
        UUID userId = activeAdminUser.getId();
        activeAdminUser.setDietaryPreferences("Dị ứng đậu phộng");
        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));
        when(userRepository.save(any(User.class))).thenReturn(activeAdminUser);

        UpdateProfileRequest request = UpdateProfileRequest.builder().dietaryPreferences("").build();
        UserDto dto = authService.updateCurrentUser(userId.toString(), request);

        assertThat(dto.getFullName()).isEqualTo("Chủ Nhà Hàng (Admin)");
        assertThat(dto.getDietaryPreferences()).isEmpty();
    }

    @Test
    @DisplayName("Scenario 17: Malformed user id in token yields UNAUTHORIZED, not a 500")
    void testMalformedUserId() {
        assertThatThrownBy(() -> authService.getCurrentUser("not-a-uuid"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    @DisplayName("Scenario 18: Case-insensitive email login successfully matches lowercased registered user")
    void testCaseInsensitiveEmailLogin() {
        LoginRequest request = new LoginRequest("  ADMIN@PrimeBistro.VN  ", rawPassword);

        when(userRepository.findByEmail("admin@primebistro.vn")).thenReturn(Optional.of(activeAdminUser));
        when(passwordEncoder.matches(rawPassword, encodedPassword)).thenReturn(true);
        when(jwtTokenProvider.generateAccessToken(anyString(), anyString(), anyString())).thenReturn("mock-access-token");
        when(jwtTokenProvider.generateRefreshTokenString()).thenReturn("mock-refresh-token");
        when(jwtTokenProvider.getRefreshTokenExpirationMs()).thenReturn(2592000000L);

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getUser().getEmail()).isEqualTo("admin@primebistro.vn");
        verify(userRepository, times(1)).findByEmail("admin@primebistro.vn");
    }

    @Test
    @DisplayName("Scenario 19: VIP tier calculation across boundaries")
    void testVipTierCalculations() {
        assertThat(VipTier.fromPoints(null)).isEqualTo(VipTier.BRONZE);
        assertThat(VipTier.fromPoints(0)).isEqualTo(VipTier.BRONZE);
        assertThat(VipTier.fromPoints(499)).isEqualTo(VipTier.BRONZE);
        assertThat(VipTier.BRONZE.getNextTierPoints(499)).isEqualTo(1);
        assertThat(VipTier.BRONZE.getDepositDiscountPercent()).isEqualTo(0);

        assertThat(VipTier.fromPoints(500)).isEqualTo(VipTier.SILVER);
        assertThat(VipTier.fromPoints(999)).isEqualTo(VipTier.SILVER);
        assertThat(VipTier.SILVER.getNextTierPoints(500)).isEqualTo(500);
        assertThat(VipTier.SILVER.getDepositDiscountPercent()).isEqualTo(5);

        assertThat(VipTier.fromPoints(1000)).isEqualTo(VipTier.GOLD);
        assertThat(VipTier.fromPoints(2499)).isEqualTo(VipTier.GOLD);
        assertThat(VipTier.GOLD.getNextTierPoints(1000)).isEqualTo(1500);
        assertThat(VipTier.GOLD.getDepositDiscountPercent()).isEqualTo(10);

        assertThat(VipTier.fromPoints(2500)).isEqualTo(VipTier.DIAMOND);
        assertThat(VipTier.fromPoints(5000)).isEqualTo(VipTier.DIAMOND);
        assertThat(VipTier.DIAMOND.getNextTierPoints(2500)).isEqualTo(0);
        assertThat(VipTier.DIAMOND.getDepositDiscountPercent()).isEqualTo(15);
    }

    @Test
    @DisplayName("Scenario 20: getLoyaltyWallet returns correct wallet details and discount")
    void testGetLoyaltyWallet() {
        UUID userId = activeAdminUser.getId();
        activeAdminUser.setLoyaltyPoints(1200);

        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));

        LoyaltyWalletDto wallet = authService.getLoyaltyWallet(userId.toString());

        assertThat(wallet).isNotNull();
        assertThat(wallet.getUserId()).isEqualTo(userId);
        assertThat(wallet.getLoyaltyPoints()).isEqualTo(1200);
        assertThat(wallet.getVipTier()).isEqualTo(VipTier.GOLD);
        assertThat(wallet.getVipTierName()).isEqualTo("Vàng");
        assertThat(wallet.getDepositDiscountPercent()).isEqualTo(10);
        assertThat(wallet.getPointsToNextTier()).isEqualTo(1300);
    }

    @Test
    @DisplayName("Scenario 21: getLoyaltyWallet throws NOT_FOUND when user does not exist")
    void testGetLoyaltyWalletUserNotFound() {
        UUID userId = UUID.randomUUID();
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.getLoyaltyWallet(userId.toString()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("Scenario 22: Awarding points (+600) upgrades tier from Bronze to Silver")
    void testAdjustLoyaltyPointsUpgradeTier() {
        UUID userId = activeAdminUser.getId();
        activeAdminUser.setLoyaltyPoints(0);

        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));
        when(userRepository.save(any(User.class))).thenReturn(activeAdminUser);

        LoyaltyAdjustRequest request = LoyaltyAdjustRequest.builder()
                .pointsDelta(600)
                .reason("ORDER_EARNED")
                .referenceId("BILL-001")
                .build();

        LoyaltyWalletDto wallet = authService.adjustLoyaltyPoints(userId.toString(), request);

        assertThat(wallet).isNotNull();
        assertThat(wallet.getLoyaltyPoints()).isEqualTo(600);
        assertThat(wallet.getVipTier()).isEqualTo(VipTier.SILVER);
        assertThat(wallet.getDepositDiscountPercent()).isEqualTo(5);
        assertThat(wallet.getPointsToNextTier()).isEqualTo(400);
        assertThat(activeAdminUser.getLoyaltyPoints()).isEqualTo(600);
        verify(userRepository, times(1)).save(activeAdminUser);
    }

    @Test
    @DisplayName("Scenario 23: Deducting points (-200) degrades tier if falling below threshold")
    void testAdjustLoyaltyPointsDeduct() {
        UUID userId = activeAdminUser.getId();
        activeAdminUser.setLoyaltyPoints(600);

        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));
        when(userRepository.save(any(User.class))).thenReturn(activeAdminUser);

        LoyaltyAdjustRequest request = LoyaltyAdjustRequest.builder()
                .pointsDelta(-200)
                .reason("REDEEM_DISCOUNT")
                .build();

        LoyaltyWalletDto wallet = authService.adjustLoyaltyPoints(userId.toString(), request);

        assertThat(wallet.getLoyaltyPoints()).isEqualTo(400);
        assertThat(wallet.getVipTier()).isEqualTo(VipTier.BRONZE);
        assertThat(wallet.getDepositDiscountPercent()).isEqualTo(0);
        verify(userRepository, times(1)).save(activeAdminUser);
    }

    @Test
    @DisplayName("Scenario 24: Deducting more than current balance throws BAD_REQUEST and does not save")
    void testAdjustLoyaltyPointsInsufficientBalance() {
        UUID userId = activeAdminUser.getId();
        activeAdminUser.setLoyaltyPoints(100);

        when(userRepository.findById(userId)).thenReturn(Optional.of(activeAdminUser));

        LoyaltyAdjustRequest request = LoyaltyAdjustRequest.builder()
                .pointsDelta(-150)
                .reason("REDEEM_DISCOUNT")
                .build();

        assertThatThrownBy(() -> authService.adjustLoyaltyPoints(userId.toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Scenario 25: Zero points delta is rejected with BAD_REQUEST")
    void testAdjustLoyaltyPointsZeroDelta() {
        LoyaltyAdjustRequest request = LoyaltyAdjustRequest.builder().pointsDelta(0).build();

        assertThatThrownBy(() -> authService.adjustLoyaltyPoints(activeAdminUser.getId().toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    @DisplayName("Scenario 26: Adjusting points on disabled account throws FORBIDDEN")
    void testAdjustLoyaltyPointsDisabledAccount() {
        UUID userId = inactiveUser.getId();
        when(userRepository.findById(userId)).thenReturn(Optional.of(inactiveUser));

        LoyaltyAdjustRequest request = LoyaltyAdjustRequest.builder().pointsDelta(50).build();

        assertThatThrownBy(() -> authService.adjustLoyaltyPoints(userId.toString(), request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(e -> ((ResponseStatusException) e).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(userRepository, never()).save(any(User.class));
    }
}

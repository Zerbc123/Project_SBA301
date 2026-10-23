package com.tablemaster.auth;

import com.tablemaster.auth.security.JwtTokenProvider;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", "tablemaster_super_secret_jwt_key_for_restaurant_booking_system_2026_secure");
        ReflectionTestUtils.setField(jwtTokenProvider, "accessTokenExpirationMs", 900000L); // 15m
        ReflectionTestUtils.setField(jwtTokenProvider, "refreshTokenExpirationMs", 2592000000L); // 30d
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("Should generate valid JWT with required claims: sub, role, email, iat, exp, jti")
    void testValidJwtClaims() {
        String userId = "a0000000-0000-0000-0000-000000000001";
        String role = "ROLE_ADMIN";
        String email = "admin@primebistro.vn";

        String token = jwtTokenProvider.generateAccessToken(userId, role, email);

        assertThat(token).isNotBlank();
        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUserIdFromToken(token)).isEqualTo(userId);
        assertThat(jwtTokenProvider.getRoleFromToken(token)).isEqualTo(role);
        assertThat(jwtTokenProvider.getEmailFromToken(token)).isEqualTo(email);

        Claims claims = jwtTokenProvider.parseClaims(token);
        assertThat(claims.getSubject()).isEqualTo(userId);
        assertThat(claims.get("role")).isEqualTo(role);
        assertThat(claims.get("email")).isEqualTo(email);
        assertThat(claims.getId()).isNotNull();
        assertThat(claims.getIssuedAt()).isNotNull();
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    @Test
    @DisplayName("Should reject invalid or malformed JWT token")
    void testInvalidJwt() {
        String invalidToken = "invalid.jwt.token.string";
        assertThat(jwtTokenProvider.validateToken(invalidToken)).isFalse();
    }

    @Test
    @DisplayName("Should reject expired JWT token")
    void testExpiredJwt() {
        ReflectionTestUtils.setField(jwtTokenProvider, "accessTokenExpirationMs", -1000L); // Already expired
        String token = jwtTokenProvider.generateAccessToken("user-1", "ROLE_CUSTOMER", "user@test.com");

        assertThat(jwtTokenProvider.validateToken(token)).isFalse();
    }
}

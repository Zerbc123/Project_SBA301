package com.tablemaster.auth.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class RedisTokenBlacklistService {

    private static final String BLACKLIST_KEY_PREFIX = "blacklist:token:";
    private final StringRedisTemplate redisTemplate;

    public void blacklistToken(String jti, long ttlMillis) {
        if (jti == null || jti.isBlank()) {
            return;
        }

        if (ttlMillis <= 0) {
            log.warn("Attempted to blacklist token with TTL <= 0 ms for JTI: {}", jti);
            return;
        }

        String key = BLACKLIST_KEY_PREFIX + jti;
        try {
            redisTemplate.opsForValue().set(key, "revoked", ttlMillis, TimeUnit.MILLISECONDS);
            log.info("Blacklisted JWT JTI: {} for {} ms", jti, ttlMillis);
        } catch (Exception e) {
            log.error("Failed to blacklist JWT JTI in Redis: {}", jti, e);
        }
    }

    public boolean isTokenBlacklisted(String jti) {
        if (jti == null || jti.isBlank()) {
            return false;
        }

        String key = BLACKLIST_KEY_PREFIX + jti;
        try {
            Boolean hasKey = redisTemplate.hasKey(key);
            return Boolean.TRUE.equals(hasKey);
        } catch (Exception e) {
            log.error("Error checking Redis token blacklist for JTI: {}", jti, e);
            return false;
        }
    }
}

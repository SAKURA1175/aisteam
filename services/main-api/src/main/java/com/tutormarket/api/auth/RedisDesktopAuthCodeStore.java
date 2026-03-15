package com.tutormarket.api.auth;

import com.tutormarket.api.common.DomainException;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

@Component
@Profile("!test")
public class RedisDesktopAuthCodeStore implements DesktopAuthCodeStore {
    private static final String KEY_PREFIX = "desktop:auth:code:";

    private final StringRedisTemplate redisTemplate;

    public RedisDesktopAuthCodeStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void save(String code, String userId, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + code, userId, ttl);
        } catch (DataAccessException exception) {
            throw new DomainException(HttpStatus.SERVICE_UNAVAILABLE, "桌面登录授权码存储不可用");
        }
    }

    @Override
    public Optional<String> consume(String code) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().getAndDelete(KEY_PREFIX + code));
        } catch (DataAccessException exception) {
            throw new DomainException(HttpStatus.SERVICE_UNAVAILABLE, "桌面登录授权码校验不可用");
        }
    }
}

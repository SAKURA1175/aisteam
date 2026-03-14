package com.tutormarket.api.auth;

import com.tutormarket.api.common.DomainException;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@Profile("!test")
public class RedisWeChatLoginRateLimiter implements WeChatLoginRateLimiter {
    private static final long WINDOW_SECONDS = 60;
    private static final long QR_CONFIG_LIMIT = 20;
    private static final long EXCHANGE_LIMIT = 20;
    private static final String QR_PREFIX = "wechat:rate:qr:";
    private static final String EXCHANGE_PREFIX = "wechat:rate:exchange:";

    private final StringRedisTemplate redisTemplate;

    public RedisWeChatLoginRateLimiter(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void assertQrConfigAllowed(String clientKey) {
        assertAllowed(QR_PREFIX + normalizeClientKey(clientKey), QR_CONFIG_LIMIT);
    }

    @Override
    public void assertExchangeAllowed(String clientKey) {
        assertAllowed(EXCHANGE_PREFIX + normalizeClientKey(clientKey), EXCHANGE_LIMIT);
    }

    private void assertAllowed(String key, long limit) {
        try {
            Long current = redisTemplate.opsForValue().increment(key);
            if (current != null && current == 1L) {
                redisTemplate.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
            }
            if (current != null && current > limit) {
                throw new DomainException(HttpStatus.TOO_MANY_REQUESTS, "微信登录请求过于频繁，请稍后再试");
            }
        } catch (DataAccessException exception) {
            throw new DomainException(HttpStatus.SERVICE_UNAVAILABLE, "微信登录限流服务不可用");
        }
    }

    private String normalizeClientKey(String clientKey) {
        return clientKey == null || clientKey.isBlank() ? "unknown" : clientKey.replace(':', '_');
    }
}

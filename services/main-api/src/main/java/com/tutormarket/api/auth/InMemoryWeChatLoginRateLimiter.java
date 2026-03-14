package com.tutormarket.api.auth;

import com.tutormarket.api.common.DomainException;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Profile("test")
public class InMemoryWeChatLoginRateLimiter implements WeChatLoginRateLimiter {
    private static final long QR_CONFIG_LIMIT = 20;
    private static final long EXCHANGE_LIMIT = 20;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    @Override
    public void assertQrConfigAllowed(String clientKey) {
        assertAllowed("qr:" + normalizeClientKey(clientKey), QR_CONFIG_LIMIT);
    }

    @Override
    public void assertExchangeAllowed(String clientKey) {
        assertAllowed("exchange:" + normalizeClientKey(clientKey), EXCHANGE_LIMIT);
    }

    private synchronized void assertAllowed(String key, long limit) {
        Instant now = Instant.now();
        Counter counter = counters.get(key);
        if (counter == null || counter.expiresAt().isBefore(now)) {
            counters.put(key, new Counter(1, now.plus(WINDOW)));
            return;
        }

        long nextCount = counter.count() + 1;
        if (nextCount > limit) {
            throw new DomainException(HttpStatus.TOO_MANY_REQUESTS, "微信登录请求过于频繁，请稍后再试");
        }
        counters.put(key, new Counter(nextCount, counter.expiresAt()));
    }

    private String normalizeClientKey(String clientKey) {
        return clientKey == null || clientKey.isBlank() ? "unknown" : clientKey;
    }

    private record Counter(long count, Instant expiresAt) {
    }
}

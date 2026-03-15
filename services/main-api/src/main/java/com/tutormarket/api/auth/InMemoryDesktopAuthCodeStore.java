package com.tutormarket.api.auth;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Profile("test")
public class InMemoryDesktopAuthCodeStore implements DesktopAuthCodeStore {
    private final Map<String, Entry> codes = new ConcurrentHashMap<>();

    @Override
    public void save(String code, String userId, Duration ttl) {
        codes.put(code, new Entry(userId, Instant.now().plus(ttl)));
    }

    @Override
    public Optional<String> consume(String code) {
        Entry entry = codes.remove(code);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            return Optional.empty();
        }
        return Optional.of(entry.userId());
    }

    private record Entry(String userId, Instant expiresAt) {
    }
}

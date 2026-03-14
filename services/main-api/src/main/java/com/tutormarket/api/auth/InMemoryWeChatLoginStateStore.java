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
public class InMemoryWeChatLoginStateStore implements WeChatLoginStateStore {
    private final Map<String, Entry> states = new ConcurrentHashMap<>();

    @Override
    public void save(String state, String nextPath, Duration ttl) {
        states.put(state, new Entry(nextPath, Instant.now().plus(ttl)));
    }

    @Override
    public Optional<String> consume(String state) {
        Entry entry = states.remove(state);
        if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
            return Optional.empty();
        }
        return Optional.of(entry.nextPath());
    }

    private record Entry(String nextPath, Instant expiresAt) {
    }
}

package com.tutormarket.api.auth;

import java.time.Duration;
import java.util.Optional;

public interface WeChatLoginStateStore {

    void save(String state, String nextPath, Duration ttl);

    Optional<String> consume(String state);
}

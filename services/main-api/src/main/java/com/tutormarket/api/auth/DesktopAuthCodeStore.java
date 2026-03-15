package com.tutormarket.api.auth;

import java.time.Duration;
import java.util.Optional;

public interface DesktopAuthCodeStore {

    void save(String code, String userId, Duration ttl);

    Optional<String> consume(String code);
}

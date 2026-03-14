package com.tutormarket.api.auth;

public interface WeChatLoginRateLimiter {

    void assertQrConfigAllowed(String clientKey);

    void assertExchangeAllowed(String clientKey);
}

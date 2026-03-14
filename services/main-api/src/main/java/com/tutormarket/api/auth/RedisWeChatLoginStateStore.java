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
public class RedisWeChatLoginStateStore implements WeChatLoginStateStore {
    private static final String KEY_PREFIX = "wechat:login:state:";

    private final StringRedisTemplate redisTemplate;

    public RedisWeChatLoginStateStore(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    @Override
    public void save(String state, String nextPath, Duration ttl) {
        try {
            redisTemplate.opsForValue().set(KEY_PREFIX + state, nextPath, ttl);
        } catch (DataAccessException exception) {
            throw new DomainException(HttpStatus.SERVICE_UNAVAILABLE, "微信登录状态存储不可用");
        }
    }

    @Override
    public Optional<String> consume(String state) {
        try {
            return Optional.ofNullable(redisTemplate.opsForValue().getAndDelete(KEY_PREFIX + state));
        } catch (DataAccessException exception) {
            throw new DomainException(HttpStatus.SERVICE_UNAVAILABLE, "微信登录状态校验不可用");
        }
    }
}

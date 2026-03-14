package com.tutormarket.api.security;

import com.tutormarket.api.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtTokenService {

    private final AppProperties.JwtProperties properties;
    private final SecretKey secretKey;

    public JwtTokenService(AppProperties appProperties) {
        this.properties = appProperties.jwt();
        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(properties.secret());
        } catch (Exception exception) {
            keyBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String issueToken(UserPrincipal principal) {
        var now = Instant.now();
        var builder = Jwts.builder()
                .issuer(properties.issuer())
                .subject(principal.userId().toString())
                .claim("tenant_id", principal.tenantId().toString())
                .claim("role", principal.role().name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.expirationMinutes(), ChronoUnit.MINUTES)))
                .signWith(secretKey);
        if (principal.email() != null) {
            builder.claim("email", principal.email());
        }
        return builder.compact();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    public UUID extractTenantId(String token) {
        return UUID.fromString(parseClaims(token).get("tenant_id", String.class));
    }

    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (Exception exception) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}

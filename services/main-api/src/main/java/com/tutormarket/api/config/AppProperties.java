package com.tutormarket.api.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.util.UUID;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        @NotNull PlatformProperties platform,
        @NotNull JwtProperties jwt,
        @NotNull AiProperties ai,
        @NotNull StorageProperties storage
) {

    public record PlatformProperties(@NotNull UUID tenantId) {
    }

    public record JwtProperties(
            @NotBlank String issuer,
            @NotBlank String secret,
            int expirationMinutes
    ) {
    }

    public record AiProperties(
            @NotBlank String baseUrl,
            @NotBlank String model
    ) {
    }

    public record StorageProperties(
            @NotBlank String endpoint,
            @NotBlank String region,
            @NotBlank String accessKey,
            @NotBlank String secretKey,
            @NotBlank String bucket,
            boolean pathStyleAccessEnabled
    ) {
    }
}

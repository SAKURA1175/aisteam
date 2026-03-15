package com.tutormarket.api.auth;

import com.tutormarket.api.childprofile.ChildProfileDtos;
import com.tutormarket.api.user.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record RegisterRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(min = 8, max = 64) String password,
            @NotBlank @Size(max = 100) String displayName
    ) {
    }

    public record LoginRequest(
            @Email @NotBlank String email,
            @NotBlank String password
    ) {
    }

    public record WeChatLoginRequest(
            @NotBlank String code
    ) {
    }

    public record WeChatQrConfigResponse(
            String appId,
            String redirectUri,
            String scope,
            String state
    ) {
    }

    public record WeChatExchangeRequest(
            @NotBlank String code,
            @NotBlank String state
    ) {
    }

    public record AuthResponse(
            String accessToken,
            UserProfileResponse user
    ) {
    }

    public record WeChatAuthResponse(
            String accessToken,
            UserProfileResponse user,
            String nextPath
    ) {
    }

    public record DesktopAuthCodeResponse(
            String code,
            String expiresAt
    ) {
    }

    public record DesktopAuthExchangeRequest(
            @NotBlank String code,
            @NotBlank String platform
    ) {
    }

    public record UserProfileResponse(
            String id,
            String email,
            String displayName,
            UserRole role,
            ChildProfileDtos.ChildProfileResponse childProfile,
            String onboardingStatus
    ) {
    }
}

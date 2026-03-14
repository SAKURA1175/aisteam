package com.tutormarket.api.auth;

import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.childprofile.ChildProfileService;
import com.tutormarket.api.common.DomainException;
import com.tutormarket.api.config.AppProperties;
import com.tutormarket.api.security.JwtTokenService;
import com.tutormarket.api.security.UserPrincipal;
import com.tutormarket.api.user.UserEntity;
import com.tutormarket.api.user.UserRepository;
import com.tutormarket.api.user.UserRole;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {
    private static final String DEFAULT_NEXT_PATH = "/chat";
    private static final String WECHAT_SCOPE = "snsapi_login";

    private final UserRepository userRepository;
    private final AuthIdentityRepository authIdentityRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;
    private final AuditService auditService;
    private final AppProperties appProperties;
    private final ChildProfileService childProfileService;
    private final WeChatClient wechatClient;
    private final WeChatLoginStateStore wechatLoginStateStore;
    private final WeChatLoginRateLimiter wechatLoginRateLimiter;

    public AuthService(UserRepository userRepository,
                       AuthIdentityRepository authIdentityRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtTokenService jwtTokenService,
                       AuditService auditService,
                       AppProperties appProperties,
                       ChildProfileService childProfileService,
                       WeChatClient wechatClient,
                       WeChatLoginStateStore wechatLoginStateStore,
                       WeChatLoginRateLimiter wechatLoginRateLimiter) {
        this.userRepository = userRepository;
        this.authIdentityRepository = authIdentityRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenService = jwtTokenService;
        this.auditService = auditService;
        this.appProperties = appProperties;
        this.childProfileService = childProfileService;
        this.wechatClient = wechatClient;
        this.wechatLoginStateStore = wechatLoginStateStore;
        this.wechatLoginRateLimiter = wechatLoginRateLimiter;
    }

    public AuthDtos.WeChatQrConfigResponse wechatQrConfig(String rawNextPath, String requestId, String clientKey) {
        AppProperties.WeChatProperties wechatProperties = requireWeChatConfig();
        wechatLoginRateLimiter.assertQrConfigAllowed(clientKey);

        String state = UUID.randomUUID().toString();
        String nextPath = normalizeNextPath(rawNextPath);
        wechatLoginStateStore.save(state, nextPath, Duration.ofSeconds(wechatProperties.stateTtlSeconds()));

        auditService.record(appProperties.platform().tenantId(), null, "auth.wechat_qr_config", "wechat_login",
                null, requestId, "SUCCESS", Map.of("provider", AuthIdentityProvider.WECHAT_OPEN.name()));

        return new AuthDtos.WeChatQrConfigResponse(
                wechatProperties.openAppId(),
                wechatProperties.redirectUri(),
                WECHAT_SCOPE,
                state
        );
    }

    @Transactional
    public AuthDtos.WeChatAuthResponse exchangeWeChat(AuthDtos.WeChatExchangeRequest request,
                                                      String requestId,
                                                      String clientKey) {
        wechatLoginRateLimiter.assertExchangeAllowed(clientKey);

        String nextPath = wechatLoginStateStore.consume(request.state())
                .orElseThrow(() -> new DomainException(HttpStatus.UNAUTHORIZED, "微信登录状态已失效，请重新扫码"));

        WeChatClient.WeChatIdentity weChatIdentity = wechatClient.exchangeCode(request.code());
        String providerSubject = preferredProviderSubject(weChatIdentity);

        AuthIdentityEntity identity = authIdentityRepository
                .findByProviderAndProviderSubject(AuthIdentityProvider.WECHAT_OPEN, providerSubject)
                .or(() -> authIdentityRepository.findByProviderAndWechatOpenId(AuthIdentityProvider.WECHAT_OPEN, weChatIdentity.openId()))
                .or(() -> migrateLegacyWechatIdentity(weChatIdentity))
                .orElseGet(() -> createWeChatIdentity(weChatIdentity));

        UserEntity user = userRepository.findById(identity.getUserId())
                .orElseThrow(() -> new DomainException(HttpStatus.UNAUTHORIZED, "微信账号关联的用户不存在"));

        updateIdentitySnapshot(identity, weChatIdentity);

        var principal = user.toPrincipal(user.getTenantId());
        auditService.record(user.getTenantId(), principal, "auth.wechat_exchange", "user",
                user.getId().toString(), requestId, "SUCCESS", Map.of("provider", AuthIdentityProvider.WECHAT_OPEN.name()));

        return new AuthDtos.WeChatAuthResponse(
                jwtTokenService.issueToken(principal),
                toProfile(user),
                nextPath
        );
    }

    public AuthDtos.AuthResponse handleWeChatLogin(AuthDtos.WeChatLoginRequest request, String requestId) {
        throw new DomainException(HttpStatus.GONE, "旧版微信登录接口已下线，请使用扫码登录");
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest request, String requestId) {
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new DomainException(HttpStatus.CONFLICT, "Email already registered");
        }

        var user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setTenantId(appProperties.platform().tenantId());
        user.setEmail(request.email().trim().toLowerCase());
        user.setDisplayName(request.displayName().trim());
        user.setRole(UserRole.STUDENT);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        var principal = user.toPrincipal(user.getTenantId());
        auditService.record(user.getTenantId(), principal, "auth.register", "user",
                user.getId().toString(), requestId, "SUCCESS", Map.of("email", user.getEmail()));
        return new AuthDtos.AuthResponse(jwtTokenService.issueToken(principal), toProfile(user));
    }

    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request, String requestId) {
        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password()));
            var principal = (UserPrincipal) authentication.getPrincipal();
            auditService.record(principal.tenantId(), principal, "auth.login", "user",
                    principal.userId().toString(), requestId, "SUCCESS", Map.of("email", principal.email()));
            return new AuthDtos.AuthResponse(jwtTokenService.issueToken(principal),
                    new AuthDtos.UserProfileResponse(
                            principal.userId().toString(),
                            principal.email(),
                            principal.displayName(),
                            principal.role(),
                            childProfileService.getProfileResponse(principal.tenantId(), principal.userId()),
                            childProfileService.resolveOnboardingStatus(principal.tenantId(), principal.userId())
                    ));
        } catch (BadCredentialsException exception) {
            auditService.record(appProperties.platform().tenantId(), null, "auth.login", "user",
                    null, requestId, "FAILED", Map.of("email", request.email()));
            throw new DomainException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
    }

    public AuthDtos.UserProfileResponse currentUser(UserPrincipal principal) {
        return new AuthDtos.UserProfileResponse(
                principal.userId().toString(),
                principal.email(),
                principal.displayName(),
                principal.role(),
                childProfileService.getProfileResponse(principal.tenantId(), principal.userId()),
                childProfileService.resolveOnboardingStatus(principal.tenantId(), principal.userId())
        );
    }

    private Optional<AuthIdentityEntity> migrateLegacyWechatIdentity(WeChatClient.WeChatIdentity weChatIdentity) {
        return userRepository.findByWechatOpenId(weChatIdentity.openId())
                .map(user -> {
                    AuthIdentityEntity identity = new AuthIdentityEntity();
                    identity.setId(UUID.randomUUID());
                    identity.setUserId(user.getId());
                    identity.setProvider(AuthIdentityProvider.WECHAT_OPEN);
                    identity.setProviderSubject(preferredProviderSubject(weChatIdentity));
                    identity.setWechatOpenId(weChatIdentity.openId());
                    identity.setWechatUnionId(blankToNull(weChatIdentity.unionId()));
                    return authIdentityRepository.save(identity);
                });
    }

    private AuthIdentityEntity createWeChatIdentity(WeChatClient.WeChatIdentity weChatIdentity) {
        UserEntity user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setTenantId(appProperties.platform().tenantId());
        user.setEmail(null);
        user.setDisplayName("微信家庭用户" + shortSuffix());
        user.setRole(UserRole.STUDENT);
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        UserEntity savedUser = userRepository.save(user);

        AuthIdentityEntity identity = new AuthIdentityEntity();
        identity.setId(UUID.randomUUID());
        identity.setUserId(savedUser.getId());
        identity.setProvider(AuthIdentityProvider.WECHAT_OPEN);
        identity.setProviderSubject(preferredProviderSubject(weChatIdentity));
        identity.setWechatOpenId(weChatIdentity.openId());
        identity.setWechatUnionId(blankToNull(weChatIdentity.unionId()));
        return authIdentityRepository.save(identity);
    }

    private void updateIdentitySnapshot(AuthIdentityEntity identity, WeChatClient.WeChatIdentity weChatIdentity) {
        boolean changed = false;
        String providerSubject = preferredProviderSubject(weChatIdentity);
        if (!providerSubject.equals(identity.getProviderSubject())) {
            identity.setProviderSubject(providerSubject);
            changed = true;
        }
        if (!weChatIdentity.openId().equals(identity.getWechatOpenId())) {
            identity.setWechatOpenId(weChatIdentity.openId());
            changed = true;
        }
        String unionId = blankToNull(weChatIdentity.unionId());
        if (identity.getWechatUnionId() == null ? unionId != null : !identity.getWechatUnionId().equals(unionId)) {
            identity.setWechatUnionId(unionId);
            changed = true;
        }
        if (changed) {
            authIdentityRepository.save(identity);
        }
    }

    private AppProperties.WeChatProperties requireWeChatConfig() {
        AppProperties.WeChatProperties properties = appProperties.wechat();
        if (properties == null
                || !StringUtils.hasText(properties.openAppId())
                || !StringUtils.hasText(properties.openAppSecret())
                || !StringUtils.hasText(properties.redirectUri())) {
            throw new DomainException(HttpStatus.SERVICE_UNAVAILABLE, "微信扫码登录配置缺失");
        }
        return properties;
    }

    private String normalizeNextPath(String rawNextPath) {
        if (!StringUtils.hasText(rawNextPath)) {
            return DEFAULT_NEXT_PATH;
        }

        String nextPath = rawNextPath.trim();
        if (!nextPath.startsWith("/") || nextPath.startsWith("//") || nextPath.contains("://")) {
            return DEFAULT_NEXT_PATH;
        }
        return nextPath;
    }

    private String preferredProviderSubject(WeChatClient.WeChatIdentity weChatIdentity) {
        return StringUtils.hasText(weChatIdentity.unionId()) ? weChatIdentity.unionId() : weChatIdentity.openId();
    }

    private String blankToNull(String value) {
        return StringUtils.hasText(value) ? value : null;
    }

    private String shortSuffix() {
        return UUID.randomUUID().toString().substring(0, 6);
    }

    private AuthDtos.UserProfileResponse toProfile(UserEntity user) {
        return new AuthDtos.UserProfileResponse(
                user.getId().toString(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole(),
                childProfileService.getProfileResponse(user.getTenantId(), user.getId()),
                childProfileService.resolveOnboardingStatus(user.getTenantId(), user.getId())
        );
    }
}

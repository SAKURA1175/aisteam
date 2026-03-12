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

import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService jwtTokenService;
    private final AuditService auditService;
    private final AppProperties appProperties;
    private final ChildProfileService childProfileService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtTokenService jwtTokenService,
                       AuditService auditService,
                       AppProperties appProperties,
                       ChildProfileService childProfileService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenService = jwtTokenService;
        this.auditService = auditService;
        this.appProperties = appProperties;
        this.childProfileService = childProfileService;
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

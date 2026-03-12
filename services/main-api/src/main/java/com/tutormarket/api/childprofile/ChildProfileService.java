package com.tutormarket.api.childprofile;

import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.integration.AiDtos;
import com.tutormarket.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ChildProfileService {

    public static final String ONBOARDING_PENDING_CHILD_PROFILE = "PENDING_CHILD_PROFILE";
    public static final String ONBOARDING_READY = "READY";

    private final ChildProfileRepository childProfileRepository;
    private final AuditService auditService;

    public ChildProfileService(ChildProfileRepository childProfileRepository, AuditService auditService) {
        this.childProfileRepository = childProfileRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public ChildProfileDtos.ChildProfileStateResponse getState(UserPrincipal principal) {
        var profile = findEntity(principal.tenantId(), principal.userId()).orElse(null);
        return toState(profile);
    }

    @Transactional
    public ChildProfileDtos.ChildProfileStateResponse upsert(UserPrincipal principal,
                                                             ChildProfileDtos.UpdateChildProfileRequest request,
                                                             String requestId) {
        var profile = findEntity(principal.tenantId(), principal.userId())
                .orElseGet(() -> {
                    var entity = new ChildProfileEntity();
                    entity.setId(UUID.randomUUID());
                    entity.setTenantId(principal.tenantId());
                    entity.setUserId(principal.userId());
                    return entity;
                });
        profile.setChildName(request.childName().trim());
        profile.setAgeYears(request.ageYears());
        profile.setInterests(trimToNull(request.interests()));
        profile.setGuardianGoal(trimToNull(request.guardianGoal()));
        var saved = childProfileRepository.save(profile);
        auditService.record(principal.tenantId(), principal, "child_profile.upsert", "child_profile",
                saved.getId().toString(), requestId, "SUCCESS", request);
        return toState(saved);
    }

    @Transactional(readOnly = true)
    public ChildProfileDtos.ChildProfileResponse getProfileResponse(UUID tenantId, UUID userId) {
        return findEntity(tenantId, userId).map(this::toResponse).orElse(null);
    }

    @Transactional(readOnly = true)
    public String resolveOnboardingStatus(UUID tenantId, UUID userId) {
        return findEntity(tenantId, userId)
                .filter(this::isComplete)
                .map(entity -> ONBOARDING_READY)
                .orElse(ONBOARDING_PENDING_CHILD_PROFILE);
    }

    @Transactional(readOnly = true)
    public AiDtos.ChildProfileSnapshot getAiSnapshot(UserPrincipal principal) {
        var entity = findEntity(principal.tenantId(), principal.userId()).orElse(null);
        if (entity == null || !isComplete(entity)) {
            return null;
        }
        return new AiDtos.ChildProfileSnapshot(
                entity.getChildName(),
                entity.getAgeYears(),
                entity.getInterests(),
                entity.getGuardianGoal()
        );
    }

    private java.util.Optional<ChildProfileEntity> findEntity(UUID tenantId, UUID userId) {
        return childProfileRepository.findByTenantIdAndUserId(tenantId, userId);
    }

    private ChildProfileDtos.ChildProfileStateResponse toState(ChildProfileEntity entity) {
        var profile = entity == null ? null : toResponse(entity);
        var status = entity != null && isComplete(entity) ? ONBOARDING_READY : ONBOARDING_PENDING_CHILD_PROFILE;
        return new ChildProfileDtos.ChildProfileStateResponse(profile, status);
    }

    private ChildProfileDtos.ChildProfileResponse toResponse(ChildProfileEntity entity) {
        return new ChildProfileDtos.ChildProfileResponse(
                entity.getId().toString(),
                entity.getChildName(),
                entity.getAgeYears(),
                entity.getInterests(),
                entity.getGuardianGoal(),
                entity.getUpdatedAt()
        );
    }

    private boolean isComplete(ChildProfileEntity entity) {
        return entity.getChildName() != null && !entity.getChildName().isBlank()
                && entity.getAgeYears() != null;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

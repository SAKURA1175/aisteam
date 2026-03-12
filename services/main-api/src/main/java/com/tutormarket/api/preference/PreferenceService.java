package com.tutormarket.api.preference;

import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.security.UserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class PreferenceService {

    private final UserPreferenceRepository preferenceRepository;
    private final AuditService auditService;

    public PreferenceService(UserPreferenceRepository preferenceRepository, AuditService auditService) {
        this.preferenceRepository = preferenceRepository;
        this.auditService = auditService;
    }

    @Transactional
    public PreferenceDtos.PreferenceResponse getOrCreate(UserPrincipal principal) {
        return toResponse(loadOrCreate(principal));
    }

    @Transactional
    public PreferenceDtos.PreferenceResponse update(UserPrincipal principal,
                                                    PreferenceDtos.UpdatePreferenceRequest request,
                                                    String requestId) {
        var preference = loadOrCreate(principal);
        preference.setPreferredLanguage(request.preferredLanguage());
        preference.setResponseStyle(request.responseStyle());
        preference.setCorrectionMode(request.correctionMode());
        preferenceRepository.save(preference);
        auditService.record(principal.tenantId(), principal, "preferences.update", "user_preferences",
                preference.getId().toString(), requestId, "SUCCESS", request);
        return toResponse(preference);
    }

    private UserPreferenceEntity loadOrCreate(UserPrincipal principal) {
        return preferenceRepository.findByUserId(principal.userId())
                .orElseGet(() -> {
                    var preference = new UserPreferenceEntity();
                    preference.setId(UUID.randomUUID());
                    preference.setTenantId(principal.tenantId());
                    preference.setUserId(principal.userId());
                    preference.setPreferredLanguage("zh-CN");
                    preference.setResponseStyle("balanced");
                    preference.setCorrectionMode("strict");
                    return preferenceRepository.save(preference);
                });
    }

    private PreferenceDtos.PreferenceResponse toResponse(UserPreferenceEntity entity) {
        return new PreferenceDtos.PreferenceResponse(
                entity.getPreferredLanguage(),
                entity.getResponseStyle(),
                entity.getCorrectionMode()
        );
    }
}

package com.tutormarket.api.audit;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tutormarket.api.security.UserPrincipal;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public AuditService(AuditLogRepository auditLogRepository, ObjectMapper objectMapper) {
        this.auditLogRepository = auditLogRepository;
        this.objectMapper = objectMapper;
    }

    public void record(UUID tenantId,
                       UserPrincipal actor,
                       String action,
                       String targetType,
                       String targetId,
                       String requestId,
                       String status,
                       Object payload) {
        var entity = new AuditLogEntity();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(tenantId);
        if (actor != null) {
            entity.setActorUserId(actor.userId());
            entity.setActorRole(actor.role().name());
        }
        entity.setAction(action);
        entity.setTargetType(targetType);
        entity.setTargetId(targetId);
        entity.setRequestId(requestId);
        entity.setStatus(status);
        entity.setPayloadJson(writeJson(payload));
        auditLogRepository.save(entity);
    }

    private String writeJson(Object payload) {
        if (payload == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{\"error\":\"serialization_failed\"}";
        }
    }
}

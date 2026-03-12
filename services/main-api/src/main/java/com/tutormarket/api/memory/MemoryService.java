package com.tutormarket.api.memory;

import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.common.DomainException;
import com.tutormarket.api.security.UserPrincipal;
import com.tutormarket.api.teacher.TeacherService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class MemoryService {

    private final MemoryRecordRepository memoryRecordRepository;
    private final TeacherService teacherService;
    private final AuditService auditService;

    public MemoryService(MemoryRecordRepository memoryRecordRepository,
                         TeacherService teacherService,
                         AuditService auditService) {
        this.memoryRecordRepository = memoryRecordRepository;
        this.teacherService = teacherService;
        this.auditService = auditService;
    }

    public List<MemoryDtos.MemoryRecordResponse> listByTeacher(UUID teacherId, UserPrincipal principal) {
        teacherService.requireTeacher(teacherId);
        return memoryRecordRepository
                .findByTenantIdAndTeacherIdAndUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
                        principal.tenantId(),
                        teacherId,
                        principal.userId()
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<MemoryRecordEntity> listEntitiesByTeacher(UUID teacherId, UserPrincipal principal) {
        teacherService.requireTeacher(teacherId);
        return memoryRecordRepository.findByTenantIdAndTeacherIdAndUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(
                principal.tenantId(),
                teacherId,
                principal.userId()
        );
    }

    @Transactional
    public MemoryDtos.MemoryRecordResponse update(UUID teacherId,
                                                  UUID memoryId,
                                                  UserPrincipal principal,
                                                  MemoryDtos.UpdateMemoryRequest request,
                                                  String requestId) {
        var entity = requireOwnedMemory(memoryId, teacherId, principal);
        if ((request.content() == null || request.content().isBlank()) && request.confirmedByUser() == null) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "At least one memory field must be updated");
        }

        if (request.content() != null && !request.content().isBlank()) {
            entity.setContent(request.content().trim());
        }
        if (request.confirmedByUser() != null) {
            entity.setConfirmedByUser(request.confirmedByUser());
        }

        memoryRecordRepository.save(entity);
        auditService.record(principal.tenantId(), principal, "memory.update", "memory_record",
                memoryId.toString(), requestId, "SUCCESS", request);
        return toResponse(entity);
    }

    @Transactional
    public void delete(UUID teacherId, UUID memoryId, UserPrincipal principal, String requestId) {
        var entity = requireOwnedMemory(memoryId, teacherId, principal);
        entity.setDeletedAt(Instant.now());
        memoryRecordRepository.save(entity);
        auditService.record(principal.tenantId(), principal, "memory.delete", "memory_record",
                memoryId.toString(), requestId, "SUCCESS", null);
    }

    @Transactional
    public void upsertExtractedMemories(UUID tenantId,
                                        UUID teacherId,
                                        UUID userId,
                                        UUID conversationId,
                                        UUID sourceMessageId,
                                        List<MemoryDtos.ExtractedMemoryCandidate> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return;
        }

        for (var candidate : candidates) {
            var content = candidate.content().trim();
            if (content.isBlank()) {
                continue;
            }

            var existing = memoryRecordRepository
                    .findByTenantIdAndTeacherIdAndUserIdAndMemoryTypeAndContentAndDeletedAtIsNull(
                            tenantId,
                            teacherId,
                            userId,
                            candidate.memoryType(),
                            content
                    )
                    .orElse(null);

            if (existing != null) {
                existing.setConfidence(Math.max(existing.getConfidence(), candidate.confidence()));
                existing.setSourceConversationId(conversationId);
                existing.setSourceMessageId(sourceMessageId);
                memoryRecordRepository.save(existing);
                continue;
            }

            var entity = new MemoryRecordEntity();
            entity.setId(UUID.randomUUID());
            entity.setTenantId(tenantId);
            entity.setTeacherId(teacherId);
            entity.setUserId(userId);
            entity.setMemoryType(candidate.memoryType());
            entity.setContent(content);
            entity.setConfidence(candidate.confidence());
            entity.setSourceConversationId(conversationId);
            entity.setSourceMessageId(sourceMessageId);
            entity.setConfirmedByUser(false);
            memoryRecordRepository.save(entity);
        }
    }

    private MemoryRecordEntity requireOwnedMemory(UUID memoryId, UUID teacherId, UserPrincipal principal) {
        teacherService.requireTeacher(teacherId);
        return memoryRecordRepository.findByIdAndTenantIdAndTeacherIdAndUserIdAndDeletedAtIsNull(
                        memoryId,
                        principal.tenantId(),
                        teacherId,
                        principal.userId()
                )
                .orElseThrow(() -> new DomainException(HttpStatus.NOT_FOUND, "Memory record not found"));
    }

    private MemoryDtos.MemoryRecordResponse toResponse(MemoryRecordEntity entity) {
        return new MemoryDtos.MemoryRecordResponse(
                entity.getId().toString(),
                entity.getTeacherId().toString(),
                entity.getUserId().toString(),
                "memory",
                entity.getMemoryType(),
                entity.getContent(),
                entity.getConfidence(),
                entity.getSourceMessageId() == null ? null : entity.getSourceMessageId().toString(),
                entity.getSourceConversationId() == null ? null : entity.getSourceConversationId().toString(),
                entity.isConfirmedByUser(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}

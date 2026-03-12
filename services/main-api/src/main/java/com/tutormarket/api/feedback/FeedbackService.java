package com.tutormarket.api.feedback;

import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.security.UserPrincipal;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class FeedbackService {

    private final FeedbackEventRepository feedbackEventRepository;
    private final AuditService auditService;

    public FeedbackService(FeedbackEventRepository feedbackEventRepository, AuditService auditService) {
        this.feedbackEventRepository = feedbackEventRepository;
        this.auditService = auditService;
    }

    @Transactional
    public FeedbackDtos.FeedbackEventResponse create(UserPrincipal principal,
                                                     FeedbackDtos.CreateFeedbackEventRequest request,
                                                     String requestId) {
        var entity = new FeedbackEventEntity();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(principal.tenantId());
        entity.setUserId(principal.userId());
        entity.setTeacherId(parseUuid(request.teacherId()));
        entity.setConversationId(parseUuid(request.conversationId()));
        entity.setMessageId(parseUuid(request.messageId()));
        entity.setKind(request.kind());
        entity.setNote(trimToNull(request.note()));
        var saved = feedbackEventRepository.save(entity);
        auditService.record(principal.tenantId(), principal, "feedback.create", "feedback_event",
                saved.getId().toString(), requestId, "SUCCESS", request);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<FeedbackDtos.FeedbackEventResponse> list(UUID tenantId, String teacherId, int limit) {
        var page = PageRequest.of(0, Math.max(1, Math.min(limit, 100)));
        var teacherUuid = parseUuid(teacherId);
        var records = teacherUuid == null
                ? feedbackEventRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, page)
                : feedbackEventRepository.findByTenantIdAndTeacherIdOrderByCreatedAtDesc(tenantId, teacherUuid, page);
        return records.stream().map(this::toResponse).toList();
    }

    private FeedbackDtos.FeedbackEventResponse toResponse(FeedbackEventEntity entity) {
        return new FeedbackDtos.FeedbackEventResponse(
                entity.getId().toString(),
                entity.getUserId().toString(),
                entity.getTeacherId() == null ? null : entity.getTeacherId().toString(),
                entity.getConversationId() == null ? null : entity.getConversationId().toString(),
                entity.getMessageId() == null ? null : entity.getMessageId().toString(),
                entity.getKind(),
                entity.getNote(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return UUID.fromString(value);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        var trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}

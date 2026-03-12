package com.tutormarket.api.knowledge;

import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.common.DomainException;
import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.security.UserPrincipal;
import com.tutormarket.api.storage.ObjectStorageService;
import com.tutormarket.api.teacher.TeacherService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class KnowledgeFileService {

    private final KnowledgeFileRepository knowledgeFileRepository;
    private final UserKnowledgeStoreRepository userKnowledgeStoreRepository;
    private final TeacherService teacherService;
    private final ObjectStorageService objectStorageService;
    private final AiOrchestratorClient aiOrchestratorClient;
    private final AuditService auditService;

    public KnowledgeFileService(KnowledgeFileRepository knowledgeFileRepository,
                                UserKnowledgeStoreRepository userKnowledgeStoreRepository,
                                TeacherService teacherService,
                                ObjectStorageService objectStorageService,
                                AiOrchestratorClient aiOrchestratorClient,
                                AuditService auditService) {
        this.knowledgeFileRepository = knowledgeFileRepository;
        this.userKnowledgeStoreRepository = userKnowledgeStoreRepository;
        this.teacherService = teacherService;
        this.objectStorageService = objectStorageService;
        this.aiOrchestratorClient = aiOrchestratorClient;
        this.auditService = auditService;
    }

    @Transactional
    public KnowledgeDtos.KnowledgeFileResponse uploadTeacherPublic(UUID teacherId,
                                                                   MultipartFile file,
                                                                   UserPrincipal actor,
                                                                   String requestId) {
        return upload(teacherId, file, actor, requestId, KnowledgeFileScope.TEACHER_PUBLIC, null, "knowledge.upload_public");
    }

    @Transactional
    public KnowledgeDtos.KnowledgeFileResponse uploadUserPrivate(UUID teacherId,
                                                                 MultipartFile file,
                                                                 UserPrincipal actor,
                                                                 String requestId) {
        return upload(teacherId, file, actor, requestId, KnowledgeFileScope.USER_PRIVATE, actor.userId(), "knowledge.upload_private");
    }

    public List<KnowledgeDtos.KnowledgeFileResponse> listTeacherPublic(UUID teacherId, UserPrincipal actor) {
        teacherService.requireTeacher(teacherId);
        return knowledgeFileRepository
                .findByTenantIdAndTeacherIdAndScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
                        actor.tenantId(),
                        teacherId,
                        KnowledgeFileScope.TEACHER_PUBLIC
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public List<KnowledgeDtos.KnowledgeFileResponse> listUserPrivate(UUID teacherId, UserPrincipal actor) {
        teacherService.requireTeacher(teacherId);
        return knowledgeFileRepository
                .findByTenantIdAndTeacherIdAndUserIdAndScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
                        actor.tenantId(),
                        teacherId,
                        actor.userId(),
                        KnowledgeFileScope.USER_PRIVATE
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public KnowledgeDtos.KnowledgeFileResponse getTeacherPublicById(UUID fileId, UserPrincipal actor) {
        return toResponse(requireTeacherPublicFile(fileId, actor.tenantId()));
    }

    public KnowledgeDtos.KnowledgeFileResponse getUserPrivateById(UUID fileId, UserPrincipal actor) {
        return toResponse(requireUserPrivateFile(fileId, actor));
    }

    @Transactional
    public void deleteTeacherPublic(UUID fileId, UserPrincipal actor, String requestId) {
        delete(requireTeacherPublicFile(fileId, actor.tenantId()), actor, requestId, "knowledge.delete_public");
    }

    @Transactional
    public void deleteUserPrivate(UUID fileId, UserPrincipal actor, String requestId) {
        delete(requireUserPrivateFile(fileId, actor), actor, requestId, "knowledge.delete_private");
    }

    public Optional<String> findUserPrivateVectorStoreId(UUID tenantId, UUID teacherId, UUID userId) {
        return userKnowledgeStoreRepository.findByTenantIdAndTeacherIdAndUserId(tenantId, teacherId, userId)
                .map(UserKnowledgeStoreEntity::getOpenaiVectorStoreId);
    }

    public List<String> resolveVectorStoreIds(UUID tenantId, UUID teacherId, UUID userId, String teacherVectorStoreId) {
        var vectorStoreIds = new ArrayList<String>();
        if (teacherVectorStoreId != null && !teacherVectorStoreId.isBlank()) {
            vectorStoreIds.add(teacherVectorStoreId);
        }
        findUserPrivateVectorStoreId(tenantId, teacherId, userId)
                .filter(id -> !id.isBlank())
                .ifPresent(vectorStoreIds::add);
        return vectorStoreIds;
    }

    @Transactional
    public KnowledgeDtos.KnowledgeFileResponse retryTeacherPublic(UUID fileId, UserPrincipal actor, String requestId) {
        var entity = requireTeacherPublicFile(fileId, actor.tenantId());
        entity.setStatus(KnowledgeFileStatus.UPLOADED);
        entity.setErrorMessage(null);
        knowledgeFileRepository.save(entity);
        aiOrchestratorClient.sendKnowledgeRetry(fileId);
        auditService.record(actor.tenantId(), actor, "knowledge.retry_public", "knowledge_file",
                entity.getId().toString(), requestId, "SUCCESS", null);
        return toResponse(entity);
    }

    private KnowledgeDtos.KnowledgeFileResponse toResponse(KnowledgeFileEntity entity) {
        return new KnowledgeDtos.KnowledgeFileResponse(
                entity.getId().toString(),
                entity.getTeacherId().toString(),
                entity.getUserId() == null ? null : entity.getUserId().toString(),
                entity.getScope(),
                entity.getScope() == KnowledgeFileScope.USER_PRIVATE ? "family_private" : "teacher_knowledge",
                entity.getFileName(),
                entity.getContentType(),
                entity.getSizeBytes(),
                entity.getStatus(),
                entity.getErrorMessage(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    private KnowledgeDtos.KnowledgeFileResponse upload(UUID teacherId,
                                                       MultipartFile file,
                                                       UserPrincipal actor,
                                                       String requestId,
                                                       KnowledgeFileScope scope,
                                                       UUID ownerUserId,
                                                       String auditAction) {
        teacherService.requireTeacher(teacherId);
        if (file.isEmpty()) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "Uploaded file cannot be empty");
        }

        var entity = new KnowledgeFileEntity();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(actor.tenantId());
        entity.setTeacherId(teacherId);
        entity.setUserId(ownerUserId);
        entity.setCreatedBy(actor.userId());
        entity.setFileName(file.getOriginalFilename() == null ? "upload.bin" : file.getOriginalFilename());
        entity.setContentType(file.getContentType() == null ? "application/octet-stream" : file.getContentType());
        entity.setObjectKey(buildObjectKey(scope, teacherId, ownerUserId, entity.getId(), entity.getFileName()));
        entity.setSizeBytes(file.getSize());
        entity.setScope(scope);
        entity.setStatus(KnowledgeFileStatus.UPLOADED);
        knowledgeFileRepository.save(entity);

        objectStorageService.putObject(entity.getObjectKey(), file);
        aiOrchestratorClient.enqueueKnowledgeIngest(entity.getId());

        auditService.record(actor.tenantId(), actor, auditAction, "knowledge_file",
                entity.getId().toString(), requestId, "SUCCESS", entity.getFileName());
        return toResponse(entity);
    }

    private void delete(KnowledgeFileEntity entity, UserPrincipal actor, String requestId, String auditAction) {
        entity.setDeletedAt(Instant.now());
        knowledgeFileRepository.save(entity);
        objectStorageService.deleteObject(entity.getObjectKey());
        aiOrchestratorClient.sendKnowledgeDelete(entity.getId());
        auditService.record(actor.tenantId(), actor, auditAction, "knowledge_file",
                entity.getId().toString(), requestId, "SUCCESS", null);
    }

    private KnowledgeFileEntity requireTeacherPublicFile(UUID fileId, UUID tenantId) {
        return knowledgeFileRepository.findByIdAndTenantIdAndScopeAndDeletedAtIsNull(fileId, tenantId, KnowledgeFileScope.TEACHER_PUBLIC)
                .orElseThrow(() -> new DomainException(HttpStatus.NOT_FOUND, "Knowledge file not found"));
    }

    private KnowledgeFileEntity requireUserPrivateFile(UUID fileId, UserPrincipal actor) {
        return knowledgeFileRepository.findByIdAndTenantIdAndUserIdAndScopeAndDeletedAtIsNull(
                        fileId,
                        actor.tenantId(),
                        actor.userId(),
                        KnowledgeFileScope.USER_PRIVATE
                )
                .orElseThrow(() -> new DomainException(HttpStatus.NOT_FOUND, "Knowledge file not found"));
    }

    private String buildObjectKey(KnowledgeFileScope scope, UUID teacherId, UUID ownerUserId, UUID fileId, String fileName) {
        return switch (scope) {
            case TEACHER_PUBLIC -> "teacher/" + teacherId + "/" + fileId + "/" + fileName;
            case USER_PRIVATE -> "teacher/" + teacherId + "/user/" + ownerUserId + "/" + fileId + "/" + fileName;
        };
    }
}

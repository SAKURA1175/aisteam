package com.tutormarket.api.knowledge;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface KnowledgeFileRepository extends JpaRepository<KnowledgeFileEntity, UUID> {

    List<KnowledgeFileEntity> findByTenantIdAndTeacherIdAndScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
            UUID tenantId,
            UUID teacherId,
            KnowledgeFileScope scope
    );

    List<KnowledgeFileEntity> findByTenantIdAndTeacherIdAndUserIdAndScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
            UUID tenantId,
            UUID teacherId,
            UUID userId,
            KnowledgeFileScope scope
    );

    List<KnowledgeFileEntity> findByTenantIdAndUserIdAndScopeAndDeletedAtIsNullOrderByCreatedAtDesc(
            UUID tenantId,
            UUID userId,
            KnowledgeFileScope scope
    );

    Optional<KnowledgeFileEntity> findByIdAndTenantIdAndScopeAndDeletedAtIsNull(
            UUID id,
            UUID tenantId,
            KnowledgeFileScope scope
    );

    Optional<KnowledgeFileEntity> findByIdAndTenantIdAndUserIdAndScopeAndDeletedAtIsNull(
            UUID id,
            UUID tenantId,
            UUID userId,
            KnowledgeFileScope scope
    );
}

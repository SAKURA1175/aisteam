package com.tutormarket.api.knowledge;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserKnowledgeStoreRepository extends JpaRepository<UserKnowledgeStoreEntity, UUID> {

    Optional<UserKnowledgeStoreEntity> findByTenantIdAndTeacherIdAndUserId(UUID tenantId, UUID teacherId, UUID userId);
}

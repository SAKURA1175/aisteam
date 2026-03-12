package com.tutormarket.api.conversation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ConversationRepository extends JpaRepository<ConversationEntity, UUID> {

    List<ConversationEntity> findByTenantIdAndUserIdOrderByUpdatedAtDesc(UUID tenantId, UUID userId);

    Optional<ConversationEntity> findByIdAndTenantIdAndUserId(UUID id, UUID tenantId, UUID userId);
}

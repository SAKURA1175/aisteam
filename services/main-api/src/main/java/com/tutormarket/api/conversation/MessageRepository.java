package com.tutormarket.api.conversation;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface MessageRepository extends JpaRepository<MessageEntity, UUID> {

    List<MessageEntity> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);

    List<MessageEntity> findTop20ByConversationIdOrderByCreatedAtAsc(UUID conversationId);
}

package com.tutormarket.api.conversation;

import com.tutormarket.api.integration.AiDtos;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public final class ConversationDtos {

    private ConversationDtos() {
    }

    public record CreateConversationRequest(String title) {
    }

    public record ConversationResponse(
            String id,
            String teacherId,
            String title,
            Instant updatedAt,
            Instant lastMessageAt
    ) {
    }

    public record SendMessageRequest(@NotBlank String content) {
    }

    public record MessageResponse(
            String id,
            MessageRole role,
            String content,
            List<AiDtos.CitationItem> citations,
            String modelName,
            Instant createdAt
    ) {
    }
}

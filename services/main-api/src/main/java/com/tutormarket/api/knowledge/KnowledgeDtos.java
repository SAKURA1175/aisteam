package com.tutormarket.api.knowledge;

import java.time.Instant;

public final class KnowledgeDtos {

    private KnowledgeDtos() {
    }

    public record KnowledgeFileResponse(
            String id,
            String teacherId,
            String userId,
            KnowledgeFileScope scope,
            String sourceType,
            String fileName,
            String contentType,
            long sizeBytes,
            KnowledgeFileStatus status,
            String errorMessage,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}

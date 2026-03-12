package com.tutormarket.api.memory;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public final class MemoryDtos {

    private MemoryDtos() {
    }

    public record MemoryRecordResponse(
            String id,
            String teacherId,
            String userId,
            String sourceType,
            MemoryType memoryType,
            String content,
            double confidence,
            String sourceMessageId,
            String sourceConversationId,
            boolean confirmedByUser,
            Instant createdAt,
            Instant updatedAt
    ) {
    }

    public record UpdateMemoryRequest(
            String content,
            Boolean confirmedByUser
    ) {
    }

    public record ExtractedMemoryCandidate(
            MemoryType memoryType,
            @NotBlank String content,
            @DecimalMin("0.0") @DecimalMax("1.0") double confidence
    ) {
    }
}

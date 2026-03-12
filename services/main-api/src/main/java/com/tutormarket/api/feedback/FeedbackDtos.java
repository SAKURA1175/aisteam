package com.tutormarket.api.feedback;

import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class FeedbackDtos {

    private FeedbackDtos() {
    }

    public record CreateFeedbackEventRequest(
            String teacherId,
            String conversationId,
            String messageId,
            FeedbackKind kind,
            @Size(max = 1000) String note
    ) {
    }

    public record FeedbackEventResponse(
            String id,
            String userId,
            String teacherId,
            String conversationId,
            String messageId,
            FeedbackKind kind,
            String note,
            Instant createdAt,
            Instant updatedAt
    ) {
    }
}

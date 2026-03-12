package com.tutormarket.api.progress;

import java.time.Instant;
import java.util.List;

public final class ProgressDtos {

    private ProgressDtos() {
    }

    public record TeacherProgressResponse(
            String teacherId,
            String teacherName,
            long conversationCount,
            long memoryCount,
            long confirmedMemoryCount,
            long familyKnowledgeTotalCount,
            long familyKnowledgeReadyCount,
            Instant lastActivityAt
    ) {
    }

    public record ProgressSummaryResponse(
            long totalConversationCount,
            long totalMemoryCount,
            long totalFamilyKnowledgeCount,
            long readyFamilyKnowledgeCount,
            Instant lastActivityAt,
            List<TeacherProgressResponse> teachers
    ) {
    }
}

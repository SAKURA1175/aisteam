package com.tutormarket.api.integration;

import java.util.List;

public final class AiDtos {

    private AiDtos() {
    }

    public record ChatMessageItem(String role, String content) {
    }

    public record TeacherRuleSnapshot(String versionId, String title, String systemPrompt) {
    }

    public record MemoryRecordSnapshot(
            String id,
            String memoryType,
            String content,
            boolean confirmedByUser
    ) {
    }

    public record ChildProfileSnapshot(
            String childName,
            Integer ageYears,
            String interests,
            String guardianGoal
    ) {
    }

    public record ChatStreamRequest(
            String requestId,
            String conversationId,
            String tenantId,
            String userId,
            String teacherId,
            String teacherName,
            String teacherHeadline,
            String preferredLanguage,
            String responseStyle,
            String correctionMode,
            ChildProfileSnapshot childProfile,
            TeacherRuleSnapshot teacherRule,
            List<MemoryRecordSnapshot> memoryRecords,
            List<ChatMessageItem> messages,
            List<String> vectorStoreIds,
            String model
    ) {
    }

    public record CitationItem(
            String fileId,
            String fileName,
            String chunkRef,
            String snippet,
            String sourceType
    ) {
    }

    public record MessageEndPayload(
            String responseId,
            String content,
            String model,
            List<CitationItem> citations
    ) {
    }

    public record TokenPayload(String delta) {
    }

    public record KnowledgeCommand(String fileId, String operation) {
    }

    public record MemoryExtractRequest(
            String requestId,
            String tenantId,
            String teacherId,
            String userId,
            String conversationId,
            String sourceMessageId,
            String userMessage,
            String assistantMessage,
            String preferredLanguage,
            String responseStyle,
            String correctionMode
    ) {
    }
}

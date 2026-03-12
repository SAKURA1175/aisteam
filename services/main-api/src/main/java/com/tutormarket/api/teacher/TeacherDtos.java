package com.tutormarket.api.teacher;

import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.util.List;

public final class TeacherDtos {

    private TeacherDtos() {
    }

    public record TeacherSummaryResponse(
            String id,
            String slug,
            String name,
            String headline,
            List<String> tags
    ) {
    }

    public record TeacherDetailResponse(
            String id,
            String slug,
            String name,
            String headline,
            String description,
            List<String> tags,
            RuleVersionResponse activeRule
    ) {
    }

    public record CreateRuleVersionRequest(
            @NotBlank String title,
            @NotBlank String systemPrompt
    ) {
    }

    public record RuleVersionResponse(
            String id,
            int versionNo,
            String title,
            String systemPrompt,
            boolean active,
            Instant createdAt
    ) {
    }
}

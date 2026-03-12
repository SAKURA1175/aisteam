package com.tutormarket.api.childprofile;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class ChildProfileDtos {

    private ChildProfileDtos() {
    }

    public record ChildProfileResponse(
            String id,
            String childName,
            Integer ageYears,
            String interests,
            String guardianGoal,
            Instant updatedAt
    ) {
    }

    public record ChildProfileStateResponse(
            ChildProfileResponse childProfile,
            String onboardingStatus
    ) {
    }

    public record UpdateChildProfileRequest(
            @NotBlank @Size(max = 100) String childName,
            @Min(3) @Max(6) Integer ageYears,
            @Size(max = 255) String interests,
            @Size(max = 1000) String guardianGoal
    ) {
    }
}

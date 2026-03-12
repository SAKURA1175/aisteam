package com.tutormarket.api.preference;

import jakarta.validation.constraints.NotBlank;

public final class PreferenceDtos {

    private PreferenceDtos() {
    }

    public record PreferenceResponse(
            String preferredLanguage,
            String responseStyle,
            String correctionMode
    ) {
    }

    public record UpdatePreferenceRequest(
            @NotBlank String preferredLanguage,
            @NotBlank String responseStyle,
            @NotBlank String correctionMode
    ) {
    }
}

package com.tutormarket.api.preference;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/preferences")
public class PreferenceController {

    private final PreferenceService preferenceService;

    public PreferenceController(PreferenceService preferenceService) {
        this.preferenceService = preferenceService;
    }

    @GetMapping
    public PreferenceDtos.PreferenceResponse get(@AuthenticationPrincipal UserPrincipal principal) {
        return preferenceService.getOrCreate(principal);
    }

    @PutMapping
    public PreferenceDtos.PreferenceResponse update(@AuthenticationPrincipal UserPrincipal principal,
                                                    @Valid @RequestBody PreferenceDtos.UpdatePreferenceRequest request,
                                                    HttpServletRequest httpServletRequest) {
        return preferenceService.update(
                principal,
                request,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }
}

package com.tutormarket.api.childprofile;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class ChildProfileController {

    private final ChildProfileService childProfileService;

    public ChildProfileController(ChildProfileService childProfileService) {
        this.childProfileService = childProfileService;
    }

    @GetMapping("/child-profile")
    public ChildProfileDtos.ChildProfileStateResponse getChildProfile(@AuthenticationPrincipal UserPrincipal principal) {
        return childProfileService.getState(principal);
    }

    @PatchMapping("/child-profile")
    public ChildProfileDtos.ChildProfileStateResponse updateChildProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ChildProfileDtos.UpdateChildProfileRequest request,
            HttpServletRequest httpServletRequest
    ) {
        return childProfileService.upsert(
                principal,
                request,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }
}

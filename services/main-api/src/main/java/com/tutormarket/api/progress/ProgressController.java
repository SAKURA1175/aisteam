package com.tutormarket.api.progress;

import com.tutormarket.api.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class ProgressController {

    private final ProgressService progressService;

    public ProgressController(ProgressService progressService) {
        this.progressService = progressService;
    }

    @GetMapping("/progress-summary")
    public ProgressDtos.ProgressSummaryResponse getSummary(@AuthenticationPrincipal UserPrincipal principal) {
        return progressService.getSummary(principal);
    }
}

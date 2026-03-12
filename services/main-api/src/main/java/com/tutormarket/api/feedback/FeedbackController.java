package com.tutormarket.api.feedback;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class FeedbackController {

    private final FeedbackService feedbackService;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    @PostMapping("/feedback-events")
    public FeedbackDtos.FeedbackEventResponse create(@AuthenticationPrincipal UserPrincipal principal,
                                                     @Valid @RequestBody FeedbackDtos.CreateFeedbackEventRequest request,
                                                     HttpServletRequest httpServletRequest) {
        return feedbackService.create(
                principal,
                request,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }

    @GetMapping("/admin/feedback-events")
    public List<FeedbackDtos.FeedbackEventResponse> list(@AuthenticationPrincipal UserPrincipal principal,
                                                         @RequestParam(required = false) String teacherId,
                                                         @RequestParam(defaultValue = "50") int limit) {
        return feedbackService.list(principal.tenantId(), teacherId, limit);
    }
}

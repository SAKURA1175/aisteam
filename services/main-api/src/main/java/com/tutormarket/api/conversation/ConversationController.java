package com.tutormarket.api.conversation;

import com.tutormarket.api.common.RequestIdFilter;
import com.tutormarket.api.security.UserPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class ConversationController {

    private final ConversationService conversationService;

    public ConversationController(ConversationService conversationService) {
        this.conversationService = conversationService;
    }

    @PostMapping("/teachers/{teacherId}/conversations")
    public ConversationDtos.ConversationResponse createConversation(@PathVariable UUID teacherId,
                                                                    @RequestBody(required = false) ConversationDtos.CreateConversationRequest request,
                                                                    @AuthenticationPrincipal UserPrincipal principal,
                                                                    HttpServletRequest httpServletRequest) {
        var actualRequest = request == null ? new ConversationDtos.CreateConversationRequest(null) : request;
        return conversationService.createConversation(
                teacherId,
                actualRequest,
                principal,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }

    @GetMapping("/conversations")
    public List<ConversationDtos.ConversationResponse> listConversations(@AuthenticationPrincipal UserPrincipal principal) {
        return conversationService.listConversations(principal);
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public List<ConversationDtos.MessageResponse> listMessages(@PathVariable UUID conversationId,
                                                               @AuthenticationPrincipal UserPrincipal principal) {
        return conversationService.listMessages(conversationId, principal);
    }

    @PostMapping(path = "/conversations/{conversationId}/messages:stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamMessage(@PathVariable UUID conversationId,
                                    @Valid @RequestBody ConversationDtos.SendMessageRequest request,
                                    @AuthenticationPrincipal UserPrincipal principal,
                                    HttpServletRequest httpServletRequest) {
        return conversationService.streamMessage(
                conversationId,
                request,
                principal,
                (String) httpServletRequest.getAttribute(RequestIdFilter.REQUEST_ID_ATTRIBUTE)
        );
    }
}

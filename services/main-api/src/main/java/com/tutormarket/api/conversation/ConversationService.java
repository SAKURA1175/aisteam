package com.tutormarket.api.conversation;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tutormarket.api.audit.AuditService;
import com.tutormarket.api.childprofile.ChildProfileService;
import com.tutormarket.api.common.DomainException;
import com.tutormarket.api.integration.AiDtos;
import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.knowledge.KnowledgeFileService;
import com.tutormarket.api.memory.MemoryService;
import com.tutormarket.api.preference.PreferenceService;
import com.tutormarket.api.security.UserPrincipal;
import com.tutormarket.api.teacher.TeacherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.Disposable;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class ConversationService {

    private static final TypeReference<List<AiDtos.CitationItem>> CITATION_LIST_TYPE = new TypeReference<>() {
    };

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final TeacherService teacherService;
    private final KnowledgeFileService knowledgeFileService;
    private final MemoryService memoryService;
    private final PreferenceService preferenceService;
    private final ChildProfileService childProfileService;
    private final AiOrchestratorClient aiOrchestratorClient;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ConversationService(ConversationRepository conversationRepository,
                               MessageRepository messageRepository,
                               TeacherService teacherService,
                               KnowledgeFileService knowledgeFileService,
                               MemoryService memoryService,
                               PreferenceService preferenceService,
                               ChildProfileService childProfileService,
                               AiOrchestratorClient aiOrchestratorClient,
                               AuditService auditService,
                               ObjectMapper objectMapper) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.teacherService = teacherService;
        this.knowledgeFileService = knowledgeFileService;
        this.memoryService = memoryService;
        this.preferenceService = preferenceService;
        this.childProfileService = childProfileService;
        this.aiOrchestratorClient = aiOrchestratorClient;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ConversationDtos.ConversationResponse createConversation(UUID teacherId,
                                                                    ConversationDtos.CreateConversationRequest request,
                                                                    UserPrincipal principal,
                                                                    String requestId) {
        var teacher = teacherService.requireTeacher(teacherId);
        var conversation = new ConversationEntity();
        conversation.setId(UUID.randomUUID());
        conversation.setTenantId(principal.tenantId());
        conversation.setTeacherId(teacherId);
        conversation.setUserId(principal.userId());
        conversation.setTitle(request.title() == null || request.title().isBlank()
                ? teacher.getName() + " 对话"
                : request.title().trim());
        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);
        auditService.record(principal.tenantId(), principal, "conversation.create", "conversation",
                conversation.getId().toString(), requestId, "SUCCESS", null);
        return toConversation(conversation);
    }

    public List<ConversationDtos.ConversationResponse> listConversations(UserPrincipal principal) {
        return conversationRepository.findByTenantIdAndUserIdOrderByUpdatedAtDesc(principal.tenantId(), principal.userId())
                .stream()
                .map(this::toConversation)
                .toList();
    }

    public List<ConversationDtos.MessageResponse> listMessages(UUID conversationId, UserPrincipal principal) {
        var conversation = requireOwnedConversation(conversationId, principal);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream()
                .map(this::toMessage)
                .toList();
    }

    @Transactional
    public SseEmitter streamMessage(UUID conversationId,
                                    ConversationDtos.SendMessageRequest request,
                                    UserPrincipal principal,
                                    String requestId) {
        var conversation = requireOwnedConversation(conversationId, principal);
        var teacher = teacherService.requireTeacher(conversation.getTeacherId());
        var activeRule = teacherService.requireActiveRule(teacher.getId());
        var preference = preferenceService.getOrCreate(principal);
        var memorySnapshots = memoryService.listEntitiesByTeacher(teacher.getId(), principal).stream()
                .limit(8)
                .map(memory -> new AiDtos.MemoryRecordSnapshot(
                        memory.getId().toString(),
                        memory.getMemoryType().name(),
                        memory.getContent(),
                        memory.isConfirmedByUser()
                ))
                .toList();

        var userMessage = new MessageEntity();
        userMessage.setId(UUID.randomUUID());
        userMessage.setTenantId(principal.tenantId());
        userMessage.setConversationId(conversation.getId());
        userMessage.setTeacherId(conversation.getTeacherId());
        userMessage.setUserId(principal.userId());
        userMessage.setRole(MessageRole.USER);
        userMessage.setContent(request.content().trim());
        messageRepository.save(userMessage);

        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);

        var history = messageRepository.findTop20ByConversationIdOrderByCreatedAtAsc(conversationId);
        var vectorStoreIds = knowledgeFileService.resolveVectorStoreIds(
                principal.tenantId(),
                teacher.getId(),
                principal.userId(),
                teacher.getOpenaiVectorStoreId()
        );
        var internalRequest = new AiDtos.ChatStreamRequest(
                requestId,
                conversation.getId().toString(),
                principal.tenantId().toString(),
                principal.userId().toString(),
                teacher.getId().toString(),
                teacher.getName(),
                teacher.getHeadline(),
                preference.preferredLanguage(),
                preference.responseStyle(),
                preference.correctionMode(),
                childProfileService.getAiSnapshot(principal),
                new AiDtos.TeacherRuleSnapshot(
                        activeRule.getId().toString(),
                        activeRule.getTitle(),
                        activeRule.getSystemPrompt()
                ),
                memorySnapshots,
                history.stream()
                        .map(message -> new AiDtos.ChatMessageItem(
                                message.getRole() == MessageRole.USER ? "user" : "assistant",
                                message.getContent()))
                        .toList(),
                vectorStoreIds,
                null
        );

        var emitter = new SseEmitter(0L);
        var tokenBuffer = new StringBuilder();
        var citations = new CopyOnWriteArrayList<AiDtos.CitationItem>();
        var persisted = new AtomicBoolean(false);
        var memoryExtracted = new AtomicBoolean(false);

        Disposable subscription = aiOrchestratorClient.streamChat(internalRequest)
                .subscribe(
                        event -> handleAiEvent(event, emitter, principal, conversation, userMessage, preference,
                                tokenBuffer, citations, persisted, memoryExtracted, requestId),
                        throwable -> {
                            auditService.record(principal.tenantId(), principal, "conversation.stream", "conversation",
                                    conversationId.toString(), requestId, "FAILED", throwable.getMessage());
                            emitSafe(emitter, "error", "{\"message\":\"AI orchestration failed\"}");
                            emitter.completeWithError(throwable);
                        },
                        () -> {
                            persistAssistantMessageIfNeeded(principal, conversation, tokenBuffer.toString(), null, null,
                                    new ArrayList<>(citations), persisted);
                            extractMemoriesSafely(principal, conversation, userMessage, tokenBuffer.toString(), preference,
                                    memoryExtracted, requestId);
                            auditService.record(principal.tenantId(), principal, "conversation.stream", "conversation",
                                    conversationId.toString(), requestId, "SUCCESS", null);
                            emitter.complete();
                        }
                );

        emitter.onCompletion(subscription::dispose);
        emitter.onTimeout(() -> {
            subscription.dispose();
            emitter.complete();
        });

        return emitter;
    }

    ConversationEntity requireOwnedConversation(UUID conversationId, UserPrincipal principal) {
        return conversationRepository.findByIdAndTenantIdAndUserId(conversationId, principal.tenantId(), principal.userId())
                .orElseThrow(() -> new DomainException(HttpStatus.NOT_FOUND, "Conversation not found"));
    }

    private void handleAiEvent(ServerSentEvent<String> event,
                               SseEmitter emitter,
                               UserPrincipal principal,
                               ConversationEntity conversation,
                               MessageEntity userMessage,
                               com.tutormarket.api.preference.PreferenceDtos.PreferenceResponse preference,
                               StringBuilder tokenBuffer,
                               CopyOnWriteArrayList<AiDtos.CitationItem> citations,
                               AtomicBoolean persisted,
                               AtomicBoolean memoryExtracted,
                               String requestId) {
        var eventName = event.event() == null ? "token" : event.event();
        var data = event.data() == null ? "{}" : event.data();

        switch (eventName) {
            case "token" -> tokenBuffer.append(readTokenDelta(data));
            case "citation" -> citations.add(readCitation(data));
            case "message_end" -> {
                var payload = readMessageEnd(data);
                persistAssistantMessageIfNeeded(principal, conversation, payload.content(), payload.responseId(),
                        payload.model(), payload.citations(), persisted);
                extractMemoriesSafely(principal, conversation, userMessage, payload.content(), preference, memoryExtracted, requestId);
            }
            case "error" -> auditService.record(principal.tenantId(), principal, "conversation.stream", "conversation",
                    conversation.getId().toString(), requestId, "FAILED", data);
            default -> {
            }
        }

        emitSafe(emitter, eventName, data);
    }

    private void emitSafe(SseEmitter emitter, String eventName, String data) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data));
        } catch (IOException exception) {
            throw new DomainException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to write SSE event");
        }
    }

    private void persistAssistantMessageIfNeeded(UserPrincipal principal,
                                                 ConversationEntity conversation,
                                                 String content,
                                                 String responseId,
                                                 String model,
                                                 List<AiDtos.CitationItem> citations,
                                                 AtomicBoolean persisted) {
        if (!persisted.compareAndSet(false, true) || content == null || content.isBlank()) {
            return;
        }

        var assistantMessage = new MessageEntity();
        assistantMessage.setId(UUID.randomUUID());
        assistantMessage.setTenantId(principal.tenantId());
        assistantMessage.setConversationId(conversation.getId());
        assistantMessage.setTeacherId(conversation.getTeacherId());
        assistantMessage.setUserId(principal.userId());
        assistantMessage.setRole(MessageRole.ASSISTANT);
        assistantMessage.setContent(content);
        assistantMessage.setOpenaiResponseId(responseId);
        assistantMessage.setModelName(model);
        assistantMessage.setCitationsJson(writeJson(citations));
        messageRepository.save(assistantMessage);

        conversation.setLastMessageAt(Instant.now());
        conversationRepository.save(conversation);
    }

    private void extractMemoriesSafely(UserPrincipal principal,
                                       ConversationEntity conversation,
                                       MessageEntity userMessage,
                                       String assistantContent,
                                       com.tutormarket.api.preference.PreferenceDtos.PreferenceResponse preference,
                                       AtomicBoolean memoryExtracted,
                                       String requestId) {
        if (userMessage == null || assistantContent == null || assistantContent.isBlank()
                || !memoryExtracted.compareAndSet(false, true)) {
            return;
        }

        var actualPreference = preference != null ? preference : preferenceService.getOrCreate(principal);
        try {
            var candidates = aiOrchestratorClient.extractMemories(new AiDtos.MemoryExtractRequest(
                    requestId,
                    principal.tenantId().toString(),
                    conversation.getTeacherId().toString(),
                    principal.userId().toString(),
                    conversation.getId().toString(),
                    userMessage.getId().toString(),
                    userMessage.getContent(),
                    assistantContent,
                    actualPreference.preferredLanguage(),
                    actualPreference.responseStyle(),
                    actualPreference.correctionMode()
            ));
            memoryService.upsertExtractedMemories(
                    principal.tenantId(),
                    conversation.getTeacherId(),
                    principal.userId(),
                    conversation.getId(),
                    userMessage.getId(),
                    candidates
            );
        } catch (Exception exception) {
            auditService.record(principal.tenantId(), principal, "memory.extract", "conversation",
                    conversation.getId().toString(), requestId, "FAILED", exception.getMessage());
        }
    }

    private String readTokenDelta(String data) {
        try {
            return objectMapper.readValue(data, AiDtos.TokenPayload.class).delta();
        } catch (JsonProcessingException exception) {
            return "";
        }
    }

    private AiDtos.CitationItem readCitation(String data) {
        try {
            return objectMapper.readValue(data, AiDtos.CitationItem.class);
        } catch (JsonProcessingException exception) {
            return new AiDtos.CitationItem("unknown", "unknown", "unknown", "", "teacher_knowledge");
        }
    }

    private AiDtos.MessageEndPayload readMessageEnd(String data) {
        try {
            return objectMapper.readValue(data, AiDtos.MessageEndPayload.class);
        } catch (JsonProcessingException exception) {
            return new AiDtos.MessageEndPayload(null, data, null, List.of());
        }
    }

    private ConversationDtos.ConversationResponse toConversation(ConversationEntity entity) {
        return new ConversationDtos.ConversationResponse(
                entity.getId().toString(),
                entity.getTeacherId().toString(),
                entity.getTitle(),
                entity.getUpdatedAt(),
                entity.getLastMessageAt()
        );
    }

    private ConversationDtos.MessageResponse toMessage(MessageEntity entity) {
        return new ConversationDtos.MessageResponse(
                entity.getId().toString(),
                entity.getRole(),
                entity.getContent(),
                readCitations(entity.getCitationsJson()),
                entity.getModelName(),
                entity.getCreatedAt()
        );
    }

    private List<AiDtos.CitationItem> readCitations(String json) {
        if (json == null || json.isBlank()) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, CITATION_LIST_TYPE);
        } catch (JsonProcessingException exception) {
            return List.of();
        }
    }

    private String writeJson(List<AiDtos.CitationItem> citations) {
        if (citations == null || citations.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(citations);
        } catch (JsonProcessingException exception) {
            return null;
        }
    }
}

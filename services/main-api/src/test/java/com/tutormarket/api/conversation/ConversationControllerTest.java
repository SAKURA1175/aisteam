package com.tutormarket.api.conversation;

import com.fasterxml.jackson.databind.JsonNode;
import com.tutormarket.api.integration.AiDtos;
import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.knowledge.UserKnowledgeStoreEntity;
import com.tutormarket.api.knowledge.UserKnowledgeStoreRepository;
import com.tutormarket.api.memory.MemoryDtos;
import com.tutormarket.api.memory.MemoryService;
import com.tutormarket.api.memory.MemoryType;
import com.tutormarket.api.storage.ObjectStorageService;
import com.tutormarket.api.support.IntegrationTestSupport;
import com.tutormarket.api.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ConversationControllerTest extends IntegrationTestSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserKnowledgeStoreRepository userKnowledgeStoreRepository;

    @Autowired
    private MemoryService memoryService;

    @MockBean
    private AiOrchestratorClient aiOrchestratorClient;

    @MockBean
    private ObjectStorageService objectStorageService;

    @Test
    void conversationIsolationShouldPreventCrossUserRead() throws Exception {
        String tokenA = registerAndLogin("user-a@example.com", "Password123!", "User A");
        String tokenB = registerAndLogin("user-b@example.com", "Password123!", "User B");
        String teacherId = firstTeacherId();

        String conversationId = createConversation(tokenA, teacherId);

        mockMvc.perform(get("/api/v1/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void streamingMessageShouldPersistAssistantReply() throws Exception {
        String token = registerAndLogin("streamer@example.com", "Password123!", "Streamer");
        String teacherId = firstTeacherId();
        var user = userRepository.findByEmailIgnoreCase("streamer@example.com").orElseThrow();
        var knowledgeStore = new UserKnowledgeStoreEntity();
        knowledgeStore.setId(UUID.randomUUID());
        knowledgeStore.setTenantId(user.getTenantId());
        knowledgeStore.setTeacherId(UUID.fromString(teacherId));
        knowledgeStore.setUserId(user.getId());
        knowledgeStore.setOpenaiVectorStoreId("vs_user_private_123");
        userKnowledgeStoreRepository.save(knowledgeStore);
        memoryService.upsertExtractedMemories(
                user.getTenantId(),
                UUID.fromString(teacherId),
                user.getId(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                List.of(new MemoryDtos.ExtractedMemoryCandidate(MemoryType.GOAL, "用户当前目标：准备 Java 后端面试", 0.91))
        );
        String conversationId = createConversation(token, teacherId);

        when(aiOrchestratorClient.streamChat(ArgumentMatchers.any()))
                .thenReturn(Flux.just(
                        ServerSentEvent.<String>builder("{\"conversationId\":\"%s\"}".formatted(conversationId))
                                .event("message_start")
                                .build(),
                        ServerSentEvent.<String>builder("{\"delta\":\"hello \"}")
                                .event("token")
                                .build(),
                        ServerSentEvent.<String>builder("""
                                {
                                  "responseId": "resp_test",
                                  "content": "hello world",
                                  "model": "gpt-4.1-mini",
                                  "citations": []
                                }
                                """)
                                .event("message_end")
                                .build()
                ));
        when(aiOrchestratorClient.extractMemories(ArgumentMatchers.any())).thenReturn(List.of());

        var mvcResult = mockMvc.perform(post("/api/v1/conversations/{conversationId}/messages:stream", conversationId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "content": "你好，帮我模拟一道面试题"
                                }
                                """))
                .andExpect(request().asyncStarted())
                .andReturn();

        mockMvc.perform(asyncDispatch(mvcResult))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("event:token")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("event:message_end")));

        mockMvc.perform(get("/api/v1/conversations/{conversationId}/messages", conversationId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].role").value("USER"))
                .andExpect(jsonPath("$[1].role").value("ASSISTANT"))
                .andExpect(jsonPath("$[1].content").value("hello world"));

        var requestCaptor = ArgumentCaptor.forClass(AiDtos.ChatStreamRequest.class);
        verify(aiOrchestratorClient).streamChat(requestCaptor.capture());
        assertThat(requestCaptor.getValue().vectorStoreIds()).contains("vs_user_private_123");
        assertThat(requestCaptor.getValue().memoryRecords()).isNotEmpty();
    }

    private String firstTeacherId() throws Exception {
        var result = mockMvc.perform(get("/api/v1/teachers"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get(0).get("id").asText();
    }

    private String createConversation(String token, String teacherId) throws Exception {
        var result = mockMvc.perform(post("/api/v1/teachers/{teacherId}/conversations", teacherId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get("id").asText();
    }
}

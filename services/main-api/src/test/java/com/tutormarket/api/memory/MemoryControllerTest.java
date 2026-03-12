package com.tutormarket.api.memory;

import com.fasterxml.jackson.databind.JsonNode;
import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.storage.ObjectStorageService;
import com.tutormarket.api.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MemoryControllerTest extends IntegrationTestSupport {

    @Autowired
    private MemoryService memoryService;

    @MockBean
    private AiOrchestratorClient aiOrchestratorClient;

    @MockBean
    private ObjectStorageService objectStorageService;

    @Test
    void memoryRecordsShouldBeIsolatedByTeacherAndUser() throws Exception {
        String tokenA = registerAndLogin("memory-a@example.com", "Password123!", "Memory A");
        String tokenB = registerAndLogin("memory-b@example.com", "Password123!", "Memory B");
        String teacherId = firstTeacherId();
        var principalA = principalFor("memory-a@example.com");

        memoryService.upsertExtractedMemories(
                principalA.tenantId(),
                UUID.fromString(teacherId),
                principalA.userId(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                List.of(new MemoryDtos.ExtractedMemoryCandidate(MemoryType.GOAL, "用户当前目标：拿下 Java offer", 0.9))
        );

        var listResult = mockMvc.perform(get("/api/v1/teachers/{teacherId}/memory-records", teacherId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andReturn();

        String memoryId = objectMapper.readTree(listResult.getResponse().getContentAsString()).get(0).get("id").asText();

        mockMvc.perform(get("/api/v1/teachers/{teacherId}/memory-records", teacherId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(patch("/api/v1/teachers/{teacherId}/memory-records/{memoryId}", teacherId, memoryId)
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType("application/json")
                        .content("""
                                {
                                  "confirmedByUser": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.confirmedByUser").value(true));

        mockMvc.perform(delete("/api/v1/teachers/{teacherId}/memory-records/{memoryId}", teacherId, memoryId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    private String firstTeacherId() throws Exception {
        var result = mockMvc.perform(get("/api/v1/teachers"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get(0).get("id").asText();
    }
}

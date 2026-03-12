package com.tutormarket.api.knowledge;

import com.fasterxml.jackson.databind.JsonNode;
import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.storage.ObjectStorageService;
import com.tutormarket.api.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class KnowledgeFileControllerTest extends IntegrationTestSupport {

    @MockBean
    private AiOrchestratorClient aiOrchestratorClient;

    @MockBean
    private ObjectStorageService objectStorageService;

    @Test
    void studentPrivateKnowledgeFilesShouldBeIsolatedByTeacherAndUser() throws Exception {
        String tokenA = registerAndLogin("knowledge-a@example.com", "Password123!", "Knowledge A");
        String tokenB = registerAndLogin("knowledge-b@example.com", "Password123!", "Knowledge B");
        String teacherId = firstTeacherId();

        var upload = mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/teachers/{teacherId}/knowledge-files", teacherId)
                        .file(new MockMultipartFile("file", "resume-a.txt", "text/plain", "candidate notes".getBytes()))
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.scope").value("USER_PRIVATE"))
                .andExpect(jsonPath("$.userId").isNotEmpty())
                .andReturn();

        String fileId = objectMapper.readTree(upload.getResponse().getContentAsString()).get("id").asText();

        verify(aiOrchestratorClient).enqueueKnowledgeIngest(java.util.UUID.fromString(fileId));

        mockMvc.perform(get("/api/v1/teachers/{teacherId}/knowledge-files", teacherId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(fileId));

        mockMvc.perform(get("/api/v1/teachers/{teacherId}/knowledge-files", teacherId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/api/v1/knowledge-files/{fileId}", fileId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminKnowledgeUploadShouldRemainTeacherPublic() throws Exception {
        String adminToken = login("admin@tutormarket.ai", "Admin123!");
        String teacherId = firstTeacherId();

        mockMvc.perform(MockMvcRequestBuilders.multipart("/api/v1/admin/teachers/{teacherId}/knowledge-files", teacherId)
                        .file(new MockMultipartFile("file", "teacher-guide.txt", "text/plain", "guide".getBytes()))
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.scope").value("TEACHER_PUBLIC"))
                .andExpect(jsonPath("$.userId").doesNotExist());
    }

    private String firstTeacherId() throws Exception {
        var result = mockMvc.perform(get("/api/v1/teachers"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return body.get(0).get("id").asText();
    }
}

package com.tutormarket.api.auth;

import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.storage.ObjectStorageService;
import com.tutormarket.api.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest extends IntegrationTestSupport {

    @MockBean
    private AiOrchestratorClient aiOrchestratorClient;

    @MockBean
    private ObjectStorageService objectStorageService;

    @Test
    void registerAndLoginShouldReturnToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "fresh@example.com",
                                  "password": "Password123!",
                                  "displayName": "Fresh User"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.role").value("STUDENT"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "fresh@example.com",
                                  "password": "Password123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("fresh@example.com"));
    }

    @Test
    void studentCannotAccessAdminKnowledgeUpload() throws Exception {
        String token = registerAndLogin("student-test@example.com", "Password123!", "Student Test");

        mockMvc.perform(post("/api/v1/admin/teachers/11111111-1111-1111-1111-111111111111/knowledge-files")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void teacherMarketplaceEndpointsShouldBePublic() throws Exception {
        mockMvc.perform(get("/api/v1/teachers"))
                .andExpect(status().isOk());
    }
}

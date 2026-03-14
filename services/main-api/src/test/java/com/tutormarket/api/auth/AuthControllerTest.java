package com.tutormarket.api.auth;

import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.storage.ObjectStorageService;
import com.tutormarket.api.support.IntegrationTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.nullValue;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest extends IntegrationTestSupport {

    @Autowired
    private AuthIdentityRepository authIdentityRepository;

    @MockBean
    private AiOrchestratorClient aiOrchestratorClient;

    @MockBean
    private ObjectStorageService objectStorageService;

    @MockBean
    private WeChatClient weChatClient;

    @BeforeEach
    void setUp() {
        when(weChatClient.exchangeCode(anyString()))
                .thenReturn(new WeChatClient.WeChatIdentity("wechat-open-1", "wechat-union-1"));
    }

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

    @Test
    void wechatQrConfigAndExchangeShouldCreateAndReuseAccount() throws Exception {
        MvcResult configResult = mockMvc.perform(get("/api/v1/auth/wechat/qr-config")
                        .param("next", "/chat/library"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appId").value("test-app-id"))
                .andExpect(jsonPath("$.redirectUri").value("http://127.0.0.1:3000/login/wechat/callback"))
                .andExpect(jsonPath("$.scope").value("snsapi_login"))
                .andExpect(jsonPath("$.state").isNotEmpty())
                .andReturn();

        String firstState = objectMapper.readTree(configResult.getResponse().getContentAsString()).get("state").asText();

        MvcResult firstExchange = mockMvc.perform(post("/api/v1/auth/wechat/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "wechat-good-code",
                                  "state": "%s"
                                }
                                """.formatted(firstState)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(nullValue()))
                .andExpect(jsonPath("$.nextPath").value("/chat/library"))
                .andReturn();

        String firstUserId = objectMapper.readTree(firstExchange.getResponse().getContentAsString()).get("user").get("id").asText();

        MvcResult secondConfig = mockMvc.perform(get("/api/v1/auth/wechat/qr-config")
                        .param("next", "/chat"))
                .andExpect(status().isOk())
                .andReturn();
        String secondState = objectMapper.readTree(secondConfig.getResponse().getContentAsString()).get("state").asText();

        mockMvc.perform(post("/api/v1/auth/wechat/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "wechat-good-code",
                                  "state": "%s"
                                }
                                """.formatted(secondState)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(firstUserId))
                .andExpect(jsonPath("$.nextPath").value("/chat"));
    }

    @Test
    void wechatExchangeShouldRejectInvalidState() throws Exception {
        mockMvc.perform(post("/api/v1/auth/wechat/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "wechat-good-code",
                                  "state": "expired-state"
                                }
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("微信登录状态已失效，请重新扫码"));
    }

    @Test
    void wechatExchangeShouldBackfillLegacyWechatUser() throws Exception {
        var legacyUser = userRepository.findByEmailIgnoreCase("admin@tutormarket.ai").orElseThrow();
        legacyUser.setWechatOpenId("legacy-open-id");
        userRepository.save(legacyUser);

        when(weChatClient.exchangeCode("legacy-code"))
                .thenReturn(new WeChatClient.WeChatIdentity("legacy-open-id", ""));

        MvcResult configResult = mockMvc.perform(get("/api/v1/auth/wechat/qr-config"))
                .andExpect(status().isOk())
                .andReturn();
        String state = objectMapper.readTree(configResult.getResponse().getContentAsString()).get("state").asText();

        mockMvc.perform(post("/api/v1/auth/wechat/exchange")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "legacy-code",
                                  "state": "%s"
                                }
                                """.formatted(state)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(legacyUser.getId().toString()));

        org.assertj.core.api.Assertions.assertThat(
                authIdentityRepository.findByProviderAndWechatOpenId(AuthIdentityProvider.WECHAT_OPEN, "legacy-open-id")
        ).isPresent();
    }
}

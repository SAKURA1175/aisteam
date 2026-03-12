package com.tutormarket.api.teacher;

import com.fasterxml.jackson.databind.JsonNode;
import com.tutormarket.api.integration.AiOrchestratorClient;
import com.tutormarket.api.storage.ObjectStorageService;
import com.tutormarket.api.support.IntegrationTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TeacherControllerTest extends IntegrationTestSupport {

    @MockBean
    private AiOrchestratorClient aiOrchestratorClient;

    @MockBean
    private ObjectStorageService objectStorageService;

    @Test
    void seededTeachersShouldMatchEggshellCompanionProfiles() throws Exception {
        var result = mockMvc.perform(get("/api/v1/teachers"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        var slugs = StreamSupport.stream(body.spliterator(), false)
                .map(node -> node.get("slug").asText())
                .toList();
        var names = StreamSupport.stream(body.spliterator(), false)
                .map(node -> node.get("name").asText())
                .toList();

        assertThat(slugs).containsExactly("luna-rabbit", "benny-bear", "mimi-cat");
        assertThat(names).containsExactly("小兔老师 Luna", "小熊老师 Benny", "小猫老师 Mimi");

        String lunaId = StreamSupport.stream(body.spliterator(), false)
                .filter(node -> "luna-rabbit".equals(node.get("slug").asText()))
                .findFirst()
                .orElseThrow()
                .get("id")
                .asText();

        var detailResult = mockMvc.perform(get("/api/v1/teachers/{teacherId}", lunaId))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode detail = objectMapper.readTree(detailResult.getResponse().getContentAsString());
        assertThat(detail.get("headline").asText()).isEqualTo("中文启蒙陪伴师");
        assertThat(detail.get("description").asText()).contains("儿歌");
        assertThat(detail.get("activeRule").get("systemPrompt").asText()).contains("Eggshell Companion");
    }
}

package com.tutormarket.api.integration;

import com.tutormarket.api.common.DomainException;
import com.tutormarket.api.memory.MemoryDtos;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.UUID;

@Component
public class AiOrchestratorClient {

    private static final ParameterizedTypeReference<ServerSentEvent<String>> SSE_TYPE =
            new ParameterizedTypeReference<>() {
            };

    private final WebClient aiWebClient;

    public AiOrchestratorClient(WebClient aiWebClient) {
        this.aiWebClient = aiWebClient;
    }

    public Flux<ServerSentEvent<String>> streamChat(AiDtos.ChatStreamRequest request) {
        return aiWebClient.post()
                .uri("/internal/chat/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.TEXT_EVENT_STREAM)
                .header("X-Request-Id", request.requestId())
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .map(body -> new DomainException(HttpStatus.valueOf(response.statusCode().value()), body)))
                .bodyToFlux(SSE_TYPE);
    }

    public void enqueueKnowledgeIngest(UUID fileId) {
        sendKnowledgeCommand(fileId, "INGEST");
    }

    public void sendKnowledgeRetry(UUID fileId) {
        sendKnowledgeCommand(fileId, "RETRY");
    }

    public void sendKnowledgeDelete(UUID fileId) {
        sendKnowledgeCommand(fileId, "DELETE");
    }

    public List<MemoryDtos.ExtractedMemoryCandidate> extractMemories(AiDtos.MemoryExtractRequest request) {
        return aiWebClient.post()
                .uri("/internal/memory/extract")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .header("X-Request-Id", request.requestId())
                .bodyValue(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                        .map(body -> new DomainException(HttpStatus.valueOf(response.statusCode().value()), body)))
                .bodyToMono(new ParameterizedTypeReference<List<MemoryDtos.ExtractedMemoryCandidate>>() {
                })
                .blockOptional()
                .orElse(List.of());
    }

    private void sendKnowledgeCommand(UUID fileId, String operation) {
        aiWebClient.post()
                .uri(operation.equals("INGEST") ? "/internal/knowledge/ingest" : "/internal/knowledge/retry")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new AiDtos.KnowledgeCommand(fileId.toString(), operation))
                .retrieve()
                .toBodilessEntity()
                .block();
    }
}

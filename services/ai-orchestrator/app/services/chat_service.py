from __future__ import annotations

import json
import logging
from typing import Any, AsyncIterator

from fastapi import HTTPException

from app.core.config import get_settings
from app.core.request_context import request_id_context
from app.models.schemas import ChatStreamRequest, CitationItem, MessageEndPayload
from app.services.db import resolve_citation_metadata
from app.services.openai_client_factory import create_async_openai_client

logger = logging.getLogger(__name__)
settings = get_settings()


def _sse(event: str, payload: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _build_instructions(request: ChatStreamRequest) -> str:
    memory_block = ""
    if request.memory_records:
        memory_lines = "\n".join(
            f"- [{memory.memory_type}] {memory.content}" for memory in request.memory_records
        )
        memory_block = f"\n\nRelevant long-term memory for this student under this teacher:\n{memory_lines}"

    return (
        f"Teacher: {request.teacher_name} ({request.teacher_headline})\n"
        f"Language preference: {request.preferred_language}\n"
        f"Response style: {request.response_style}\n"
        f"Correction mode: {request.correction_mode}\n\n"
        f"Teacher system prompt:\n{request.teacher_rule.system_prompt}"
        f"{memory_block}"
    )


def _build_input(request: ChatStreamRequest) -> str:
    transcript = "\n".join(f"{item.role.upper()}: {item.content}" for item in request.messages)
    return (
        "You are continuing a tutoring conversation. Use the transcript below as context.\n"
        "If file_search is available, ground your answer in the available teacher and student knowledge bases and cite them when relevant.\n\n"
        f"{transcript}"
    )


def _chunk_text(text: str) -> list[str]:
    if not text:
        return []
    tokens = text.replace("\n", " \n ").split(" ")
    return [token for token in tokens if token != ""]


def _extract_citations(response_dict: dict[str, Any]) -> list[CitationItem]:
    citations: list[CitationItem] = []
    for output in response_dict.get("output", []) or []:
        if output.get("type") != "message":
            continue
        for content in output.get("content", []) or []:
            annotations = content.get("annotations", []) or []
            for annotation in annotations:
                if annotation.get("type") != "file_citation":
                    continue
                file_citation = annotation.get("file_citation", {}) or {}
                file_id = file_citation.get("file_id") or "unknown"
                metadata = resolve_citation_metadata(file_id) or {}
                file_name = metadata.get("file_name") or file_id
                source_type = "student_private" if metadata.get("scope") == "USER_PRIVATE" else "teacher_knowledge"
                snippet = file_citation.get("quote") or annotation.get("text") or ""
                chunk_ref = f"{annotation.get('start_index', 0)}-{annotation.get('end_index', 0)}"
                citations.append(
                    CitationItem(
                        fileId=file_id,
                        fileName=file_name,
                        chunkRef=chunk_ref,
                        snippet=snippet,
                        sourceType=source_type,
                    )
                )
    unique: dict[tuple[str, str], CitationItem] = {}
    for citation in citations:
        unique[(citation.file_id, citation.chunk_ref)] = citation
    return list(unique.values())


async def stream_chat_events(request: ChatStreamRequest) -> AsyncIterator[str]:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY is not configured")

    client = create_async_openai_client(settings)
    request_id = request_id_context.get()
    model = request.model or settings.openai_model

    yield _sse("message_start", {"conversationId": request.conversation_id, "requestId": request.request_id})
    logger.info("chat_request_started", extra={"request_id": request_id, "conversation_id": request.conversation_id})

    response = await client.responses.create(
        model=model,
        instructions=_build_instructions(request),
        input=_build_input(request),
        tools=[{"type": "file_search", "vector_store_ids": request.vector_store_ids}]
        if request.vector_store_ids
        else [],
    )

    response_dict = response.model_dump(by_alias=True)
    output_text = response.output_text or ""
    citations = _extract_citations(response_dict)

    for token in _chunk_text(output_text):
        delta = token if token == "\n" else f"{token} "
        yield _sse("token", {"delta": delta})

    for citation in citations:
        yield _sse("citation", citation.model_dump(by_alias=True))

    payload = MessageEndPayload(
        responseId=response.id,
        content=output_text,
        model=response.model,
        citations=citations,
    )
    yield _sse("message_end", payload.model_dump(by_alias=True))
    logger.info("chat_request_completed", extra={"request_id": request_id, "response_id": response.id})

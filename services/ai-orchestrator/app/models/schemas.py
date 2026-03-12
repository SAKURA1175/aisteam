from __future__ import annotations

from pydantic import BaseModel, Field


class ChatMessageItem(BaseModel):
    role: str
    content: str


class TeacherRuleSnapshot(BaseModel):
    version_id: str = Field(alias="versionId")
    title: str
    system_prompt: str = Field(alias="systemPrompt")


class MemoryRecordSnapshot(BaseModel):
    id: str
    memory_type: str = Field(alias="memoryType")
    content: str
    confirmed_by_user: bool = Field(alias="confirmedByUser")


class ChatStreamRequest(BaseModel):
    request_id: str = Field(alias="requestId")
    conversation_id: str = Field(alias="conversationId")
    tenant_id: str = Field(alias="tenantId")
    user_id: str = Field(alias="userId")
    teacher_id: str = Field(alias="teacherId")
    teacher_name: str = Field(alias="teacherName")
    teacher_headline: str = Field(alias="teacherHeadline")
    preferred_language: str = Field(alias="preferredLanguage")
    response_style: str = Field(alias="responseStyle")
    correction_mode: str = Field(alias="correctionMode")
    teacher_rule: TeacherRuleSnapshot = Field(alias="teacherRule")
    memory_records: list[MemoryRecordSnapshot] = Field(default_factory=list, alias="memoryRecords")
    messages: list[ChatMessageItem]
    vector_store_ids: list[str] = Field(default_factory=list, alias="vectorStoreIds")
    model: str | None = None


class CitationItem(BaseModel):
    file_id: str = Field(alias="fileId")
    file_name: str = Field(alias="fileName")
    chunk_ref: str = Field(alias="chunkRef")
    snippet: str
    source_type: str = Field(alias="sourceType")


class MessageEndPayload(BaseModel):
    response_id: str | None = Field(default=None, alias="responseId")
    content: str
    model: str | None = None
    citations: list[CitationItem] = []


class KnowledgeCommand(BaseModel):
    file_id: str = Field(alias="fileId")
    operation: str = "INGEST"


class MemoryExtractRequest(BaseModel):
    request_id: str = Field(alias="requestId")
    tenant_id: str = Field(alias="tenantId")
    teacher_id: str = Field(alias="teacherId")
    user_id: str = Field(alias="userId")
    conversation_id: str = Field(alias="conversationId")
    source_message_id: str = Field(alias="sourceMessageId")
    user_message: str = Field(alias="userMessage")
    assistant_message: str = Field(alias="assistantMessage")
    preferred_language: str = Field(alias="preferredLanguage")
    response_style: str = Field(alias="responseStyle")
    correction_mode: str = Field(alias="correctionMode")


class ExtractedMemoryCandidate(BaseModel):
    memory_type: str = Field(alias="memoryType")
    content: str
    confidence: float

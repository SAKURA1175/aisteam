import asyncio

from app.core.config import Settings
from app.models.schemas import ChatMessageItem, ChatStreamRequest, MemoryRecordSnapshot, TeacherRuleSnapshot
from app.services import chat_service


class FakeResponse:
    id = "resp_test"
    model = "gpt-4.1-mini"
    output_text = "hello from tutor"

    def model_dump(self, by_alias: bool = False):
        return {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "annotations": [
                                {
                                    "type": "file_citation",
                                    "text": "citation",
                                    "start_index": 0,
                                    "end_index": 8,
                                    "file_citation": {
                                        "file_id": "file_123",
                                        "quote": "grounding snippet",
                                    },
                                }
                            ]
                        }
                    ],
                }
            ]
        }


class FakeResponses:
    async def create(self, **kwargs):
        return FakeResponse()


class FakeAsyncOpenAI:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.responses = FakeResponses()


def test_stream_chat_events_emits_tokens_and_citations(monkeypatch) -> None:
    monkeypatch.setattr(chat_service, "create_async_openai_client", lambda settings: FakeAsyncOpenAI(settings.openai_api_key, settings.normalized_openai_base_url))
    monkeypatch.setattr(
        chat_service,
        "resolve_citation_metadata",
        lambda _: {"file_name": "teacher-guide.pdf", "scope": "TEACHER_PUBLIC"},
    )
    monkeypatch.setattr(chat_service.settings, "openai_api_key", "test-key")
    monkeypatch.setattr(chat_service.settings, "openai_base_url", "https://gateway.example.com/v1/")

    request = ChatStreamRequest(
        requestId="req_123",
        conversationId="conv_123",
        tenantId="tenant_123",
        userId="user_123",
        teacherId="teacher_123",
        teacherName="陈栈长",
        teacherHeadline="算法训练",
        preferredLanguage="zh-CN",
        responseStyle="balanced",
        correctionMode="strict",
        teacherRule=TeacherRuleSnapshot(versionId="rule_1", title="Default", systemPrompt="Be rigorous"),
        memoryRecords=[
            MemoryRecordSnapshot(
                id="mem_1",
                memoryType="GOAL",
                content="用户当前目标：准备两周后的 Java 后端面试",
                confirmedByUser=False,
            )
        ],
        messages=[ChatMessageItem(role="user", content="帮我讲一下二分查找")],
        vectorStoreIds=["vs_teacher_123", "vs_user_123"],
        model="gpt-4.1-mini",
    )

    async def collect() -> list[str]:
        return [event async for event in chat_service.stream_chat_events(request)]

    events = asyncio.run(collect())

    assert any("event: token" in event or "event:token" in event for event in events)
    assert any("teacher-guide.pdf" in event for event in events)
    assert any("teacher_knowledge" in event for event in events)
    assert any("message_end" in event for event in events)
    assert any("event: message_end" in event or "event:message_end" in event for event in events)

from app.models.schemas import MemoryExtractRequest
from app.services.memory_service import extract_memories


def test_extract_memories_should_return_goal_and_preference_candidates() -> None:
    request = MemoryExtractRequest(
        requestId="req_mem_1",
        tenantId="tenant_1",
        teacherId="teacher_1",
        userId="user_1",
        conversationId="conv_1",
        sourceMessageId="msg_1",
        userMessage="我想在两周内准备好 Java 后端面试，请用中文并严格纠错。",
        assistantMessage="好的，我会按你的目标和偏好继续训练。",
        preferredLanguage="zh-CN",
        responseStyle="balanced",
        correctionMode="strict",
    )

    candidates = extract_memories(request)

    assert any(candidate.memory_type == "GOAL" for candidate in candidates)
    assert any(candidate.memory_type == "PREFERENCE" for candidate in candidates)

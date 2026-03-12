from __future__ import annotations

import re

from app.models.schemas import ExtractedMemoryCandidate, MemoryExtractRequest


def extract_memories(request: MemoryExtractRequest) -> list[ExtractedMemoryCandidate]:
    text = " ".join(part.strip() for part in [request.user_message, request.assistant_message] if part and part.strip())
    if not text:
        return []

    candidates: list[ExtractedMemoryCandidate] = []

    goal_match = _match_first(
        request.user_message,
        [
            r"(?:我想|我要|我希望|目标是|我正在准备)([^。！？\n]{4,80})",
        ],
    )
    if goal_match:
        candidates.append(
            ExtractedMemoryCandidate(memoryType="GOAL", content=f"用户当前目标：{goal_match}", confidence=0.82)
        )

    profile_match = _match_first(
        request.user_message,
        [
            r"(?:我是|我现在是)([^。！？\n]{2,60})",
        ],
    )
    if profile_match:
        candidates.append(
            ExtractedMemoryCandidate(memoryType="PROFILE", content=f"用户背景：{profile_match}", confidence=0.74)
        )

    progress_match = _match_first(
        request.user_message,
        [
            r"(?:我已经|目前在|最近在|我刷到)([^。！？\n]{4,80})",
        ],
    )
    if progress_match:
        candidates.append(
            ExtractedMemoryCandidate(memoryType="PROGRESS", content=f"用户当前进度：{progress_match}", confidence=0.77)
        )

    error_match = _match_first(
        request.user_message,
        [
            r"(?:我总是|我经常|我老是|我容易)([^。！？\n]{4,80})",
        ],
    )
    if error_match:
        candidates.append(
            ExtractedMemoryCandidate(memoryType="ERROR_PATTERN", content=f"用户常见问题：{error_match}", confidence=0.8)
        )

    preference_bits = []
    if "中文" in request.user_message:
        preference_bits.append("偏好中文回答")
    if "英文" in request.user_message:
        preference_bits.append("可接受英文回答")
    if "简洁" in request.user_message or "先给结论" in request.user_message:
        preference_bits.append("偏好简洁直给")
    if "严格" in request.user_message and "纠错" in request.user_message:
        preference_bits.append("偏好严格纠错")
    if preference_bits:
        candidates.append(
            ExtractedMemoryCandidate(memoryType="PREFERENCE", content="；".join(preference_bits), confidence=0.72)
        )

    return _dedupe(candidates)[:3]


def _match_first(text: str, patterns: list[str]) -> str | None:
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1).strip(" ，,。；;：:")
    return None


def _dedupe(candidates: list[ExtractedMemoryCandidate]) -> list[ExtractedMemoryCandidate]:
    unique: dict[tuple[str, str], ExtractedMemoryCandidate] = {}
    for candidate in candidates:
        unique[(candidate.memory_type, candidate.content)] = candidate
    return list(unique.values())

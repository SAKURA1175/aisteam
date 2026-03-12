from __future__ import annotations

from openai import AsyncOpenAI, OpenAI

from app.core.config import Settings, get_settings


def create_async_openai_client(settings: Settings | None = None) -> AsyncOpenAI:
    actual_settings = settings or get_settings()
    return AsyncOpenAI(
        api_key=actual_settings.openai_api_key,
        base_url=actual_settings.normalized_openai_base_url,
    )


def create_openai_client(settings: Settings | None = None) -> OpenAI:
    actual_settings = settings or get_settings()
    return OpenAI(
        api_key=actual_settings.openai_api_key,
        base_url=actual_settings.normalized_openai_base_url,
    )

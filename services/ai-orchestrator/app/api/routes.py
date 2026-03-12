from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse

from app.core.config import get_settings
from app.models.schemas import ChatStreamRequest, KnowledgeCommand, MemoryExtractRequest
from app.services.chat_service import stream_chat_events
from app.services.memory_service import extract_memories
from app.services.openai_capability_probe import probe_openai_capabilities

router = APIRouter()


def _enqueue_knowledge_task(file_id: str, operation: str) -> None:
    try:
        from app.tasks.worker import knowledge_sync_task
    except ModuleNotFoundError as exc:
        raise HTTPException(status_code=503, detail="Knowledge worker dependencies are not installed") from exc

    knowledge_sync_task.delay(file_id, operation)


@router.get("/internal/health")
async def health(probe_upstream: bool = Query(default=False, alias="probe_upstream")) -> dict:
    settings = get_settings()
    payload = {
        "status": "ok",
        "openai": {
            "configured": bool(settings.openai_api_key),
            "baseUrl": settings.normalized_openai_base_url,
            "probeStatus": "skipped",
        },
    }

    if probe_upstream and settings.openai_api_key:
        payload["openai"]["probeStatus"] = "completed"
        payload["openai"]["capabilities"] = probe_openai_capabilities(
            api_key=settings.openai_api_key,
            base_url=settings.normalized_openai_base_url,
            model=settings.openai_model,
        )

    return payload


@router.post("/internal/chat/stream")
async def chat_stream(request: ChatStreamRequest) -> StreamingResponse:
    return StreamingResponse(stream_chat_events(request), media_type="text/event-stream")


@router.post("/internal/knowledge/ingest", status_code=202)
async def enqueue_ingest(command: KnowledgeCommand) -> JSONResponse:
    _enqueue_knowledge_task(command.file_id, command.operation)
    return JSONResponse({"status": "queued"}, status_code=202)


@router.post("/internal/knowledge/retry", status_code=202)
async def retry_ingest(command: KnowledgeCommand) -> JSONResponse:
    if command.operation not in {"RETRY", "DELETE", "INGEST"}:
        raise HTTPException(status_code=400, detail="Unsupported operation")
    _enqueue_knowledge_task(command.file_id, command.operation)
    return JSONResponse({"status": "queued"}, status_code=202)


@router.post("/internal/memory/extract")
async def memory_extract(request: MemoryExtractRequest) -> list[dict]:
    return [candidate.model_dump(by_alias=True) for candidate in extract_memories(request)]

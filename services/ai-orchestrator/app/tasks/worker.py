from __future__ import annotations

import logging

from celery import Celery

from app.core.config import get_settings
from app.services.knowledge_service import sync_knowledge_file

settings = get_settings()
logger = logging.getLogger(__name__)

celery_app = Celery("tutormarket_ai_orchestrator", broker=settings.broker_url, backend=settings.broker_url)
celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="knowledge_sync_task")
def knowledge_sync_task(file_id: str, operation: str = "INGEST") -> None:
    logger.info("knowledge_task_started", extra={"request_id": "-", "file_id": file_id, "operation": operation})
    try:
        sync_knowledge_file(file_id, operation)
    except Exception as exc:
        logger.exception("knowledge_task_failed", extra={"request_id": "-", "file_id": file_id})
        raise exc

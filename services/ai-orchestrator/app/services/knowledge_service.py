from __future__ import annotations

import logging
import uuid

from app.core.config import get_settings
from app.services import db
from app.services.openai_capability_probe import probe_openai_capabilities_cached
from app.services.openai_client_factory import create_openai_client
from app.services.storage_service import open_object_stream

logger = logging.getLogger(__name__)
settings = get_settings()


def sync_knowledge_file(file_id: str, operation: str) -> None:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    capabilities = probe_openai_capabilities_cached(
        settings.openai_api_key,
        settings.normalized_openai_base_url,
        settings.openai_model,
    )
    if not capabilities["readyForKnowledge"]:
        raise RuntimeError(
            "Upstream OpenAI gateway is not compatible with knowledge ingestion. "
            "Required endpoints: /models, /responses, /files, /vector_stores."
        )

    client = create_openai_client(settings)
    record = db.fetch_knowledge_file(file_id)
    if not record:
        logger.warning("knowledge_file_missing", extra={"request_id": "-", "file_id": file_id})
        return

    teacher = db.fetch_teacher(record["teacher_id"])
    if not teacher:
        logger.warning("teacher_missing", extra={"request_id": "-", "file_id": file_id})
        return

    if operation == "DELETE":
        _delete_remote_file(client, record)
        return

    db.update_knowledge_file(file_id, status="PARSING", error_message=None)

    vector_store_id = _resolve_vector_store(client, record, teacher)

    db.update_knowledge_file(file_id, status="INDEXING")
    file_stream = open_object_stream(record["object_key"])
    file_stream.name = record["file_name"]

    uploaded_file = client.files.create(file=file_stream, purpose="assistants")
    vector_store_file = client.vector_stores.files.create_and_poll(
        vector_store_id=vector_store_id,
        file_id=uploaded_file.id,
        attributes={"teacher_id": teacher["id"], "source_file": record["file_name"]},
    )

    status = "READY" if vector_store_file.status == "completed" else "FAILED"
    db.update_knowledge_file(
        file_id,
        status=status,
        openai_file_id=uploaded_file.id,
        openai_vector_store_file_id=vector_store_file.id,
        error_message=None if status == "READY" else f"Vector store status: {vector_store_file.status}",
    )


def _resolve_vector_store(client: OpenAI, record: dict, teacher: dict) -> str:
    if record.get("scope") == "USER_PRIVATE":
        user_id = record.get("user_id")
        if not user_id:
            raise RuntimeError("USER_PRIVATE knowledge file is missing user_id")

        store = db.fetch_user_knowledge_store(record["tenant_id"], teacher["id"], user_id)
        if store:
            return store["openai_vector_store_id"]

        vector_store = client.vector_stores.create(name=f"user-{user_id}-teacher-{teacher['id']}-knowledge")
        db.create_user_knowledge_store(
            str(uuid.uuid4()),
            record["tenant_id"],
            teacher["id"],
            user_id,
            vector_store.id,
        )
        return vector_store.id

    vector_store_id = teacher.get("openai_vector_store_id")
    if vector_store_id:
        return vector_store_id

    vector_store = client.vector_stores.create(name=f"teacher-{teacher['id']}-knowledge")
    db.update_teacher_vector_store(teacher["id"], vector_store.id)
    return vector_store.id


def _delete_remote_file(client: OpenAI, record: dict) -> None:
    openai_file_id = record.get("openai_file_id")
    if openai_file_id:
        client.files.delete(openai_file_id)
    db.update_knowledge_file(record["id"], error_message=None)

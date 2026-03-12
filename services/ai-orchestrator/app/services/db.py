from __future__ import annotations

from contextlib import contextmanager
from functools import lru_cache
from typing import Iterator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    settings = get_settings()
    return create_engine(settings.database_url, pool_pre_ping=True)


@contextmanager
def get_connection() -> Iterator:
    engine = get_engine()
    with engine.begin() as connection:
        yield connection


def fetch_teacher(teacher_id: str) -> dict | None:
    query = text(
        "select id, name, headline, openai_vector_store_id from teachers where id = :teacher_id"
    )
    with get_connection() as connection:
        row = connection.execute(query, {"teacher_id": teacher_id}).mappings().first()
        return dict(row) if row else None


def fetch_user_knowledge_store(tenant_id: str, teacher_id: str, user_id: str) -> dict | None:
    query = text(
        """
        select id, tenant_id, teacher_id, user_id, openai_vector_store_id
        from user_knowledge_stores
        where tenant_id = :tenant_id and teacher_id = :teacher_id and user_id = :user_id
        """
    )
    with get_connection() as connection:
        row = connection.execute(
            query,
            {"tenant_id": tenant_id, "teacher_id": teacher_id, "user_id": user_id},
        ).mappings().first()
        return dict(row) if row else None


def create_user_knowledge_store(store_id: str, tenant_id: str, teacher_id: str, user_id: str, vector_store_id: str) -> None:
    query = text(
        """
        insert into user_knowledge_stores (id, tenant_id, teacher_id, user_id, openai_vector_store_id, created_at, updated_at)
        values (:id, :tenant_id, :teacher_id, :user_id, :vector_store_id, now(), now())
        """
    )
    with get_connection() as connection:
        connection.execute(
            query,
            {
                "id": store_id,
                "tenant_id": tenant_id,
                "teacher_id": teacher_id,
                "user_id": user_id,
                "vector_store_id": vector_store_id,
            },
        )


def update_teacher_vector_store(teacher_id: str, vector_store_id: str) -> None:
    query = text(
        "update teachers set openai_vector_store_id = :vector_store_id, updated_at = now() where id = :teacher_id"
    )
    with get_connection() as connection:
        connection.execute(query, {"teacher_id": teacher_id, "vector_store_id": vector_store_id})


def fetch_knowledge_file(file_id: str) -> dict | None:
    query = text(
        """
        select id, tenant_id, teacher_id, user_id, file_name, object_key, scope, status, openai_file_id,
               openai_vector_store_file_id, deleted_at
        from knowledge_files
        where id = :file_id
        """
    )
    with get_connection() as connection:
        row = connection.execute(query, {"file_id": file_id}).mappings().first()
        return dict(row) if row else None


def update_knowledge_file(file_id: str, **fields) -> None:
    assignments = ", ".join(f"{column} = :{column}" for column in fields.keys())
    query = text(f"update knowledge_files set {assignments}, updated_at = now() where id = :id")
    values = {"id": file_id, **fields}
    with get_connection() as connection:
        connection.execute(query, values)


def resolve_citation_metadata(openai_file_id: str) -> dict | None:
    query = text(
        """
        select file_name, scope
        from knowledge_files
        where openai_file_id = :openai_file_id
        order by created_at desc
        limit 1
        """
    )
    with get_connection() as connection:
        row = connection.execute(query, {"openai_file_id": openai_file_id}).mappings().first()
        return dict(row) if row else None

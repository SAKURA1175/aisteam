import io

from app.services import knowledge_service


class FakeUploadedFile:
    id = "file_uploaded_123"


class FakeVectorStoreFile:
    id = "vs_file_123"
    status = "completed"


class FakeVectorStore:
    id = "vs_123"


class FakeFiles:
    def create(self, file, purpose: str):
        assert purpose == "assistants"
        assert file.name == "guide.txt"
        return FakeUploadedFile()

    def delete(self, file_id: str):
        assert file_id == "file_uploaded_123"


class FakeVectorStoreFiles:
    def create_and_poll(self, vector_store_id: str, file_id: str, attributes: dict):
        assert vector_store_id == "vs_123"
        assert file_id == "file_uploaded_123"
        assert attributes["source_file"] == "guide.txt"
        return FakeVectorStoreFile()


class FakeVectorStores:
    def __init__(self):
        self.files = FakeVectorStoreFiles()

    def create(self, name: str):
        assert "teacher-" in name
        return FakeVectorStore()


class FakeOpenAI:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.files = FakeFiles()
        self.vector_stores = FakeVectorStores()


def test_sync_knowledge_file_should_use_configured_base_url(monkeypatch) -> None:
    captured = {}

    def fake_client_factory(settings):
        client = FakeOpenAI(settings.openai_api_key, settings.normalized_openai_base_url)
        captured["api_key"] = client.api_key
        captured["base_url"] = client.base_url
        return client

    monkeypatch.setattr(knowledge_service, "create_openai_client", fake_client_factory)
    monkeypatch.setattr(
        knowledge_service,
        "probe_openai_capabilities_cached",
        lambda api_key, base_url, model: {"readyForKnowledge": True},
    )
    monkeypatch.setattr(knowledge_service.settings, "openai_api_key", "test-key")
    monkeypatch.setattr(knowledge_service.settings, "openai_base_url", "https://gateway.example.com/v1/")
    monkeypatch.setattr(
        knowledge_service.db,
        "fetch_knowledge_file",
        lambda _: {
            "id": "file_local_123",
            "tenant_id": "tenant_1",
            "teacher_id": "teacher_1",
            "user_id": None,
            "file_name": "guide.txt",
            "object_key": "teacher/teacher_1/file_local_123/guide.txt",
            "scope": "TEACHER_PUBLIC",
            "openai_file_id": None,
        },
    )
    monkeypatch.setattr(
        knowledge_service.db,
        "fetch_teacher",
        lambda _: {"id": "teacher_1", "openai_vector_store_id": None},
    )
    monkeypatch.setattr(knowledge_service.db, "update_knowledge_file", lambda *args, **kwargs: None)
    monkeypatch.setattr(knowledge_service.db, "update_teacher_vector_store", lambda *args, **kwargs: None)
    monkeypatch.setattr(knowledge_service.db, "fetch_user_knowledge_store", lambda *args, **kwargs: None)
    monkeypatch.setattr(knowledge_service.db, "create_user_knowledge_store", lambda *args, **kwargs: None)

    stream = io.BytesIO(b"hello")
    stream.name = "guide.txt"
    monkeypatch.setattr(knowledge_service, "open_object_stream", lambda _: stream)

    knowledge_service.sync_knowledge_file("file_local_123", "INGEST")

    assert captured["api_key"] == "test-key"
    assert captured["base_url"] == "https://gateway.example.com/v1"


def test_sync_knowledge_file_should_fail_fast_when_gateway_lacks_knowledge_capabilities(monkeypatch) -> None:
    monkeypatch.setattr(knowledge_service.settings, "openai_api_key", "test-key")
    monkeypatch.setattr(
        knowledge_service,
        "probe_openai_capabilities_cached",
        lambda api_key, base_url, model: {"readyForKnowledge": False},
    )

    try:
        knowledge_service.sync_knowledge_file("file_local_123", "INGEST")
        assert False, "Expected knowledge capability guard to fail"
    except RuntimeError as error:
        assert "/vector_stores" in str(error)

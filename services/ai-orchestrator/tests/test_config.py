from app.core.config import Settings


def test_settings_should_default_to_official_openai_base_url(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    settings = Settings(_env_file=None)

    assert settings.normalized_openai_base_url == "https://api.openai.com/v1"


def test_settings_should_normalize_custom_openai_base_url(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_BASE_URL", raising=False)
    settings = Settings(_env_file=None, OPENAI_BASE_URL="https://gateway.example.com/v1/")

    assert settings.normalized_openai_base_url == "https://gateway.example.com/v1"

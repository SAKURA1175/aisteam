from __future__ import annotations

from functools import lru_cache

import httpx


def probe_openai_capabilities(
    api_key: str,
    base_url: str,
    model: str = "gpt-4.1-mini",
    timeout_seconds: float = 15.0,
) -> dict:
    normalized_base_url = base_url.rstrip("/")
    headers = {"Authorization": f"Bearer {api_key}"}

    with httpx.Client(timeout=timeout_seconds, follow_redirects=True) as client:
        models = _probe(client, "GET", f"{normalized_base_url}/models", headers=headers)
        responses = _probe(
            client,
            "POST",
            f"{normalized_base_url}/responses",
            headers={**headers, "Content-Type": "application/json"},
            json={"model": model, "input": "ping", "max_output_tokens": 1},
        )
        files = _probe(client, "GET", f"{normalized_base_url}/files", headers=headers)
        vector_stores = _probe(client, "GET", f"{normalized_base_url}/vector_stores", headers=headers)

    return {
        "baseUrl": normalized_base_url,
        "models": models,
        "responses": responses,
        "files": files,
        "vectorStores": vector_stores,
        "readyForKnowledge": all(
            capability["ok"] for capability in [models, responses, files, vector_stores]
        ),
    }


@lru_cache(maxsize=8)
def probe_openai_capabilities_cached(api_key: str, base_url: str, model: str = "gpt-4.1-mini") -> dict:
    return probe_openai_capabilities(api_key=api_key, base_url=base_url, model=model)


def _probe(
    client: httpx.Client,
    method: str,
    url: str,
    headers: dict,
    json: dict | None = None,
) -> dict:
    try:
        response = client.request(method, url, headers=headers, json=json)
        return {
            "ok": response.is_success,
            "statusCode": response.status_code,
            "contentType": response.headers.get("content-type"),
            "bodyPreview": response.text[:200] if response.text else "",
        }
    except httpx.HTTPError as error:
        return {
            "ok": False,
            "statusCode": None,
            "contentType": None,
            "bodyPreview": str(error),
        }

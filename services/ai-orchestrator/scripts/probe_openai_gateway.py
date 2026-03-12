from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.core.config import get_settings
from app.services.openai_capability_probe import probe_openai_capabilities


def main() -> int:
    settings = get_settings()
    if not settings.openai_api_key:
        print(json.dumps({"error": "OPENAI_API_KEY is not configured"}, ensure_ascii=False))
        return 1

    result = probe_openai_capabilities(
        api_key=settings.openai_api_key,
        base_url=settings.normalized_openai_base_url,
        model=settings.openai_model,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["readyForKnowledge"] else 2


if __name__ == "__main__":
    raise SystemExit(main())

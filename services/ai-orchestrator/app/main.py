from fastapi import FastAPI

from app.api.routes import router
from app.core.logging import configure_logging
from app.core.request_context import RequestContextMiddleware

configure_logging()

app = FastAPI(title="TutorMarket AI Orchestrator", version="0.1.0")
app.add_middleware(RequestContextMiddleware)
app.include_router(router)

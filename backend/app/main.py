"""FastAPI application entry point."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging_config import configure_logging
from app.db.database import connect_db, disconnect_db
from app.api.routes import health, scan, history, dashboard, deepfake, scam

configure_logging()
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting CyberShield AI backend v%s", settings.app_version)
    try:
        await connect_db()
        logger.info("Database connection established")
    except Exception as exc:
        logger.error("MongoDB unavailable: %s — continuing without persistence", exc)

    # Auto-sync threat intel on startup if enabled
    if settings.hagezi_sync_enabled:
        logger.info("Auto-syncing threat intelligence on startup...")
        from app.services.threat_intelligence.hagezi_service import get_threat_intel_service
        ti = get_threat_intel_service()
        success, msg, count = await ti.sync()
        logger.info("Threat intel startup sync: %s (%s)", msg, count)

    # Warm up deepfake detector in background thread
    import asyncio
    from app.services.deepfake.model_manager import get_model_manager
    asyncio.create_task(asyncio.to_thread(get_model_manager().ensure_loaded))

    yield

    await disconnect_db()
    logger.info("CyberShield AI backend stopped")


app = FastAPI(
    title="CyberShield AI API",
    description="Intelligent phishing URL detection backend",
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(scan.router)
app.include_router(history.router)
app.include_router(dashboard.router)
app.include_router(deepfake.router)
app.include_router(scam.router)


@app.get("/", tags=["root"])
async def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "docs": "/api/docs",
    }

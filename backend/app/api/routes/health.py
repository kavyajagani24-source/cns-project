"""API routes — health, model health, threat intel health."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.db.database import get_db
from app.core.config import get_settings
from app.schemas.scan_schemas import HealthStatus, ModelHealthStatus, ThreatIntelHealthStatus
from app.services.phishing.ml_service import get_ml_service
from app.services.threat_intelligence.hagezi_service import get_threat_intel_service

router = APIRouter(prefix="/api/health", tags=["health"])
settings = get_settings()


@router.get("", response_model=HealthStatus)
async def health_check():
    db_status = "healthy"
    try:
        db = get_db()
        await db.command("ping")
    except Exception:
        db_status = "unavailable"

    return HealthStatus(
        status="healthy" if db_status == "healthy" else "degraded",
        database=db_status,
        timestamp=datetime.now(timezone.utc),
        version=settings.app_version,
    )


@router.get("/models", response_model=ModelHealthStatus)
async def model_health():
    ml = get_ml_service()
    h = ml.health()
    return ModelHealthStatus(
        model_name=h["model_name"],
        available=h["available"],
        version=h.get("version"),
        model_type=h.get("model_type"),
        artifact_path=h.get("artifact_path"),
        last_check=h.get("last_check"),
        error=h.get("error"),
    )


@router.get("/threat-intel", response_model=ThreatIntelHealthStatus)
async def threat_intel_health():
    ti = get_threat_intel_service()
    return ti.health()

"""API routes — dashboard stats and threat intel sync."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter

from app.repositories.scan_repository import ScanRepository
from app.schemas.scan_schemas import DashboardStats, SyncResponse
from app.services.phishing.ml_service import get_ml_service
from app.services.threat_intelligence.hagezi_service import get_threat_intel_service

router = APIRouter(prefix="/api", tags=["dashboard"])
_repo = ScanRepository()


@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats():
    stats = await _repo.get_stats()
    recent = await _repo.list_scans(page=1, page_size=5)
    ml = get_ml_service()
    ti = get_threat_intel_service()
    ti_health = ti.health()
    ml_health = ml.health()

    return DashboardStats(
        total_scans=stats["total"],
        phishing_count=stats["phishing"],
        suspicious_count=stats["suspicious"],
        safe_count=stats["safe"],
        inconclusive_count=stats["inconclusive"],
        threat_intel_matches=stats["threat_intel_matches"],
        recent_scans=recent.items,
        model_available=ml_health["available"],
        model_version=ml_health.get("version"),
        threat_intel_status=ti_health.sync_status,
        threat_intel_entry_count=ti_health.entry_count,
        threat_intel_last_updated=ti_health.last_successful,
    )


@router.post("/threat-intel/sync", response_model=SyncResponse)
async def trigger_sync():
    """Trigger a manual threat intelligence sync. Admin operation."""
    import time
    start = time.monotonic()
    ti = get_threat_intel_service()
    success, message, entry_count = await ti.sync()
    h = ti.health()
    return SyncResponse(
        success=success,
        message=message,
        entry_count=entry_count,
        content_hash=h.content_hash,
        duration_seconds=round(time.monotonic() - start, 2),
    )

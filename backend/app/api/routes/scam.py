from datetime import datetime, timezone
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Query
from app.schemas.scam_schemas import ScamRequest, ScamResult, ScamHistory
from app.services.scam_analysis.engine import analyze_text
from app.repositories.scam_repository import ScamRepository

router = APIRouter(prefix="/api/scam", tags=["scam-analysis"])
_repo = ScamRepository()

@router.post("/analyze", response_model=ScamResult)
async def analyze(request: ScamRequest):
    analysis = analyze_text(request.text)
    result = ScamResult(scan_id=str(uuid4()), created_at=datetime.now(timezone.utc), source_type=request.source_type, **analysis)
    if request.save_history:
        result.stored = await _repo.save(result)
    return result

@router.get("/scans", response_model=ScamHistory)
async def list_scans(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)):
    try:
        return await _repo.list(page, page_size)
    except Exception:
        raise HTTPException(503, "Scan history is unavailable. Check the database connection.")

@router.delete("/scans/{scan_id}")
async def delete_scan(scan_id: str):
    try:
        if not await _repo.delete(scan_id):
            raise HTTPException(404, "Scam scan not found")
    except RuntimeError:
        raise HTTPException(503, "Database unavailable")
    return {"deleted": True}

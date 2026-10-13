"""API routes — scan submission and retrieval."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.repositories.scan_repository import ScanRepository
from app.schemas.scan_schemas import (
    ErrorResponse,
    PaginatedScans,
    ScanResult,
    URLScanRequest,
)
from app.services.phishing.url_scanner import analyze_url

router = APIRouter(prefix="/api/scan", tags=["scanning"])
_repo = ScanRepository()
logger = logging.getLogger(__name__)


@router.post("/url", response_model=ScanResult)
async def submit_url_scan(request: URLScanRequest):
    """Submit a URL for phishing analysis. Returns the complete result synchronously."""
    result = await analyze_url(request.url)
    await _repo.save(result)
    return result


@router.get("/url/{scan_id}", response_model=ScanResult)
async def get_scan_result(scan_id: str):
    """Retrieve a scan result by ID."""
    scan = await _repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan

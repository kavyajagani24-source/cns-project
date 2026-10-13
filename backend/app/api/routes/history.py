"""API routes — scan history management."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.repositories.scan_repository import ScanRepository
from app.schemas.scan_schemas import PaginatedScans, ScanResult

router = APIRouter(prefix="/api/scans", tags=["history"])
_repo = ScanRepository()


@router.get("", response_model=PaginatedScans)
async def list_scans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    return await _repo.list_scans(page=page, page_size=page_size)


@router.get("/{scan_id}", response_model=ScanResult)
async def get_scan(scan_id: str):
    scan = await _repo.get_by_id(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.delete("/{scan_id}")
async def delete_scan(scan_id: str):
    deleted = await _repo.delete(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Scan not found")
    return {"message": "Scan deleted", "scan_id": scan_id}

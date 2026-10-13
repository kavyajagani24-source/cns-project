"""
Deepfake API routes.
Endpoints:
  GET  /api/deepfake/health     — model health
  GET  /api/deepfake/model      — model metadata
  POST /api/deepfake/analyze    — upload & analyze video
  GET  /api/deepfake/scans      — paginated scan history
  GET  /api/deepfake/scans/{id} — single scan result
  DELETE /api/deepfake/scans/{id} — delete scan
"""
from __future__ import annotations

import asyncio
import math
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, BackgroundTasks
from fastapi.responses import JSONResponse

from app.core.logging_config import get_logger
from app.repositories import deepfake_repository
from app.services.deepfake.model_manager import get_model_manager
from app.services.deepfake.schemas import (
    DeepfakePaginatedScans,
    DeepfakeScanResult,
    DeepfakeScanSummary,
    DeepfakeModelHealth,
    DeepfakeStatus,
)
from app.services.deepfake.video_validation import (
    VideoValidationError,
    ALLOWED_EXTENSIONS,
    MAX_UPLOAD_BYTES,
    validate_extension,
    validate_file_size,
    validate_magic_bytes,
    validate_video_with_cv2,
    save_upload_to_temp,
    cleanup_temp_file,
)
from app.services.deepfake.pwtf_dvd_detector import run_inference

logger = get_logger(__name__)
router = APIRouter(prefix="/api/deepfake", tags=["deepfake"])

# Semaphore: limit concurrent inference jobs to 1 (model is GPU-bound)
_INFERENCE_SEM = asyncio.Semaphore(1)
INFERENCE_TIMEOUT_SECONDS = 600  # 10 minutes


@router.get("/health", summary="Deepfake model health")
async def deepfake_health() -> DeepfakeModelHealth:
    """Returns the current status of the PwTF-DVD model."""
    manager = get_model_manager()
    return manager.get_health()


@router.get("/model", summary="Deepfake model metadata")
async def deepfake_model() -> DeepfakeModelHealth:
    """Alias for /health — full model metadata."""
    return await deepfake_health()


@router.post(
    "/analyze",
    summary="Upload and analyze a video for deepfake content",
    status_code=202,
)
async def analyze_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Video file (MP4, MOV, AVI, MKV)"),
) -> DeepfakeScanResult:
    """
    Accepts a video upload, validates it, runs PwTF-DVD inference, and
    persists sanitized metadata (never the raw video) to MongoDB.

    Privacy notice: Videos are analyzed by the configured deepfake detector.
    Upload only content you are authorized to analyze. Uploaded files are
    processed temporarily and are not retained by default.
    """
    temp_path: Optional[str] = None

    # ── Validate filename extension ──────────────────────────────────────────
    try:
        ext = validate_extension(file.filename or "")
    except VideoValidationError as exc:
        raise HTTPException(status_code=exc.http_status, detail=str(exc))

    # ── Read upload content ──────────────────────────────────────────────────
    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Failed to read uploaded file.")

    # ── Validate file size ───────────────────────────────────────────────────
    try:
        validate_file_size(len(content))
    except VideoValidationError as exc:
        raise HTTPException(status_code=exc.http_status, detail=str(exc))

    # ── Validate magic bytes ─────────────────────────────────────────────────
    try:
        validate_magic_bytes(content[:12], ext)
    except VideoValidationError as exc:
        raise HTTPException(status_code=exc.http_status, detail=str(exc))

    # ── Check model availability before accepting the upload ─────────────────
    manager = get_model_manager()
    manager.ensure_loaded()  # best-effort — don't fail here, fail gracefully in inference

    # ── Save to temp dir ─────────────────────────────────────────────────────
    try:
        temp_path = save_upload_to_temp(content, ext)
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to save uploaded file to temp directory.")

    # ── Validate video content via OpenCV ────────────────────────────────────
    try:
        duration, width, height, frame_count = validate_video_with_cv2(temp_path)
    except VideoValidationError as exc:
        cleanup_temp_file(temp_path)
        raise HTTPException(status_code=exc.http_status, detail=str(exc))
    except Exception:
        logger.warning("cv2 video validation failed — proceeding to inference")

    # ── Run inference under semaphore (bounded concurrency) ───────────────────
    try:
        async with _INFERENCE_SEM:
            loop = asyncio.get_event_loop()
            result = await asyncio.wait_for(
                loop.run_in_executor(None, run_inference, temp_path),
                timeout=INFERENCE_TIMEOUT_SECONDS,
            )
    except asyncio.TimeoutError:
        cleanup_temp_file(temp_path)
        raise HTTPException(
            status_code=504,
            detail=f"Inference timed out after {INFERENCE_TIMEOUT_SECONDS}s.",
        )
    except Exception as exc:
        logger.exception("Unexpected error during inference dispatch")
        cleanup_temp_file(temp_path)
        raise HTTPException(status_code=500, detail="Unexpected inference error.")
    finally:
        # Always clean up temp file
        cleanup_temp_file(temp_path)

    # ── Persist metadata to MongoDB ───────────────────────────────────────────
    background_tasks.add_task(deepfake_repository.save_scan, result)

    return result


@router.get("/scans", summary="Paginated deepfake scan history")
async def list_deepfake_scans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> DeepfakePaginatedScans:
    """Returns paginated deepfake scan history from MongoDB."""
    docs, total = await deepfake_repository.list_scans(page=page, page_size=page_size)
    items = []
    for doc in docs:
        try:
            items.append(DeepfakeScanSummary(**doc))
        except Exception:
            pass
    total_pages = max(1, math.ceil(total / page_size)) if total > 0 else 1
    return DeepfakePaginatedScans(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/scans/{scan_id}", summary="Get deepfake scan by ID")
async def get_deepfake_scan(scan_id: str) -> DeepfakeScanResult:
    """Returns a single deepfake scan result."""
    doc = await deepfake_repository.get_scan(scan_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=f"Deepfake scan '{scan_id}' not found.")
    try:
        return DeepfakeScanResult(**doc)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse scan result.")


@router.delete("/scans/{scan_id}", summary="Delete deepfake scan")
async def delete_deepfake_scan(scan_id: str) -> dict:
    """Deletes a deepfake scan record from MongoDB."""
    deleted = await deepfake_repository.delete_scan(scan_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Deepfake scan '{scan_id}' not found.")
    return {"deleted": True, "scan_id": scan_id}

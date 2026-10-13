"""
Video upload validation for deepfake analysis.
Validates format, size, duration, and content before inference.
"""
from __future__ import annotations

import os
import struct
import tempfile
import uuid
from pathlib import Path
from typing import Tuple, Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Configuration defaults (conservative for local dev)
MAX_UPLOAD_BYTES: int = 100 * 1024 * 1024   # 100 MB
MAX_DURATION_SECONDS: float = 300.0          # 5 minutes
MAX_RESOLUTION_PIXELS: int = 1920 * 1080    # 1080p
MAX_FRAME_COUNT: int = 2000
ALLOWED_EXTENSIONS: frozenset = frozenset({".mp4", ".mov", ".avi", ".mkv"})

# Magic bytes (file signatures) for supported formats
_MAGIC_SIGNATURES = {
    # MP4 / MOV — ftyp box at offset 4
    b"ftyp": "video/mp4",
    # AVI
    b"RIFF": "video/avi",
    # MKV — EBML header
    b"\x1a\x45\xdf\xa3": "video/x-matroska",
}


class VideoValidationError(Exception):
    """Raised when a video fails validation."""
    def __init__(self, message: str, http_status: int = 400):
        super().__init__(message)
        self.http_status = http_status


def validate_extension(filename: str) -> str:
    """Return lowercase extension or raise VideoValidationError."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise VideoValidationError(
            f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    return ext


def _read_magic(data: bytes) -> Optional[str]:
    """Detect mime type from first 12 bytes."""
    if len(data) < 12:
        return None
    # MP4/MOV: bytes 4-7 are 'ftyp'
    if data[4:8] == b"ftyp":
        return "video/mp4"
    # AVI: starts with RIFF
    if data[:4] == b"RIFF" and data[8:12] == b"AVI ":
        return "video/avi"
    # MKV: EBML magic
    if data[:4] == b"\x1a\x45\xdf\xa3":
        return "video/x-matroska"
    return None


def validate_magic_bytes(data: bytes, extension: str) -> str:
    """Verify file magic matches a supported video container."""
    mime = _read_magic(data)
    if mime is None:
        raise VideoValidationError(
            "File does not appear to be a supported video format (magic bytes mismatch)."
        )
    return mime


def validate_file_size(size_bytes: int) -> None:
    """Raise if file exceeds maximum upload size."""
    if size_bytes == 0:
        raise VideoValidationError("Uploaded file is empty.")
    if size_bytes > MAX_UPLOAD_BYTES:
        mb = MAX_UPLOAD_BYTES // (1024 * 1024)
        raise VideoValidationError(
            f"File size {size_bytes // (1024*1024)} MB exceeds maximum allowed {mb} MB.",
            http_status=413,
        )


def validate_video_with_cv2(path: str) -> Tuple[float, int, int, int]:
    """
    Open video with OpenCV and validate duration / resolution / frame count.
    Returns (duration_seconds, width, height, frame_count).
    Raises VideoValidationError on bad video or limit violations.
    """
    try:
        import cv2  # type: ignore
    except ImportError:
        logger.warning("cv2 not available — skipping video content validation")
        return 0.0, 0, 0, 0

    cap = cv2.VideoCapture(path)
    try:
        if not cap.isOpened():
            raise VideoValidationError("Could not open video file. File may be corrupt.")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        if fps <= 0:
            fps = 25.0

        duration_seconds = frame_count / fps if frame_count > 0 else 0.0

        if duration_seconds > MAX_DURATION_SECONDS:
            raise VideoValidationError(
                f"Video duration {duration_seconds:.1f}s exceeds maximum {MAX_DURATION_SECONDS:.0f}s.",
                http_status=413,
            )

        if width * height > MAX_RESOLUTION_PIXELS:
            raise VideoValidationError(
                f"Video resolution {width}x{height} exceeds maximum allowed pixels.",
                http_status=413,
            )

        if frame_count > MAX_FRAME_COUNT:
            logger.warning(
                "Video has %d frames; will truncate to %d for inference.",
                frame_count,
                MAX_FRAME_COUNT,
            )

        return duration_seconds, width, height, frame_count
    finally:
        cap.release()


def save_upload_to_temp(content: bytes, extension: str) -> str:
    """
    Write upload bytes to a secure temporary file.
    Returns the absolute path. Caller is responsible for cleanup.
    """
    tmp_dir = Path(tempfile.gettempdir()) / "cybershield_deepfake_uploads"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"upload_{uuid.uuid4().hex}{extension}"
    dest = tmp_dir / safe_name
    dest.write_bytes(content)
    logger.debug("Saved upload to temp: %s (%d bytes)", dest, len(content))
    return str(dest)


def cleanup_temp_file(path: str) -> None:
    """Delete a temporary file, logging but not raising on failure."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
            logger.debug("Cleaned up temp file: %s", path)
    except OSError as exc:
        logger.warning("Could not delete temp file %s: %s", path, exc)

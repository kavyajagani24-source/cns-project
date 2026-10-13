"""
Deepfake detection backend tests.
Uses mocks for expensive model loading and GPU inference.
Run with: uv run pytest tests/test_deepfake_api.py -v
"""
from __future__ import annotations

import io
import struct
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.deepfake.schemas import (
    DeepfakeScanResult,
    DeepfakeStatus,
    DeepfakeClassification,
    ModelInitStatus,
    classify_score,
)
from app.services.deepfake.video_validation import (
    VideoValidationError,
    validate_extension,
    validate_file_size,
    validate_magic_bytes,
    MAX_UPLOAD_BYTES,
)

client = TestClient(app)


# ── Video Validation Tests ─────────────────────────────────────────────────

class TestVideoValidation:
    def test_valid_extension_mp4(self):
        assert validate_extension("video.mp4") == ".mp4"

    def test_valid_extension_mov(self):
        assert validate_extension("clip.MOV") == ".mov"

    def test_valid_extension_avi(self):
        assert validate_extension("test.avi") == ".avi"

    def test_invalid_extension_exe(self):
        with pytest.raises(VideoValidationError) as exc:
            validate_extension("malware.exe")
        assert "Unsupported" in str(exc.value)

    def test_invalid_extension_py(self):
        with pytest.raises(VideoValidationError):
            validate_extension("script.py")

    def test_empty_filename(self):
        with pytest.raises(VideoValidationError):
            validate_extension("")

    def test_file_size_zero(self):
        with pytest.raises(VideoValidationError) as exc:
            validate_file_size(0)
        assert "empty" in str(exc.value).lower()

    def test_file_size_over_limit(self):
        with pytest.raises(VideoValidationError) as exc:
            validate_file_size(MAX_UPLOAD_BYTES + 1)
        assert "exceeds" in str(exc.value).lower()
        assert exc.value.http_status == 413

    def test_file_size_exactly_at_limit(self):
        # Should not raise
        validate_file_size(MAX_UPLOAD_BYTES)

    def test_magic_bytes_mp4(self):
        # Construct minimal MP4-like header: 4 bytes box size + "ftyp"
        data = b"\x00\x00\x00\x20ftypisom" + b"\x00" * 20
        result = validate_magic_bytes(data, ".mp4")
        assert "video" in result

    def test_magic_bytes_avi(self):
        data = b"RIFF\x00\x00\x00\x00AVI " + b"\x00" * 20
        result = validate_magic_bytes(data, ".avi")
        assert "avi" in result.lower()

    def test_magic_bytes_invalid(self):
        data = b"PK\x03\x04" + b"\x00" * 20  # ZIP file signature
        with pytest.raises(VideoValidationError) as exc:
            validate_magic_bytes(data, ".mp4")
        assert "magic" in str(exc.value).lower() or "supported" in str(exc.value).lower()

    def test_magic_bytes_too_short(self):
        with pytest.raises(VideoValidationError):
            validate_magic_bytes(b"\x00\x01\x02", ".mp4")


# ── Score Classification Tests ─────────────────────────────────────────────

class TestScoreClassification:
    def test_clearly_real(self):
        assert classify_score(0.1) == DeepfakeClassification.likely_real

    def test_clearly_manipulated(self):
        assert classify_score(0.9) == DeepfakeClassification.likely_manipulated

    def test_inconclusive_center(self):
        assert classify_score(0.5) == DeepfakeClassification.inconclusive

    def test_inconclusive_lower_band(self):
        assert classify_score(0.41) == DeepfakeClassification.inconclusive

    def test_inconclusive_upper_band(self):
        assert classify_score(0.59) == DeepfakeClassification.inconclusive

    def test_boundary_real(self):
        assert classify_score(0.39) == DeepfakeClassification.likely_real

    def test_boundary_manipulated(self):
        assert classify_score(0.61) == DeepfakeClassification.likely_manipulated

    def test_zero_score(self):
        assert classify_score(0.0) == DeepfakeClassification.likely_real

    def test_one_score(self):
        assert classify_score(1.0) == DeepfakeClassification.likely_manipulated


# ── Model Health Endpoint Tests ────────────────────────────────────────────

class TestDeepfakeHealthEndpoint:
    def test_health_endpoint_returns_200(self):
        resp = client.get("/api/deepfake/health")
        assert resp.status_code == 200

    def test_health_response_has_required_fields(self):
        resp = client.get("/api/deepfake/health")
        data = resp.json()
        assert "init_status" in data
        assert "detector_name" in data
        assert "checkpoint_available" in data
        assert "dependencies_available" in data

    def test_model_endpoint_alias(self):
        resp = client.get("/api/deepfake/model")
        assert resp.status_code == 200


# ── Analyze Endpoint Tests ─────────────────────────────────────────────────

def _make_mp4_bytes(size: int = 100) -> bytes:
    """Create a minimal valid-looking MP4 header."""
    header = b"\x00\x00\x00\x20ftypisom\x00\x00\x00\x00isomiso2avc1mp41"
    return header + b"\x00" * (size - len(header))


class TestAnalyzeEndpoint:
    def test_empty_file_rejected(self):
        resp = client.post(
            "/api/deepfake/analyze",
            files={"file": ("empty.mp4", b"", "video/mp4")},
        )
        assert resp.status_code in (400, 413, 422)

    def test_unsupported_extension_rejected(self):
        resp = client.post(
            "/api/deepfake/analyze",
            files={"file": ("script.exe", b"MZ\x00\x00", "application/octet-stream")},
        )
        assert resp.status_code == 400
        assert "Unsupported" in resp.json().get("detail", "")

    def test_unsupported_extension_py_rejected(self):
        resp = client.post(
            "/api/deepfake/analyze",
            files={"file": ("exploit.py", b"print('hi')", "text/plain")},
        )
        assert resp.status_code == 400

    def test_invalid_magic_bytes_rejected(self):
        zip_header = b"PK\x03\x04" + b"\x00" * 60
        resp = client.post(
            "/api/deepfake/analyze",
            files={"file": ("fake.mp4", zip_header, "video/mp4")},
        )
        assert resp.status_code == 400

    def test_missing_model_returns_failed_status(self):
        """When model weights are missing, inference must return a failed status — never fake predictions."""
        mp4_data = _make_mp4_bytes(200)
        with patch("app.api.routes.deepfake.run_inference") as mock_infer, \
             patch("app.api.routes.deepfake.save_upload_to_temp") as mock_save, \
             patch("app.api.routes.deepfake.validate_video_with_cv2") as mock_cv2, \
             patch("app.api.routes.deepfake.cleanup_temp_file"):
            mock_save.return_value = "/tmp/fake_upload.mp4"
            mock_cv2.return_value = (10.0, 640, 480, 250)
            mock_infer.return_value = DeepfakeScanResult(
                scan_id="test-scan-1",
                status=DeepfakeStatus.failed,
                error_message="Checkpoint not found",
                warnings=["Model weights missing"],
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )

            resp = client.post(
                "/api/deepfake/analyze",
                files={"file": ("video.mp4", mp4_data, "video/mp4")},
            )

        # Must return a result with failed status, not fabricate a prediction
        assert resp.status_code in (200, 202)
        data = resp.json()
        assert data["status"] == "failed"
        assert data.get("classification") is None
        assert data.get("score") is None

    def test_successful_inference_mocked(self):
        """Verify response schema when inference succeeds."""
        mp4_data = _make_mp4_bytes(200)
        with patch("app.api.routes.deepfake.run_inference") as mock_infer, \
             patch("app.api.routes.deepfake.save_upload_to_temp") as mock_save, \
             patch("app.api.routes.deepfake.validate_video_with_cv2") as mock_cv2, \
             patch("app.api.routes.deepfake.cleanup_temp_file"):
            mock_save.return_value = "/tmp/test_video.mp4"
            mock_cv2.return_value = (5.0, 640, 480, 150)
            mock_infer.return_value = DeepfakeScanResult(
                scan_id="test-scan-2",
                status=DeepfakeStatus.completed,
                classification=DeepfakeClassification.likely_real,
                score=0.12,
                inference_device="cuda:0",
                frames_processed=150,
                clips_processed=4,
                processing_duration_ms=3500.0,
                video_duration_seconds=5.0,
                created_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
                warnings=["Automated deepfake detection is probabilistic."],
            )

            resp = client.post(
                "/api/deepfake/analyze",
                files={"file": ("real_video.mp4", mp4_data, "video/mp4")},
            )

        assert resp.status_code in (200, 202)
        data = resp.json()
        assert data["scan_id"] == "test-scan-2"
        assert data["status"] == "completed"
        assert data["classification"] == "likely_real"
        assert data["score"] == 0.12
        assert data["frames_processed"] == 150


# ── Scan History Endpoint Tests ────────────────────────────────────────────

class TestScanHistoryEndpoint:
    def test_list_scans_returns_200(self):
        with patch("app.api.routes.deepfake.deepfake_repository.list_scans", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([], 0)
            resp = client.get("/api/deepfake/scans")
        assert resp.status_code == 200

    def test_list_scans_response_schema(self):
        with patch("app.api.routes.deepfake.deepfake_repository.list_scans", new_callable=AsyncMock) as mock_list:
            mock_list.return_value = ([], 0)
            resp = client.get("/api/deepfake/scans")
        data = resp.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "total_pages" in data

    def test_get_nonexistent_scan(self):
        with patch("app.api.routes.deepfake.deepfake_repository.get_scan", new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None
            resp = client.get("/api/deepfake/scans/nonexistent-id")
        assert resp.status_code == 404

    def test_delete_nonexistent_scan(self):
        with patch("app.api.routes.deepfake.deepfake_repository.delete_scan", new_callable=AsyncMock) as mock_del:
            mock_del.return_value = False
            resp = client.delete("/api/deepfake/scans/nonexistent-id")
        assert resp.status_code == 404

    def test_delete_existing_scan(self):
        with patch("app.api.routes.deepfake.deepfake_repository.delete_scan", new_callable=AsyncMock) as mock_del:
            mock_del.return_value = True
            resp = client.delete("/api/deepfake/scans/some-valid-id")
        assert resp.status_code == 200
        assert resp.json()["deleted"] is True

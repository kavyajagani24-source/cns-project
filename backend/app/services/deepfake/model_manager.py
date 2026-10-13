"""
PwTF-DVD model manager.
Loads the official PwTF-DVD deepfake detector once per process.
Uses CUDA if available (GPU required for the official model).
"""
from __future__ import annotations

import sys
import os
import time
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Optional

from app.core.logging_config import get_logger
from app.services.deepfake.schemas import ModelInitStatus, DeepfakeModelHealth

logger = get_logger(__name__)

# Path to the official checkpoint (relative to backend/ root)
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent.parent
_CHECKPOINT_PATH = _BACKEND_DIR / "models" / "deepfake" / "pwtf_dvd" / "for_deploy_model3.pth"

# PwTF-DVD inference module path
_PWTF_INFERENCE_DIR = _BACKEND_DIR.parent / "third_party" / "PwTF-DVD" / "inference"

_MODEL_VERSION = "ICCV2025-deploy3"


class ModelManager:
    """
    Singleton that owns the PwTF-DVD model lifecycle.
    Thread-safe: uses a Lock for initialization.
    """

    _instance: Optional["ModelManager"] = None
    _lock: Lock = Lock()

    def __new__(cls) -> "ModelManager":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
                cls._instance._model = None
                cls._instance._device = None
                cls._instance._status = ModelInitStatus.unavailable
                cls._instance._error_detail: Optional[str] = None
                cls._instance._last_inference: Optional[datetime] = None
                cls._instance._deps_ok: bool = False
                cls._instance._init_lock: Lock = Lock()
        return cls._instance

    # ── Public API ──────────────────────────────────────────────────────────

    def get_status(self) -> ModelInitStatus:
        return self._status

    def _check_deps(self) -> bool:
        try:
            import torch  # type: ignore
            import matplotlib  # type: ignore
            import filterpy  # type: ignore
            import cv2  # type: ignore
            import PIL  # type: ignore
            import einops  # type: ignore
            self._deps_ok = True
            return True
        except ImportError:
            self._deps_ok = False
            return False

    def get_health(self) -> DeepfakeModelHealth:
        deps_ok = self._check_deps()
        ckpt_ok = _CHECKPOINT_PATH.exists()
        return DeepfakeModelHealth(
            init_status=self._status,
            checkpoint_available=ckpt_ok,
            checkpoint_path=str(_CHECKPOINT_PATH) if ckpt_ok else None,
            dependencies_available=deps_ok,
            device=str(self._device) if self._device else None,
            model_version=_MODEL_VERSION,
            last_successful_inference=self._last_inference,
            error_detail=self._error_detail,
        )

    def ensure_loaded(self) -> bool:
        """
        Try to load the model if not already loaded.
        Returns True if model is ready.
        """
        if self._status == ModelInitStatus.ready:
            return True
        with self._init_lock:
            if self._status == ModelInitStatus.ready:
                return True
            return self._do_load()

    def get_model(self):
        """Return (model, device) or raise RuntimeError if not ready."""
        if self._status != ModelInitStatus.ready or self._model is None:
            raise RuntimeError(
                f"PwTF-DVD model is not ready. Status: {self._status.value}. "
                f"Details: {self._error_detail or 'see health endpoint'}"
            )
        return self._model, self._device

    def record_successful_inference(self) -> None:
        self._last_inference = datetime.utcnow()

    # ── Internal ────────────────────────────────────────────────────────────

    def _do_load(self) -> bool:
        self._status = ModelInitStatus.initializing
        logger.info("Initializing PwTF-DVD model...")

        # 1. Check PyTorch
        try:
            import torch
            self._deps_ok = True
        except ImportError as exc:
            self._status = ModelInitStatus.dependencies_missing
            self._error_detail = (
                "PyTorch is not installed. "
                "Run: uv add torch torchvision --default-index https://download.pytorch.org/whl/cu121 "
                "--index https://pypi.org/simple/ --index-strategy unsafe-best-match"
            )
            logger.error("PyTorch missing: %s", exc)
            return False

        # 2. Check checkpoint
        if not _CHECKPOINT_PATH.exists():
            self._status = ModelInitStatus.weights_missing
            self._error_detail = (
                f"Checkpoint not found at: {_CHECKPOINT_PATH}. "
                "Download from: https://drive.google.com/file/d/10D74h8NhpZ2Ut3Te_ieTIAZYOTL6mNQd/view "
                "and place at models/deepfake/pwtf_dvd/for_deploy_model3.pth"
            )
            logger.warning("PwTF-DVD checkpoint missing: %s", _CHECKPOINT_PATH)
            return False

        # 3. Add PwTF-DVD inference directory to sys.path
        inference_dir = str(_PWTF_INFERENCE_DIR)
        if inference_dir not in sys.path:
            sys.path.insert(0, inference_dir)

        # 4. Load model
        try:
            import torch
            from model.framework import get_model  # type: ignore  # PwTF-DVD model

            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            logger.info("Loading PwTF-DVD on device: %s", device)

            model = get_model()
            state = torch.load(str(_CHECKPOINT_PATH), map_location="cpu", weights_only=False)
            model.load_state_dict(state)
            model.eval()
            model.to(device)

            self._model = model
            self._device = device
            self._status = ModelInitStatus.ready
            self._error_detail = None
            logger.info("PwTF-DVD model loaded successfully on %s", device)
            return True

        except Exception as exc:
            self._status = ModelInitStatus.error
            self._error_detail = f"Model load failed: {type(exc).__name__}: {exc}"
            logger.exception("Failed to load PwTF-DVD model")
            return False


# Module-level singleton accessor
def get_model_manager() -> ModelManager:
    return ModelManager()

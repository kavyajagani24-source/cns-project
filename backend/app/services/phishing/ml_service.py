"""
ML Phishing Service — loads a trained scikit-learn model and runs inference.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.schemas.scan_schemas import MLModelResult

logger = logging.getLogger(__name__)


class PhishingMLService:
    """Loads and runs the phishing classifier."""

    MODEL_NAME = "phishing_url_classifier"

    def __init__(self) -> None:
        self._settings = get_settings()
        self._model = None
        self._vectorizer = None
        self._metadata: dict = {}
        self._available = False
        self._error: Optional[str] = None
        self._last_check: Optional[datetime] = None
        self._load()

    def _load(self) -> None:
        path = Path(self._settings.phishing_model_path)
        self._last_check = datetime.now(timezone.utc)
        if not path.exists():
            self._error = f"Model artifact not found at {path}"
            logger.warning(self._error)
            return
        try:
            import joblib
            artifact = joblib.load(path)
            self._model = artifact["model"]
            self._vectorizer = artifact["vectorizer"]
            self._metadata = artifact.get("metadata", {})
            self._available = True
            self._error = None
            logger.info(
                "Loaded phishing model version=%s from %s",
                self._metadata.get("model_version", "unknown"),
                path,
            )
        except Exception as exc:
            self._error = f"Failed to load model: {type(exc).__name__}: {exc}"
            logger.error(self._error)

    def predict(self, url: str) -> MLModelResult:
        if not self._available or self._model is None:
            return MLModelResult(
                available=False,
                error=self._error or "Model not loaded",
                model_name=self.MODEL_NAME,
            )
        try:
            X = self._vectorizer.transform([url])
            pred = self._model.predict(X)[0]
            prediction = "phishing" if pred == 1 else "legitimate"

            result = MLModelResult(
                available=True,
                prediction=prediction,
                model_version=self._metadata.get("model_version"),
                model_name=self.MODEL_NAME,
            )
            if hasattr(self._model, "predict_proba"):
                proba = self._model.predict_proba(X)[0]
                # Index 1 = phishing probability
                classes = list(self._model.classes_)
                phish_idx = classes.index(1) if 1 in classes else 1
                result.probability_phishing = round(float(proba[phish_idx]), 4)
                result.model_score = result.probability_phishing
            return result
        except Exception as exc:
            logger.error("Inference error: %s", exc)
            return MLModelResult(
                available=False,
                error=f"Inference error: {type(exc).__name__}",
                model_name=self.MODEL_NAME,
            )

    def health(self) -> dict:
        return {
            "model_name": self.MODEL_NAME,
            "available": self._available,
            "version": self._metadata.get("model_version"),
            "model_type": self._metadata.get("model_type"),
            "artifact_path": self._settings.phishing_model_path,
            "last_check": self._last_check,
            "error": self._error,
            "feature_schema_version": self._metadata.get("feature_schema_version"),
            "training_samples": self._metadata.get("training_samples"),
        }


_ml_service: Optional[PhishingMLService] = None


def get_ml_service() -> PhishingMLService:
    global _ml_service
    if _ml_service is None:
        _ml_service = PhishingMLService()
    return _ml_service

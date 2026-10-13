"""Deepfake detector interface — placeholder for Part 2 integration.

In Part 2, integrate: https://github.com/rama0126/PwTF-DVD
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FrameFinding:
    frame_index: int
    timestamp_seconds: Optional[float]
    score: float
    label: str  # "real" | "fake"


@dataclass
class DeepfakeDetectionResult:
    scan_id: str
    status: str  # "pending" | "running" | "completed" | "failed" | "not_implemented"
    detector_name: str
    model_version: Optional[str]
    overall_classification: Optional[str]  # "real" | "fake" | "inconclusive"
    model_score: Optional[float]
    frame_findings: list[FrameFinding] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    error: Optional[str] = None


class DeepfakeDetector(ABC):
    """Abstract base class — implement in Part 2."""

    @abstractmethod
    def predict_video(self, video_path: str) -> DeepfakeDetectionResult:
        raise NotImplementedError


class NotImplementedDeepfakeDetector(DeepfakeDetector):
    """Placeholder — always returns not_implemented status."""

    def predict_video(self, video_path: str) -> DeepfakeDetectionResult:
        import uuid
        return DeepfakeDetectionResult(
            scan_id=str(uuid.uuid4()),
            status="not_implemented",
            detector_name="PwTF-DVD (Coming in Part 2)",
            model_version=None,
            overall_classification=None,
            model_score=None,
            warnings=["Deepfake detection will be implemented in Part 2."],
        )

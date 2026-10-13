"""
Deepfake detection schemas — typed result models.
"""
from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class DeepfakeStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class DeepfakeClassification(str, Enum):
    likely_real = "likely_real"
    likely_manipulated = "likely_manipulated"
    inconclusive = "inconclusive"


class ModelInitStatus(str, Enum):
    ready = "ready"
    weights_missing = "weights_missing"
    dependencies_missing = "dependencies_missing"
    initializing = "initializing"
    error = "error"
    unavailable = "unavailable"


class DeepfakeFinding(BaseModel):
    label: str
    value: str
    detail: Optional[str] = None


class DeepfakeScanResult(BaseModel):
    scan_id: str
    status: DeepfakeStatus
    classification: Optional[DeepfakeClassification] = None
    # score: sigmoid(logit) → 0=real, 1=manipulated
    score: Optional[float] = None
    confidence_score: Optional[float] = None
    primary_reason: Optional[str] = None
    score_type: str = "sigmoid_probability"  # output is F.sigmoid(logit)
    score_interpretation: str = "0=likely real, 1=likely manipulated"
    model_name: str = "PwTF-DVD"
    model_version: Optional[str] = None
    inference_device: Optional[str] = None
    processing_duration_ms: Optional[float] = None
    video_duration_seconds: Optional[float] = None
    frames_processed: Optional[int] = None
    clips_processed: Optional[int] = None
    findings: List[DeepfakeFinding] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DeepfakeModelHealth(BaseModel):
    detector_name: str = "PwTF-DVD"
    init_status: ModelInitStatus
    checkpoint_available: bool = False
    checkpoint_path: Optional[str] = None
    dependencies_available: bool = False
    device: Optional[str] = None
    model_version: Optional[str] = None
    last_successful_inference: Optional[datetime] = None
    error_detail: Optional[str] = None
    paper: str = "Beyond Spatial Frequency: Pixel-wise Temporal Frequency-based Deepfake Video Detection (ICCV 2025)"
    license: str = "MIT"
    attribution: str = "Copyright (c) 2025 TAEHOON KIM"
    setup_instructions: str = (
        "1. Download weights from: https://drive.google.com/file/d/10D74h8NhpZ2Ut3Te_ieTIAZYOTL6mNQd/view\n"
        "2. Place at: models/deepfake/pwtf_dvd/for_deploy_model3.pth\n"
        "3. Install PyTorch: uv add torch torchvision\n"
        "4. Restart backend"
    )


class DeepfakeScanSummary(BaseModel):
    scan_id: str
    status: DeepfakeStatus
    classification: Optional[DeepfakeClassification] = None
    score: Optional[float] = None
    model_name: str = "PwTF-DVD"
    video_duration_seconds: Optional[float] = None
    frames_processed: Optional[int] = None
    processing_duration_ms: Optional[float] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class DeepfakePaginatedScans(BaseModel):
    items: List[DeepfakeScanSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


class AnalyzeVideoRequest(BaseModel):
    pass  # multipart handled in route


MANIPULATED_THRESHOLD = 0.5  # score >= 0.5 → likely_manipulated
INCONCLUSIVE_BAND = 0.10     # [0.45, 0.55] → inconclusive

def classify_score(score: float) -> DeepfakeClassification:
    """
    Apply documented decision rule to sigmoid output.
    Score ∈ [0,1]: 0=real, 1=manipulated.
    """
    if score >= (MANIPULATED_THRESHOLD + INCONCLUSIVE_BAND):
        return DeepfakeClassification.likely_manipulated
    if score <= (MANIPULATED_THRESHOLD - INCONCLUSIVE_BAND):
        return DeepfakeClassification.likely_real
    return DeepfakeClassification.inconclusive

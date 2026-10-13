"""Pydantic schemas for API requests and responses."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, HttpUrl, field_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class RiskCategory(str, Enum):
    PHISHING = "phishing"
    SUSPICIOUS = "suspicious"
    SAFE = "safe"
    INCONCLUSIVE = "inconclusive"


class ScanStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TLSStatus(str, Enum):
    VALID = "valid"
    INVALID = "invalid"
    UNAVAILABLE = "unavailable"
    NOT_APPLICABLE = "not_applicable"


class ThreatIntelSyncStatus(str, Enum):
    SYNCED = "synced"
    SYNCING = "syncing"
    FAILED = "failed"
    NEVER_SYNCED = "never_synced"
    STALE = "stale"


# ---------------------------------------------------------------------------
# URL Scan Request
# ---------------------------------------------------------------------------

class URLScanRequest(BaseModel):
    url: str = Field(..., min_length=4, max_length=2048, description="URL to analyze")

    @field_validator("url")
    @classmethod
    def validate_url_format(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v


# ---------------------------------------------------------------------------
# DNS Findings
# ---------------------------------------------------------------------------

class DNSFindings(BaseModel):
    hostname: Optional[str] = None
    a_records: list[str] = Field(default_factory=list)
    aaaa_records: list[str] = Field(default_factory=list)
    mx_records: list[str] = Field(default_factory=list)
    ns_records: list[str] = Field(default_factory=list)
    cname: Optional[str] = None
    resolution_successful: Optional[bool] = None
    lookup_latency_ms: Optional[float] = None
    error: Optional[str] = None
    available: bool = True


# ---------------------------------------------------------------------------
# Domain Registration
# ---------------------------------------------------------------------------

class DomainRegistrationInfo(BaseModel):
    domain: Optional[str] = None
    creation_date: Optional[datetime] = None
    domain_age_days: Optional[int] = None
    registrar: Optional[str] = None
    data_source: Optional[str] = None
    lookup_timestamp: Optional[datetime] = None
    available: bool = False
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# TLS Findings
# ---------------------------------------------------------------------------

class TLSFindings(BaseModel):
    hostname: Optional[str] = None
    status: TLSStatus = TLSStatus.UNAVAILABLE
    is_valid: Optional[bool] = None
    subject_cn: Optional[str] = None
    issuer: Optional[str] = None
    not_before: Optional[datetime] = None
    not_after: Optional[datetime] = None
    days_until_expiry: Optional[int] = None
    hostname_matches: Optional[bool] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# ML Model Result
# ---------------------------------------------------------------------------

class MLModelResult(BaseModel):
    available: bool = False
    prediction: Optional[str] = None  # "phishing" | "legitimate"
    model_score: Optional[float] = None
    probability_phishing: Optional[float] = None
    model_version: Optional[str] = None
    model_name: Optional[str] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Threat Intelligence Result
# ---------------------------------------------------------------------------

class ThreatIntelResult(BaseModel):
    checked: bool = False
    matched: bool = False
    matched_entry: Optional[str] = None
    source_name: Optional[str] = None
    source_url: Optional[str] = None
    list_version: Optional[str] = None
    entry_count: Optional[int] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# URL Features
# ---------------------------------------------------------------------------

class URLFeatures(BaseModel):
    url_length: int = 0
    hostname_length: int = 0
    path_length: int = 0
    num_subdomains: int = 0
    num_dots: int = 0
    num_hyphens: int = 0
    num_digits: int = 0
    num_special_chars: int = 0
    is_ip_address: bool = False
    uses_https: bool = False
    has_at_sign: bool = False
    num_query_params: int = 0
    num_path_segments: int = 0
    has_suspicious_tokens: bool = False
    has_encoded_chars: bool = False
    has_punycode: bool = False
    has_misleading_hostname: bool = False
    has_double_slash_redirect: bool = False


# ---------------------------------------------------------------------------
# Scan Result (comprehensive)
# ---------------------------------------------------------------------------

class ScanResult(BaseModel):
    scan_id: str
    scan_type: str = "url"
    status: ScanStatus = ScanStatus.PENDING
    risk_category: Optional[RiskCategory] = None
    normalized_hostname: Optional[str] = None
    url_features: Optional[URLFeatures] = None
    ml_result: Optional[MLModelResult] = None
    threat_intel_result: Optional[ThreatIntelResult] = None
    dns_findings: Optional[DNSFindings] = None
    domain_registration: Optional[DomainRegistrationInfo] = None
    tls_findings: Optional[TLSFindings] = None
    key_evidence: list[str] = Field(default_factory=list)
    missing_data: list[str] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    explanations: list[str] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    processing_duration_ms: Optional[float] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Scan History
# ---------------------------------------------------------------------------

class ScanSummary(BaseModel):
    scan_id: str
    status: ScanStatus
    risk_category: Optional[RiskCategory] = None
    normalized_hostname: Optional[str] = None
    created_at: Optional[datetime] = None
    processing_duration_ms: Optional[float] = None
    threat_intel_matched: bool = False
    ml_score: Optional[float] = None


class PaginatedScans(BaseModel):
    items: list[ScanSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Dashboard Stats
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_scans: int = 0
    phishing_count: int = 0
    suspicious_count: int = 0
    safe_count: int = 0
    inconclusive_count: int = 0
    threat_intel_matches: int = 0
    recent_scans: list[ScanSummary] = Field(default_factory=list)
    model_available: bool = False
    model_version: Optional[str] = None
    threat_intel_status: Optional[str] = None
    threat_intel_entry_count: Optional[int] = None
    threat_intel_last_updated: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Health Schemas
# ---------------------------------------------------------------------------

class HealthStatus(BaseModel):
    status: str  # "healthy" | "degraded" | "unhealthy"
    database: str
    timestamp: datetime
    version: str


class ModelHealthStatus(BaseModel):
    model_name: str
    available: bool
    version: Optional[str] = None
    model_type: Optional[str] = None
    artifact_path: Optional[str] = None
    last_check: Optional[datetime] = None
    error: Optional[str] = None


class ThreatIntelHealthStatus(BaseModel):
    source_name: str
    source_url: str
    sync_status: ThreatIntelSyncStatus
    last_attempted: Optional[datetime] = None
    last_successful: Optional[datetime] = None
    entry_count: Optional[int] = None
    content_hash: Optional[str] = None
    in_memory_count: Optional[int] = None
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Threat Intel Sync Response
# ---------------------------------------------------------------------------

class SyncResponse(BaseModel):
    success: bool
    message: str
    entry_count: Optional[int] = None
    content_hash: Optional[str] = None
    duration_seconds: Optional[float] = None


# ---------------------------------------------------------------------------
# Generic error
# ---------------------------------------------------------------------------

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None

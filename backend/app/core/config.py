"""Application configuration loaded from environment variables or .env file."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "CyberShield AI"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # API Server
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    # CORS — comma-separated list of allowed origins
    frontend_origin: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origin.split(",") if o.strip()]

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "cybershield_ai"

    # HaGeZi Threat Intelligence
    hagezi_sync_enabled: bool = False
    hagezi_update_interval_hours: int = 24
    hagezi_tif_url: str = (
        "https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/tif-onlydomains.txt"
    )
    hagezi_tif_medium_url: str = (
        "https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/tif.medium-onlydomains.txt"
    )
    # Use medium list by default (smaller, still highly effective)
    hagezi_active_list: str = "tif_medium"
    hagezi_max_response_bytes: int = 50 * 1024 * 1024  # 50 MB
    hagezi_request_timeout_seconds: int = 60

    # ML Model
    phishing_model_path: str = str(BASE_DIR / "artifacts" / "phishing_model.joblib")
    phishing_dataset_path: str = str(BASE_DIR / "datasets" / "phishing_urls.csv")

    # Deepfake detection
    deepfake_checkpoint_path: str = str(
        BASE_DIR / "models" / "deepfake" / "pwtf_dvd" / "for_deploy_model3.pth"
    )
    deepfake_max_upload_mb: int = 100
    deepfake_max_duration_seconds: int = 300
    deepfake_inference_timeout_seconds: int = 600

    # Security
    max_url_length: int = 2048
    max_scan_history_days: int = 90
    rate_limit_per_minute: int = 30

    @property
    def hagezi_active_url(self) -> str:
        if self.hagezi_active_list == "tif":
            return self.hagezi_tif_url
        return self.hagezi_tif_medium_url


@lru_cache
def get_settings() -> Settings:
    return Settings()

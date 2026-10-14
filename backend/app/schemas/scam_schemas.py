from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

class ScamRequest(BaseModel):
    text: str = Field(min_length=10, max_length=20000)
    source_type: Literal["sms", "email", "call", "chat", "other"] = "sms"
    save_history: bool = False

class ScamIndicator(BaseModel):
    code: str
    label: str
    start: int
    end: int
    excerpt: str
    weight: int
    category: str
    explanation: str

class ScamResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scan_id: str
    created_at: datetime
    source_type: str
    risk_score: int = Field(ge=0, le=100)
    rule_score: int = Field(ge=0, le=100)
    ml_score: float | None = None
    ml_status: str
    risk_level: str
    scam_type: str
    indicators: list[ScamIndicator]
    mitigation_steps: list[str]
    disclaimer: str
    stored: bool = False

class ScamHistory(BaseModel):
    items: list[ScamResult]
    total: int
    page: int
    page_size: int

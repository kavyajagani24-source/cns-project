"""Deterministic evidence-first scam analysis and optional learned text scoring."""
from __future__ import annotations
import re
from functools import lru_cache
from pathlib import Path
from typing import Any
from .patterns import RULES, MITIGATIONS

MODEL_PATH = Path(__file__).resolve().parents[3] / "artifacts" / "scam_text_model.joblib"

@lru_cache(maxsize=1)
def _load_model():
    if not MODEL_PATH.is_file():
        return None
    try:
        import joblib
        return joblib.load(MODEL_PATH)
    except Exception:
        return None

def analyze_text(text: str) -> dict[str, Any]:
    hits = []
    for rule in RULES:
        for match in list(re.finditer(rule.expression, text, flags=re.IGNORECASE))[:8]:
            hits.append({"code": rule.code, "label": rule.label, "start": match.start(), "end": match.end(), "excerpt": match.group(), "weight": rule.weight, "category": rule.category, "explanation": rule.explanation})
    # One weight per distinct rule, plus interaction bonuses to reduce isolated-keyword false alarms.
    codes = {hit["code"] for hit in hits}
    score = sum(rule.weight for rule in RULES if rule.code in codes)
    if ("remote_tool" in codes and "remote_instruction" in codes): score += 20
    if ("otp" in codes or "password" in codes) and ("authority_bank" in codes or "account_lock" in codes): score += 18
    if "threat" in codes and ("authority_government" in codes or "urgency" in codes): score += 15
    if ("gift_cards" in codes or "crypto" in codes or "transfer" in codes) and ("threat" in codes or "urgency" in codes): score += 17
    rule_score = min(100, score)
    model = _load_model()
    ml_score = None
    if model is not None:
        try:
            ml_score = round(float(model.predict_proba([text])[0][1]) * 100, 1)
        except Exception:
            ml_score = None
    # No trained artifact = never imply that ML ran.
    risk_score = round(0.7 * rule_score + 0.3 * ml_score) if ml_score is not None else rule_score
    risk_level = "high" if risk_score >= 65 else "moderate" if risk_score >= 30 else "low"
    category_totals = {}
    for rule in RULES:
        if rule.code in codes:
            category_totals[rule.category] = category_totals.get(rule.category, 0) + rule.weight
    category = max(category_totals, key=category_totals.get) if category_totals else "Unclassified"
    # Choose the concrete scam scenario over generic pressure signals.
    if "authority_government" in codes and "threat" in codes:
        category = "Government impersonation"
    elif "remote_tool" in codes and "remote_instruction" in codes:
        category = "Tech support"
    elif "otp" in codes and ("authority_bank" in codes or "account_lock" in codes):
        category = "Banking / OTP"
    elif "gift_cards" in codes or "crypto" in codes:
        category = "Payment coercion"
    guidance = MITIGATIONS.get(category, MITIGATIONS["General social engineering"])
    if risk_level == "low":
        guidance = ["No strong scam indicators were detected; this does not prove the message is safe.", "Verify unexpected requests through official channels."]
    return {"risk_score": risk_score, "rule_score": rule_score, "ml_score": ml_score, "ml_status": "trained_model" if ml_score is not None else "not_trained", "risk_level": risk_level, "scam_type": category, "indicators": sorted(hits, key=lambda h: (h["start"], h["end"])), "mitigation_steps": guidance, "disclaimer": "Heuristic risk assessment, not proof of fraud or a calibrated probability. Do not share sensitive messages unless authorized."}

"""Scam rules and API tests; do not require MongoDB or GPU assets."""
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.routes.scam import router
from app.services.scam_analysis.engine import analyze_text

client = TestClient(FastAPI())
client.app.include_router(router)

def test_otp_bank_fraud():
    output = analyze_text("This is your bank fraud department. Share your verification code with us immediately or your account will be locked.")
    assert output["risk_level"] == "high"
    assert "otp" in {e["code"] for e in output["indicators"]}
    assert output["scam_type"] == "Banking / OTP"

def test_government_payment_threat():
    output = analyze_text("IRS officer: pay with gift cards immediately or we will issue a warrant for arrest. Do not tell anyone.")
    assert output["risk_score"] >= 65
    assert output["indicators"]

def test_remote_access_combination():
    output = analyze_text("Microsoft Support: install AnyDesk now and grant remote access to fix your laptop.")
    assert "remote_tool" in {e["code"] for e in output["indicators"]}
    assert output["risk_score"] >= 40

def test_benign_message():
    output = analyze_text("Hi, are you joining us for lunch on Saturday? We can meet at the cafe after class.")
    assert output["rule_score"] == 0
    assert output["risk_level"] == "low"

def test_context_word_alone():
    output = analyze_text("Our team uses AnyDesk during supervised technical training sessions.")
    assert output["rule_score"] < 30

def test_offsets():
    message = "Please share your OTP with us immediately."
    for evidence in analyze_text(message)["indicators"]:
        assert message[evidence["start"]:evidence["end"]] == evidence["excerpt"]

def test_api_analyze():
    response = client.post("/api/scam/analyze", json={"text": "Please share your OTP with us immediately", "source_type": "sms"})
    assert response.status_code == 200
    assert response.json()["stored"] is False
    assert response.json()["scan_id"]

def test_api_invalid():
    assert client.post("/api/scam/analyze", json={"text": "short"}).status_code == 422
    assert client.post("/api/scam/analyze", json={"text": "x" * 20001}).status_code == 422
    assert client.post("/api/scam/analyze", json={"text": "a valid sample message", "source_type": "audio"}).status_code == 422

"""
URL Scan Orchestrator — coordinates all analysis services.
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.schemas.scan_schemas import (
    DNSFindings,
    DomainRegistrationInfo,
    RiskCategory,
    ScanResult,
    ScanStatus,
    TLSFindings,
    URLFeatures,
)
from app.services.phishing.dns_analyzer import DNSAnalyzer
from app.services.phishing.domain_analyzer import DomainAnalyzer
from app.services.phishing.feature_extractor import extract_url_features
from app.services.phishing.ml_service import get_ml_service
from app.services.phishing.risk_engine import HybridRiskEngine
from app.services.phishing.tls_analyzer import TLSAnalyzer
from app.services.threat_intelligence.hagezi_service import get_threat_intel_service

logger = logging.getLogger(__name__)

_dns_analyzer = DNSAnalyzer()
_tls_analyzer = TLSAnalyzer()
_domain_analyzer = DomainAnalyzer()
_risk_engine = HybridRiskEngine()


async def analyze_url(url: str) -> ScanResult:
    scan_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc)
    start = time.monotonic()

    result = ScanResult(
        scan_id=scan_id,
        status=ScanStatus.RUNNING,
        created_at=created_at,
    )

    try:
        # 1. Parse URL and extract lexical features
        fv, parsed = extract_url_features(url)
        if not parsed.is_valid:
            result.status = ScanStatus.FAILED
            result.error = f"URL parsing failed: {parsed.error}"
            return result

        hostname = parsed.hostname
        result.normalized_hostname = hostname

        # Map FeatureVector to schema
        result.url_features = URLFeatures(
            url_length=fv.url_length,
            hostname_length=fv.hostname_length,
            path_length=fv.path_length,
            num_subdomains=fv.num_subdomains,
            num_dots=fv.num_dots,
            num_hyphens=fv.num_hyphens,
            num_digits=fv.num_digits,
            num_special_chars=fv.num_special_chars,
            is_ip_address=bool(fv.is_ip_address),
            uses_https=bool(fv.uses_https),
            has_at_sign=bool(fv.has_at_sign),
            num_query_params=fv.num_query_params,
            num_path_segments=fv.num_path_segments,
            has_suspicious_tokens=bool(fv.has_suspicious_tokens),
            has_encoded_chars=bool(fv.has_encoded_chars),
            has_punycode=bool(fv.has_punycode),
            has_misleading_hostname=bool(fv.has_misleading_hostname),
            has_double_slash_redirect=bool(fv.has_double_slash_redirect),
        )

        # 2. Threat intelligence check (synchronous, in-memory)
        ti_service = get_threat_intel_service()
        threat_intel = ti_service.check(hostname)
        result.threat_intel_result = threat_intel

        # 3. ML inference (synchronous CPU)
        ml_service = get_ml_service()
        ml_result = ml_service.predict(url)
        result.ml_result = ml_result

        # 4. Run async network checks in parallel
        # Skip TLS for HTTP URLs or IP addresses
        use_https = parsed.scheme == "https" and not parsed.is_ip_address

        dns_task = asyncio.create_task(_dns_analyzer.analyze(hostname))
        domain_task = asyncio.create_task(_domain_analyzer.analyze(hostname))
        tls_task = asyncio.create_task(
            _tls_analyzer.analyze(hostname, parsed.port or 443)
            if use_https
            else _noop_tls()
        )

        dns_result, domain_result, tls_result = await asyncio.gather(
            dns_task, domain_task, tls_task, return_exceptions=True
        )

        # Handle exceptions from gathered tasks gracefully
        result.dns_findings = _safe(dns_result, DNSFindings, "DNS analysis error")
        result.domain_registration = _safe(domain_result, DomainRegistrationInfo, "Domain lookup error")
        result.tls_findings = _safe(tls_result, TLSFindings, "TLS analysis error")

        # 5. Hybrid risk classification
        risk, evidence, explanations, missing, actions = _risk_engine.classify(
            ml_result=ml_result,
            threat_intel=threat_intel,
            dns=result.dns_findings,
            domain_reg=result.domain_registration,
            tls=result.tls_findings,
        )
        result.risk_category = risk
        result.key_evidence = evidence
        result.explanations = explanations
        result.missing_data = missing
        result.recommended_actions = actions
        result.status = ScanStatus.COMPLETED

    except Exception as exc:
        logger.exception("Unexpected error during URL analysis: %s", exc)
        result.status = ScanStatus.FAILED
        result.error = f"Internal analysis error: {type(exc).__name__}"

    finally:
        result.completed_at = datetime.now(timezone.utc)
        result.processing_duration_ms = round((time.monotonic() - start) * 1000, 2)

    return result


async def _noop_tls() -> TLSFindings:
    from app.schemas.scan_schemas import TLSStatus
    return TLSFindings(status=TLSStatus.NOT_APPLICABLE, error="HTTP URL — TLS not applicable")


def _safe(result, cls, error_prefix: str):
    if isinstance(result, Exception):
        logger.warning("%s: %s", error_prefix, result)
        return cls(error=f"{error_prefix}: {type(result).__name__}")
    return result

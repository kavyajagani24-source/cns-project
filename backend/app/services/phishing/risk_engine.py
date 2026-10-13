"""
Hybrid Risk Engine — combines evidence from all analysis sources.

Policy (transparent and configurable):
1. Threat-intel match  → PHISHING  (deterministic, highest priority)
2. ML prob ≥ 0.85     → PHISHING  (high-confidence ML)
3. TLS invalid + ML prob ≥ 0.65 → PHISHING
4. ML prob ≥ 0.65     → SUSPICIOUS
5. ML prob ≥ 0.40     → SUSPICIOUS (borderline)
6. ML unavailable + TLS invalid → SUSPICIOUS
7. ML prob < 0.40     → SAFE (per available checks)
8. ML unavailable + no TI match → INCONCLUSIVE
"""
from __future__ import annotations

import logging
from typing import Optional

from app.schemas.scan_schemas import (
    DNSFindings,
    DomainRegistrationInfo,
    MLModelResult,
    RiskCategory,
    ThreatIntelResult,
    TLSFindings,
    TLSStatus,
)

logger = logging.getLogger(__name__)


class HybridRiskEngine:
    def classify(
        self,
        ml_result: Optional[MLModelResult],
        threat_intel: Optional[ThreatIntelResult],
        dns: Optional[DNSFindings],
        domain_reg: Optional[DomainRegistrationInfo],
        tls: Optional[TLSFindings],
    ) -> tuple[RiskCategory, list[str], list[str], list[str], list[str]]:
        """
        Returns (risk_category, key_evidence, explanations, missing_data, recommended_actions).
        """
        evidence: list[str] = []
        explanations: list[str] = []
        missing: list[str] = []
        actions: list[str] = []

        ti_matched = threat_intel and threat_intel.matched and threat_intel.checked
        ml_available = ml_result and ml_result.available
        ml_prob = ml_result.probability_phishing if ml_available and ml_result.probability_phishing is not None else None
        tls_invalid = tls and tls.status == TLSStatus.INVALID
        tls_unavailable = tls is None or tls.status == TLSStatus.UNAVAILABLE
        dns_failed = dns and not dns.resolution_successful

        # --- Collect evidence ---
        if ti_matched:
            evidence.append(f"Hostname matched HaGeZi TIF blocklist entry: {threat_intel.matched_entry}")
            explanations.append(
                "This hostname appears on the HaGeZi Threat Intelligence Feeds blocklist, "
                "which aggregates known phishing, malware, and scam domains."
            )

        if ml_available and ml_prob is not None:
            pct = round(ml_prob * 100, 1)
            evidence.append(f"ML model score: {pct}% phishing probability (model: {ml_result.model_version})")
            if ml_prob >= 0.65:
                explanations.append(
                    "The URL contains structural and lexical features strongly associated with phishing "
                    "based on the trained classifier."
                )
            elif ml_prob >= 0.40:
                explanations.append(
                    "The URL contains some features associated with phishing, but the classifier is not "
                    "highly confident."
                )
            else:
                explanations.append(
                    "The URL's structural features did not trigger strong phishing signals in the classifier."
                )

        if tls_invalid and tls:
            evidence.append(f"TLS certificate issue: {tls.error or 'invalid certificate'}")
            explanations.append(
                "The TLS certificate is invalid or the hostname does not match the certificate. "
                "This does not prove phishing, but is an additional risk signal."
            )

        if tls_unavailable:
            missing.append("TLS certificate could not be inspected (connection unavailable or timed out)")

        if dns_failed:
            evidence.append("DNS resolution failed — hostname may not exist")
            explanations.append("The hostname did not resolve in DNS. This may indicate a deregistered or non-existent domain.")

        if domain_reg and not domain_reg.available:
            missing.append("Domain registration information unavailable (RDAP lookup failed or rate-limited)")
        elif domain_reg and domain_reg.domain_age_days is not None:
            if domain_reg.domain_age_days < 30:
                evidence.append(f"Domain registered only {domain_reg.domain_age_days} days ago")
                explanations.append(
                    f"The domain was registered approximately {domain_reg.domain_age_days} days ago. "
                    "Very recently registered domains are sometimes used in phishing campaigns, "
                    "though this alone is not conclusive."
                )

        if not ml_available:
            missing.append("ML model not loaded — classifier inference unavailable")

        if threat_intel and not threat_intel.checked:
            missing.append("Threat intelligence check was not performed")

        # --- Decision logic ---
        risk: RiskCategory

        if ti_matched:
            risk = RiskCategory.PHISHING
            actions = [
                "Do not visit this URL.",
                "If you received this link in a message, report it to your email/messaging provider.",
                "If you have already entered credentials, change your passwords immediately.",
                "Consider reporting to your national cybersecurity authority.",
            ]
        elif ml_available and ml_prob is not None and ml_prob >= 0.85:
            risk = RiskCategory.PHISHING
            actions = [
                "Do not visit this URL.",
                "Treat this URL as malicious until verified through an independent source.",
                "Report to your IT security team if received via work channels.",
            ]
        elif ml_available and ml_prob is not None and (ml_prob >= 0.65 or (ml_prob >= 0.50 and tls_invalid)):
            risk = RiskCategory.SUSPICIOUS
            actions = [
                "Exercise extreme caution — do not enter passwords or personal information.",
                "Verify the URL by contacting the organization through their official website directly.",
                "Do not click links in unsolicited messages.",
            ]
        elif ml_available and ml_prob is not None and ml_prob >= 0.40:
            risk = RiskCategory.SUSPICIOUS
            actions = [
                "Be cautious. Verify this URL through official channels before proceeding.",
                "Check the domain name carefully for slight misspellings.",
            ]
        elif (not ml_available) and tls_invalid:
            risk = RiskCategory.SUSPICIOUS
            actions = [
                "The ML classifier is unavailable and the certificate is invalid.",
                "Exercise caution and verify through official sources.",
            ]
        elif not ml_available and not ti_matched:
            risk = RiskCategory.INCONCLUSIVE
            actions = [
                "Analysis was limited because the ML model is not loaded.",
                "Train and load the ML model for a more complete assessment.",
                "Verify the URL independently through official sources.",
            ]
        elif ml_available and ml_prob is not None and ml_prob < 0.40:
            risk = RiskCategory.SAFE
            explanations.append(
                "No threat-intelligence match was found and the ML model did not flag this URL as phishing. "
                "However, 'safe' means the available checks did not detect threats — it is not a guarantee of safety."
            )
            actions = [
                "No immediate threats detected, but always exercise caution with unfamiliar URLs.",
                "Verify the domain name matches the expected organization.",
            ]
        else:
            risk = RiskCategory.INCONCLUSIVE
            actions = ["Insufficient evidence to classify. Verify through independent sources."]

        return risk, evidence, explanations, missing, actions

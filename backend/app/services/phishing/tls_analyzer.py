"""
TLS Certificate Analyzer — inspects TLS certificates for HTTPS hostnames.
"""
from __future__ import annotations

import asyncio
import logging
import socket
import ssl
from datetime import datetime, timezone
from typing import Optional

from app.schemas.scan_schemas import TLSFindings, TLSStatus

logger = logging.getLogger(__name__)

TLS_TIMEOUT = 8.0


class TLSAnalyzer:
    async def analyze(self, hostname: str, port: int = 443) -> TLSFindings:
        if not hostname or len(hostname) > 253:
            return TLSFindings(status=TLSStatus.NOT_APPLICABLE, error="Invalid hostname")

        findings = TLSFindings(hostname=hostname)
        try:
            findings = await asyncio.wait_for(
                self._do_tls_check(hostname, port),
                timeout=TLS_TIMEOUT,
            )
        except asyncio.TimeoutError:
            findings.status = TLSStatus.UNAVAILABLE
            findings.error = f"TLS connection timed out after {TLS_TIMEOUT}s"
        except Exception as exc:
            findings.status = TLSStatus.UNAVAILABLE
            findings.error = f"TLS check failed: {type(exc).__name__}"
        return findings

    async def _do_tls_check(self, hostname: str, port: int) -> TLSFindings:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._sync_tls_check, hostname, port)

    def _sync_tls_check(self, hostname: str, port: int) -> TLSFindings:
        findings = TLSFindings(hostname=hostname)
        ctx = ssl.create_default_context()
        try:
            with socket.create_connection((hostname, port), timeout=TLS_TIMEOUT) as sock:
                with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    findings = self._parse_cert(findings, cert, hostname)
                    findings.status = TLSStatus.VALID if findings.is_valid else TLSStatus.INVALID
        except ssl.CertificateError as exc:
            findings.status = TLSStatus.INVALID
            findings.is_valid = False
            findings.hostname_matches = False
            findings.error = f"Certificate error: {exc}"
        except ssl.SSLError as exc:
            findings.status = TLSStatus.INVALID
            findings.is_valid = False
            findings.error = f"SSL error: {exc}"
        except (OSError, socket.timeout) as exc:
            findings.status = TLSStatus.UNAVAILABLE
            findings.error = f"Connection failed: {type(exc).__name__}"
        return findings

    def _parse_cert(self, findings: TLSFindings, cert: dict, hostname: str) -> TLSFindings:
        now = datetime.now(timezone.utc)

        # Subject CN
        for field in cert.get("subject", []):
            for k, v in field:
                if k == "commonName":
                    findings.subject_cn = v

        # Issuer
        issuer_parts = []
        for field in cert.get("issuer", []):
            for k, v in field:
                if k in ("organizationName", "commonName"):
                    issuer_parts.append(v)
        findings.issuer = ", ".join(issuer_parts) if issuer_parts else None

        # Validity dates
        try:
            not_before_str = cert.get("notBefore")
            not_after_str = cert.get("notAfter")
            if not_before_str:
                findings.not_before = datetime.strptime(not_before_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            if not_after_str:
                findings.not_after = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            if findings.not_after:
                delta = findings.not_after - now
                findings.days_until_expiry = delta.days
        except Exception:
            pass

        # Hostname matching via SANs
        san_list = [v for (k, v) in cert.get("subjectAltName", []) if k == "DNS"]
        hostname_matches = False
        for san in san_list:
            if san.startswith("*."):
                # Wildcard: matches exactly one subdomain level
                wildcard_base = san[2:]
                parts = hostname.split(".")
                if len(parts) >= 2 and ".".join(parts[1:]) == wildcard_base:
                    hostname_matches = True
                    break
            elif san.lower() == hostname.lower():
                hostname_matches = True
                break
        if not san_list and findings.subject_cn:
            hostname_matches = findings.subject_cn.lower() == hostname.lower()
        findings.hostname_matches = hostname_matches

        # Overall validity
        expired = findings.not_after is not None and findings.not_after < now
        findings.is_valid = hostname_matches and not expired
        return findings

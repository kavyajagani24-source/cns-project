"""
DNS Analyzer — bounded, cached DNS lookups.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Optional

import dns.asyncresolver
import dns.exception

from app.schemas.scan_schemas import DNSFindings

logger = logging.getLogger(__name__)

DNS_TIMEOUT = 5.0
MAX_RECORDS_PER_TYPE = 20


class DNSAnalyzer:
    async def analyze(self, hostname: str) -> DNSFindings:
        if not hostname or len(hostname) > 253:
            return DNSFindings(available=False, error="Invalid hostname")

        start = time.monotonic()
        resolver = dns.asyncresolver.Resolver()
        resolver.timeout = DNS_TIMEOUT
        resolver.lifetime = DNS_TIMEOUT * 2

        findings = DNSFindings(hostname=hostname, available=True)

        async def _lookup(rdtype: str) -> list[str]:
            try:
                answer = await resolver.resolve(hostname, rdtype)
                return [r.to_text() for r in answer][:MAX_RECORDS_PER_TYPE]
            except Exception:
                return []

        results = await asyncio.gather(
            _lookup("A"), _lookup("AAAA"), _lookup("MX"), _lookup("NS"),
            return_exceptions=False,
        )
        findings.a_records = results[0]
        findings.aaaa_records = results[1]
        findings.mx_records = results[2]
        findings.ns_records = results[3]

        try:
            cname_answer = await resolver.resolve(hostname, "CNAME")
            findings.cname = cname_answer[0].to_text()
        except Exception:
            findings.cname = None

        findings.resolution_successful = bool(findings.a_records or findings.aaaa_records)
        findings.lookup_latency_ms = round((time.monotonic() - start) * 1000, 2)
        if not findings.resolution_successful and not findings.ns_records:
            findings.error = "DNS resolution returned no records"
        return findings

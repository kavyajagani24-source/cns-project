"""
HaGeZi Threat Intelligence Service.

Downloads the TIF medium plain-domains list from the official CDN,
parses and normalizes it, and maintains an in-memory matching index.

List URL: https://cdn.jsdelivr.net/gh/hagezi/dns-blocklists@latest/wildcard/tif.medium-onlydomains.txt
Format: one domain per line, lines starting with '#' are comments.

Attribution: HaGeZi DNS Blocklists (GPL-3.0)
Source: https://github.com/hagezi/dns-blocklists
"""
from __future__ import annotations

import asyncio
import hashlib
import logging
import re
import time
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.core.config import get_settings
from app.schemas.scan_schemas import ThreatIntelHealthStatus, ThreatIntelResult, ThreatIntelSyncStatus

logger = logging.getLogger(__name__)

# Offline test fixture — used when sync is disabled or for unit tests
OFFLINE_FIXTURE_DOMAINS = frozenset([
    "malware-test.example",
    "phishing-test.example",
    "badactor.test",
])

# Maximum number of in-memory domains (safety cap)
MAX_DOMAINS = 5_000_000


class ThreatIntelMatcher:
    """
    In-memory domain matcher.

    Matching rules:
    - Exact hostname match (case-insensitive).
    - Subdomain match: if 'evil.com' is listed, 'login.evil.com' matches,
      but 'notevil.com' and 'evil.com.attacker.net' do NOT match.
    """

    def __init__(self, domains: frozenset[str]) -> None:
        self._domains = domains

    def match(self, hostname: str) -> Optional[str]:
        """Return matched blocklist entry or None."""
        hostname = hostname.lower().rstrip(".")
        if not hostname:
            return None

        # Exact match
        if hostname in self._domains:
            return hostname

        # Subdomain match: walk up the hierarchy
        parts = hostname.split(".")
        for i in range(1, len(parts) - 1):
            parent = ".".join(parts[i:])
            if parent in self._domains:
                return parent

        return None

    def __len__(self) -> int:
        return len(self._domains)


class ThreatIntelService:
    """
    Downloads, parses, and indexes the HaGeZi TIF domain list.

    Thread/async safety: atomic replacement of the active matcher via asyncio.Lock.
    """

    SOURCE_NAME = "HaGeZi TIF Medium"

    def __init__(self) -> None:
        self._settings = get_settings()
        self._lock = asyncio.Lock()
        self._matcher: ThreatIntelMatcher = ThreatIntelMatcher(OFFLINE_FIXTURE_DOMAINS)
        self._last_attempted: Optional[datetime] = None
        self._last_successful: Optional[datetime] = None
        self._content_hash: Optional[str] = None
        self._entry_count: int = len(OFFLINE_FIXTURE_DOMAINS)
        self._sync_status: ThreatIntelSyncStatus = ThreatIntelSyncStatus.NEVER_SYNCED
        self._last_error: Optional[str] = None
        self._is_fixture: bool = True  # True while using offline fixture

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def check(self, hostname: str) -> ThreatIntelResult:
        """Check a hostname against the active blocklist. Thread-safe read."""
        result = ThreatIntelResult(
            checked=True,
            source_name=self.SOURCE_NAME,
            source_url=self._settings.hagezi_active_url,
            entry_count=self._entry_count,
        )
        try:
            matched = self._matcher.match(hostname)
            result.matched = matched is not None
            result.matched_entry = matched
        except Exception as exc:
            result.error = str(exc)
        return result

    async def sync(self) -> tuple[bool, str, Optional[int]]:
        """
        Download and replace the active blocklist.
        Returns (success, message, entry_count).
        Never replaces a working list with empty/malformed data.
        """
        self._last_attempted = datetime.now(timezone.utc)
        self._sync_status = ThreatIntelSyncStatus.SYNCING

        try:
            raw_text = await self._download()
            domains, content_hash = self._parse(raw_text)

            if len(domains) < 1000:
                msg = f"Downloaded list too small ({len(domains)} entries). Retaining previous list."
                logger.warning(msg)
                self._sync_status = ThreatIntelSyncStatus.FAILED
                self._last_error = msg
                return False, msg, None

            new_matcher = ThreatIntelMatcher(frozenset(domains))

            async with self._lock:
                self._matcher = new_matcher
                self._entry_count = len(domains)
                self._content_hash = content_hash
                self._last_successful = datetime.now(timezone.utc)
                self._sync_status = ThreatIntelSyncStatus.SYNCED
                self._last_error = None
                self._is_fixture = False

            msg = f"Successfully synced {len(domains):,} domains from {self.SOURCE_NAME}"
            logger.info(msg)
            return True, msg, len(domains)

        except Exception as exc:
            msg = f"Sync failed: {type(exc).__name__}: {exc}"
            logger.error(msg)
            self._sync_status = ThreatIntelSyncStatus.FAILED
            self._last_error = msg
            return False, msg, None

    def health(self) -> ThreatIntelHealthStatus:
        return ThreatIntelHealthStatus(
            source_name=self.SOURCE_NAME,
            source_url=self._settings.hagezi_active_url,
            sync_status=self._sync_status,
            last_attempted=self._last_attempted,
            last_successful=self._last_successful,
            entry_count=self._entry_count,
            content_hash=self._content_hash,
            in_memory_count=len(self._matcher),
            error=self._last_error,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _download(self) -> str:
        url = self._settings.hagezi_active_url
        timeout = self._settings.hagezi_request_timeout_seconds
        max_bytes = self._settings.hagezi_max_response_bytes

        logger.info("Downloading threat intelligence list from %s", url)
        start = time.monotonic()

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            async with client.stream("GET", url) as resp:
                resp.raise_for_status()
                chunks = []
                total = 0
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    total += len(chunk)
                    if total > max_bytes:
                        raise ValueError(f"Response exceeds size limit ({max_bytes} bytes)")
                    chunks.append(chunk)
                raw = b"".join(chunks).decode("utf-8", errors="replace")

        elapsed = time.monotonic() - start
        logger.info("Downloaded %.1f MB in %.1fs", total / 1_048_576, elapsed)
        return raw

    @staticmethod
    def _parse(raw_text: str) -> tuple[list[str], str]:
        """Parse plain-domains format. Returns (domains, sha256_hex)."""
        content_hash = hashlib.sha256(raw_text.encode()).hexdigest()
        domains = []
        seen = set()

        for line in raw_text.splitlines():
            line = line.strip()
            # Skip comments and blank lines
            if not line or line.startswith("#") or line.startswith("!"):
                continue
            # Normalize case and trailing dot
            domain = line.lower().rstrip(".")
            # Basic sanity: must look like a domain
            if not re.match(r"^[a-z0-9\-._]+$", domain):
                continue
            if len(domain) > 253:
                continue
            if domain in seen:
                continue
            seen.add(domain)
            domains.append(domain)

            if len(domains) >= MAX_DOMAINS:
                logger.warning("Reached domain cap (%d). Truncating.", MAX_DOMAINS)
                break

        return domains, content_hash


# Module-level singleton
_threat_intel_service: Optional[ThreatIntelService] = None


def get_threat_intel_service() -> ThreatIntelService:
    global _threat_intel_service
    if _threat_intel_service is None:
        _threat_intel_service = ThreatIntelService()
    return _threat_intel_service

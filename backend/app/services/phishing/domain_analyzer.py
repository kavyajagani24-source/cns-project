"""
Domain Registration Service — RDAP-based domain age lookup.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

from app.schemas.scan_schemas import DomainRegistrationInfo

logger = logging.getLogger(__name__)

RDAP_TIMEOUT = 8.0
RDAP_BOOTSTRAP = "https://rdap.org/domain/"


class DomainAnalyzer:
    async def analyze(self, hostname: str) -> DomainRegistrationInfo:
        # Strip subdomains to get registrable domain
        parts = hostname.split(".")
        if len(parts) < 2:
            return DomainRegistrationInfo(available=False, error="Cannot determine registrable domain")

        # Use last 2 parts as apex domain
        apex = ".".join(parts[-2:])
        info = DomainRegistrationInfo(domain=apex, lookup_timestamp=datetime.now(timezone.utc))

        try:
            result = await asyncio.wait_for(self._rdap_lookup(apex), timeout=RDAP_TIMEOUT)
            if result:
                info.creation_date = result
                now = datetime.now(timezone.utc)
                delta = now - result
                info.domain_age_days = delta.days
                info.data_source = "RDAP (rdap.org)"
                info.available = True
        except asyncio.TimeoutError:
            info.error = "RDAP lookup timed out"
        except Exception as exc:
            info.error = f"RDAP lookup failed: {type(exc).__name__}"
        return info

    async def _rdap_lookup(self, domain: str) -> Optional[datetime]:
        url = RDAP_BOOTSTRAP + domain
        async with httpx.AsyncClient(timeout=RDAP_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(url, headers={"Accept": "application/rdap+json"})
            if resp.status_code != 200:
                return None
            data = resp.json()
            # Look for registration date in events
            for event in data.get("events", []):
                action = event.get("eventAction", "")
                if action in ("registration", "registered"):
                    date_str = event.get("eventDate", "")
                    if date_str:
                        try:
                            dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                            return dt
                        except ValueError:
                            pass
        return None

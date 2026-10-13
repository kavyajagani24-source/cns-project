"""
URL Feature Extractor — deterministic lexical feature extraction.

Feature schema version: 1.0
All features must be extracted identically during training and inference.
"""
from __future__ import annotations

import ipaddress
import logging
import re
import urllib.parse
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# Schema version — bump when features are added/removed/changed
FEATURE_SCHEMA_VERSION = "1.0"

# Suspicious tokens commonly found in phishing URLs
SUSPICIOUS_TOKENS = frozenset([
    "login", "signin", "verify", "verification", "secure", "security",
    "update", "confirm", "account", "banking", "paypal", "amazon",
    "apple", "google", "microsoft", "facebook", "instagram", "netflix",
    "support", "helpdesk", "alert", "warning", "urgent", "suspended",
    "blocked", "limited", "unusual", "activity", "password", "credential",
    "wallet", "crypto", "bitcoin", "wire", "transfer", "refund", "prize",
    "winner", "click", "free", "offer", "discount", "coupon",
])


@dataclass
class URLParseResult:
    """Structured result of URL parsing."""
    raw_url: str
    scheme: str = ""
    hostname: str = ""
    port: Optional[int] = None
    path: str = ""
    query: str = ""
    fragment: str = ""
    is_valid: bool = False
    is_ip_address: bool = False
    is_punycode: bool = False
    error: Optional[str] = None


@dataclass
class FeatureVector:
    """Numeric feature vector — must remain stable for model compatibility."""
    # schema version marker (not used as a model feature, only for metadata)
    schema_version: str = FEATURE_SCHEMA_VERSION

    # URL structural features
    url_length: int = 0
    hostname_length: int = 0
    path_length: int = 0
    num_subdomains: int = 0
    num_dots: int = 0
    num_hyphens: int = 0
    num_digits: int = 0
    num_special_chars: int = 0

    # Boolean indicators (stored as int 0/1 for ML compatibility)
    is_ip_address: int = 0
    uses_https: int = 0
    has_at_sign: int = 0
    has_double_slash_redirect: int = 0
    has_encoded_chars: int = 0
    has_punycode: int = 0
    has_suspicious_tokens: int = 0
    has_misleading_hostname: int = 0

    # Query and path
    num_query_params: int = 0
    num_path_segments: int = 0

    # Normalized URL text for character-level models
    url_text: str = ""

    def to_dict(self) -> dict:
        """Return the numeric feature dict (excludes text and schema_version)."""
        return {
            k: v for k, v in self.__dict__.items()
            if k not in ("schema_version", "url_text")
        }

    @classmethod
    def feature_names(cls) -> list[str]:
        """Stable ordered list of numeric feature names."""
        return [
            "url_length", "hostname_length", "path_length", "num_subdomains",
            "num_dots", "num_hyphens", "num_digits", "num_special_chars",
            "is_ip_address", "uses_https", "has_at_sign",
            "has_double_slash_redirect", "has_encoded_chars", "has_punycode",
            "has_suspicious_tokens", "has_misleading_hostname",
            "num_query_params", "num_path_segments",
        ]


class URLFeatureExtractor:
    """
    Extracts lexical features from URLs without fetching them.

    Design constraints:
    - Deterministic: same input → same output always.
    - No network access.
    - Consistent feature schema across training and inference.
    - Explicit errors on malformed input.
    """

    def parse_url(self, url: str) -> URLParseResult:
        """Parse and validate a URL string."""
        if not url or not isinstance(url, str):
            return URLParseResult(raw_url=str(url), is_valid=False, error="Empty or non-string input")

        url = url.strip()
        if len(url) > 4096:
            return URLParseResult(raw_url=url[:100] + "...", is_valid=False, error="URL too long")

        if not url.startswith(("http://", "https://")):
            return URLParseResult(raw_url=url, is_valid=False, error="Unsupported scheme; only http/https accepted")

        try:
            parsed = urllib.parse.urlparse(url)
        except Exception as exc:
            return URLParseResult(raw_url=url, is_valid=False, error=f"Parse error: {exc}")

        hostname = parsed.hostname or ""
        if not hostname:
            return URLParseResult(raw_url=url, is_valid=False, error="No hostname found in URL")

        # Detect IP address
        is_ip = False
        try:
            ipaddress.ip_address(hostname)
            is_ip = True
        except ValueError:
            pass

        # Detect punycode
        is_punycode = "xn--" in hostname.lower()

        return URLParseResult(
            raw_url=url,
            scheme=parsed.scheme,
            hostname=hostname,
            port=parsed.port,
            path=parsed.path or "",
            query=parsed.query or "",
            fragment=parsed.fragment or "",
            is_valid=True,
            is_ip_address=is_ip,
            is_punycode=is_punycode,
        )

    def extract(self, url: str) -> tuple[FeatureVector, URLParseResult]:
        """
        Extract features from a URL.

        Returns (FeatureVector, URLParseResult). On parse failure,
        returns a zero-vector and the error URLParseResult.
        """
        parsed = self.parse_url(url)
        fv = FeatureVector(url_text=url)

        if not parsed.is_valid:
            return fv, parsed

        url_clean = url.strip()
        hostname = parsed.hostname
        path = parsed.path
        query = parsed.query

        # -- Length features --
        fv.url_length = len(url_clean)
        fv.hostname_length = len(hostname)
        fv.path_length = len(path)

        # -- Structural features --
        # Subdomains: dots in hostname minus 1 (ignore TLD)
        parts = hostname.split(".")
        fv.num_dots = url_clean.count(".")
        fv.num_subdomains = max(0, len(parts) - 2)

        fv.num_hyphens = url_clean.count("-")
        fv.num_digits = sum(c.isdigit() for c in url_clean)
        fv.num_special_chars = sum(
            1 for c in url_clean if not c.isalnum() and c not in "-._~:/?#[]@!$&'()*+,;=%"
        )

        # -- Boolean features --
        fv.is_ip_address = int(parsed.is_ip_address)
        fv.uses_https = int(parsed.scheme == "https")
        fv.has_at_sign = int("@" in url_clean)
        fv.has_double_slash_redirect = int("//" in path)
        fv.has_encoded_chars = int("%" in url_clean)
        fv.has_punycode = int(parsed.is_punycode)

        # Suspicious token check (hostname + path tokens)
        combined_text = (hostname + " " + path + " " + query).lower()
        # tokenize on non-alphanum chars
        tokens = frozenset(re.split(r"[^a-z0-9]", combined_text))
        fv.has_suspicious_tokens = int(bool(tokens & SUSPICIOUS_TOKENS))

        # Misleading hostname: hostname contains another hostname-like structure
        # e.g., "paypal.com.evil.net" — real domain is "evil.net"
        fv.has_misleading_hostname = int(self._has_misleading_structure(hostname))

        # -- Query and path structure --
        if query:
            params = urllib.parse.parse_qs(query, keep_blank_values=True)
            fv.num_query_params = len(params)
        fv.num_path_segments = len([s for s in path.split("/") if s])

        return fv, parsed

    @staticmethod
    def _has_misleading_structure(hostname: str) -> bool:
        """
        Detect hostnames that embed a well-known domain name in a non-apex position.

        Example: paypal.com.attacker.net — "paypal.com" is NOT the real registrable domain.
        This is a heuristic; it does not prove malice.
        """
        well_known = [
            "paypal.com", "amazon.com", "google.com", "apple.com",
            "microsoft.com", "facebook.com", "netflix.com", "instagram.com",
            "twitter.com", "linkedin.com", "bankofamerica.com", "chase.com",
            "wellsfargo.com", "citibank.com", "hsbc.com", "barclays.com",
        ]
        hostname_lower = hostname.lower()
        for wk in well_known:
            # Legitimate: hostname IS the well-known domain or a direct subdomain of it
            if hostname_lower == wk or hostname_lower.endswith("." + wk):
                return False
            # Suspicious: well-known domain appears as a label inside a different apex domain
            # e.g., "paypal.com" inside "paypal.com.attacker.net"
            if (hostname_lower.startswith(wk + ".") or ("." + wk + ".") in hostname_lower):
                return True
        return False


# Module-level singleton
_extractor = URLFeatureExtractor()


def extract_url_features(url: str) -> tuple[FeatureVector, URLParseResult]:
    """Module-level convenience function."""
    return _extractor.extract(url)

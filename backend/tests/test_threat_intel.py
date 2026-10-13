"""Tests for the threat intelligence matcher."""
import pytest
from app.services.threat_intelligence.hagezi_service import ThreatIntelMatcher, ThreatIntelService


class TestMatcher:
    def setup_method(self):
        self.domains = frozenset([
            "evil.com",
            "phishing.net",
            "malware-test.example",
        ])
        self.matcher = ThreatIntelMatcher(self.domains)

    def test_exact_match(self):
        assert self.matcher.match("evil.com") == "evil.com"

    def test_exact_match_case_insensitive(self):
        assert self.matcher.match("EVIL.COM") == "evil.com"

    def test_subdomain_match(self):
        assert self.matcher.match("login.evil.com") == "evil.com"

    def test_deep_subdomain_match(self):
        assert self.matcher.match("www.login.evil.com") == "evil.com"

    def test_unrelated_domain_no_match(self):
        assert self.matcher.match("notevil.com") is None

    def test_lookalike_no_match(self):
        # evil.com embedded in a different domain — must NOT match
        assert self.matcher.match("evil.com.attacker.net") is None

    def test_trailing_dot_normalized(self):
        assert self.matcher.match("evil.com.") == "evil.com"

    def test_empty_hostname(self):
        assert self.matcher.match("") is None

    def test_legitimate_domain_no_match(self):
        assert self.matcher.match("google.com") is None

    def test_partial_substring_no_match(self):
        # "evil" alone should not match "evil.com"
        assert self.matcher.match("evil") is None

    def test_len(self):
        assert len(self.matcher) == 3


class TestParser:
    def test_parse_plain_domains(self):
        raw = """# Comment line
evil.com
phishing.net
# Another comment
badsite.org

"""
        domains, hash_ = ThreatIntelService._parse(raw)
        assert "evil.com" in domains
        assert "phishing.net" in domains
        assert "badsite.org" in domains
        assert len(hash_) == 64  # sha256 hex

    def test_parse_deduplicates(self):
        raw = "evil.com\nevil.com\nevil.com\n"
        domains, _ = ThreatIntelService._parse(raw)
        assert domains.count("evil.com") == 1

    def test_parse_skips_invalid(self):
        raw = "valid.com\n<invalid>\n!!bad\nok.net\n"
        domains, _ = ThreatIntelService._parse(raw)
        assert "valid.com" in domains
        assert "ok.net" in domains
        assert "<invalid>" not in domains

    def test_parse_empty(self):
        domains, _ = ThreatIntelService._parse("")
        assert domains == []

    def test_parse_comments_only(self):
        raw = "# comment\n! adblock comment\n"
        domains, _ = ThreatIntelService._parse(raw)
        assert domains == []

    def test_parse_normalizes_case(self):
        raw = "EVIL.COM\nBADSITE.ORG\n"
        domains, _ = ThreatIntelService._parse(raw)
        assert "evil.com" in domains
        assert "badsite.org" in domains

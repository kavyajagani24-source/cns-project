"""Tests for URL feature extractor."""
import pytest
from app.services.phishing.feature_extractor import URLFeatureExtractor, extract_url_features

extractor = URLFeatureExtractor()


class TestURLParsing:
    def test_valid_https(self):
        _, parsed = extract_url_features("https://www.example.com/path?q=1")
        assert parsed.is_valid
        assert parsed.scheme == "https"
        assert parsed.hostname == "www.example.com"

    def test_valid_http(self):
        _, parsed = extract_url_features("http://example.com/")
        assert parsed.is_valid
        assert parsed.scheme == "http"

    def test_malformed_no_scheme(self):
        _, parsed = extract_url_features("notaurl")
        assert not parsed.is_valid
        assert parsed.error is not None

    def test_ip_address_hostname(self):
        fv, parsed = extract_url_features("http://192.168.1.1/admin")
        assert parsed.is_valid
        assert parsed.is_ip_address
        assert fv.is_ip_address == 1

    def test_empty_input(self):
        _, parsed = extract_url_features("")
        assert not parsed.is_valid

    def test_punycode_hostname(self):
        fv, parsed = extract_url_features("https://xn--paypai-hvc.com/login")
        assert parsed.is_valid
        assert fv.has_punycode == 1

    def test_at_sign_detection(self):
        fv, _ = extract_url_features("http://user@evil.com/")
        assert fv.has_at_sign == 1

    def test_no_at_sign(self):
        fv, _ = extract_url_features("https://www.google.com/")
        assert fv.has_at_sign == 0

    def test_https_flag(self):
        fv, _ = extract_url_features("https://secure.example.com/")
        assert fv.uses_https == 1

    def test_http_flag(self):
        fv, _ = extract_url_features("http://insecure.example.com/")
        assert fv.uses_https == 0

    def test_long_url(self):
        long_url = "https://example.com/" + "a" * 300
        fv, parsed = extract_url_features(long_url)
        assert parsed.is_valid
        assert fv.url_length > 300

    def test_query_params(self):
        fv, _ = extract_url_features("https://example.com/path?a=1&b=2&c=3")
        assert fv.num_query_params == 3

    def test_suspicious_token(self):
        fv, _ = extract_url_features("https://secure-login.phishing.com/verify")
        assert fv.has_suspicious_tokens == 1

    def test_normal_url_no_suspicious(self):
        fv, _ = extract_url_features("https://www.wikipedia.org/wiki/Science")
        # Wikipedia won't have suspicious tokens
        assert fv.uses_https == 1

    def test_deterministic(self):
        url = "https://www.example.com/test?x=1"
        fv1, _ = extract_url_features(url)
        fv2, _ = extract_url_features(url)
        assert fv1.to_dict() == fv2.to_dict()

    def test_misleading_hostname(self):
        fv, _ = extract_url_features("https://paypal.com.attacker.net/login")
        assert fv.has_misleading_hostname == 1

    def test_legitimate_subdomain_not_misleading(self):
        fv, _ = extract_url_features("https://accounts.google.com/login")
        assert fv.has_misleading_hostname == 0

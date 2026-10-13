"""
Create a minimal synthetic test dataset for development and unit testing.
NOT for production benchmarking. Labels are heuristic, not validated.

Usage:
    uv run python -m app.scripts.create_test_dataset
"""
from __future__ import annotations

import logging
import os
from pathlib import Path

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "datasets" / "phishing_urls.csv"

PHISHING_URLS = [
    "http://paypal.com.secure-login.xyz/auth",
    "http://amazon.com.account-verify.ru/login?user=admin",
    "http://192.168.1.1/admin/login.php",
    "http://apple.com.id-verify.com/signin",
    "https://secure-bankofamerica.com.phishtest.net/login",
    "http://update-netflix.com/account/suspended",
    "http://bit.ly/3fakelink",
    "https://paypa1.com/cgi-bin/webscr?cmd=login",
    "http://microsoft.com.password-reset.site/verify",
    "https://xn--paypai-hvc.com/login",
    "http://login-facebook-security.com/recover",
    "http://google.com.account-suspended.info/action",
    "https://chase.com.secure-verify.xyz/online",
    "http://wellsfargo-alert.com/account/locked",
    "http://instagram-verify.com/confirm-account",
    "http://support-apple-id.com/reset-password",
    "https://amazon-prize-winner.com/claim",
    "http://phishing-example-test.xyz/steal-credentials",
    "http://free-iphone-giveaway.com/claim-now",
    "http://irs-tax-refund.com/apply",
    "https://covid-relief-gov.com/apply-now",
    "http://crypto-wallet-verify.com/login",
    "https://dhl-track-package.com/verify-address",
    "http://fedex-delivery-failed.com/reschedule",
    "https://zoom-meeting-invite.com/join/virus",
    "http://outlook.com.email-verify.net/signin",
    "https://secure.paypal.com.login.evilsite.com/confirm",
    "http://whatsapp-prize.com/winner",
    "https://binance-wallet-verify.com/kyc",
    "http://suspicious-login-alert.com/account/danger",
] + [
    f"http://phish-{i}.malicioushost.com/login" for i in range(70)
]

LEGITIMATE_URLS = [
    "https://www.google.com/search?q=weather",
    "https://www.amazon.com/dp/B08N5WRWNW",
    "https://github.com/hagezi/dns-blocklists",
    "https://www.wikipedia.org/wiki/Phishing",
    "https://stackoverflow.com/questions/tagged/python",
    "https://news.ycombinator.com/",
    "https://www.bbc.com/news",
    "https://www.reddit.com/r/netsec",
    "https://docs.python.org/3/library/",
    "https://www.cloudflare.com/learning/",
    "https://www.mozilla.org/en-US/firefox/",
    "https://www.apple.com/iphone",
    "https://www.microsoft.com/en-us/windows",
    "https://www.facebook.com/",
    "https://twitter.com/home",
    "https://www.linkedin.com/feed/",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.netflix.com/browse",
    "https://www.spotify.com/us/",
    "https://www.dropbox.com/",
    "https://www.paypal.com/us/home",
    "https://www.chase.com/",
    "https://www.bankofamerica.com/",
    "https://www.wellsfargo.com/",
    "https://www.ebay.com/",
    "https://www.walmart.com/",
    "https://www.target.com/",
    "https://www.bestbuy.com/",
    "https://www.adobe.com/",
    "https://www.salesforce.com/",
] + [
    f"https://legitimate-site-{i}.com/page/{i}" for i in range(70)
]


def main():
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    rows = (
        [{"url": u, "label": 1} for u in PHISHING_URLS]
        + [{"url": u, "label": 0} for u in LEGITIMATE_URLS]
    )

    df = pd.DataFrame(rows)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    df.to_csv(OUTPUT_PATH, index=False)
    logger.info(
        "Synthetic test dataset saved to %s (%d phishing, %d legitimate)",
        OUTPUT_PATH, len(PHISHING_URLS), len(LEGITIMATE_URLS),
    )
    logger.warning(
        "This is a SYNTHETIC dataset for development only. "
        "Do not use it to report real model accuracy."
    )


if __name__ == "__main__":
    main()

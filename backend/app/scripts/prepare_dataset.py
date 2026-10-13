"""
Dataset preparation script for phishing URL classifier.

Usage:
    uv run python -m app.scripts.prepare_dataset

Dataset: PhishTank + Tranco legitimate URLs (or any CSV with columns: url, label)
Label convention: 1 = phishing, 0 = legitimate

The script expects a raw CSV at PHISHING_DATASET_PATH with columns: url, label
If the dataset is not present, it shows download instructions.
"""
from __future__ import annotations

import hashlib
import logging
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

DATASET_PATH = Path(__file__).resolve().parent.parent.parent / "datasets" / "phishing_urls.csv"
OUTPUT_DIR = Path(__file__).resolve().parent.parent.parent / "datasets"
RANDOM_SEED = 42


def main():
    if not DATASET_PATH.exists():
        logger.error("Dataset not found at: %s", DATASET_PATH)
        logger.info(
            "\nTo obtain a dataset, download one of these sources and save as phishing_urls.csv:\n"
            "  1. PhishTank dataset: https://www.phishtank.com/developer_info.php\n"
            "  2. UCI ML Phishing Dataset: https://archive.ics.uci.edu/dataset/967\n"
            "  3. ISCX-URL-2016: https://www.unb.ca/cic/datasets/url-2016.html\n\n"
            "The CSV must have columns: 'url' and 'label' (1=phishing, 0=legitimate)\n"
            "\nFor testing, create a minimal dataset:\n"
            "  python -m app.scripts.create_test_dataset"
        )
        sys.exit(1)

    logger.info("Loading dataset from %s", DATASET_PATH)
    df = pd.read_csv(DATASET_PATH)

    # Validate columns
    required = {"url", "label"}
    missing = required - set(df.columns)
    if missing:
        logger.error("Missing required columns: %s (found: %s)", missing, list(df.columns))
        sys.exit(1)

    logger.info("Raw dataset: %d rows", len(df))

    # Drop nulls
    df = df.dropna(subset=["url", "label"])
    logger.info("After dropping nulls: %d rows", len(df))

    # Normalize labels to 0/1
    df["label"] = df["label"].astype(int)
    valid_labels = df["label"].isin([0, 1])
    df = df[valid_labels]
    logger.info("After label validation: %d rows", len(df))

    # Normalize URLs
    df["url"] = df["url"].astype(str).str.strip()
    df = df[df["url"].str.startswith(("http://", "https://"))]
    logger.info("After URL validation: %d rows", len(df))

    # Deduplicate (exact URL)
    before = len(df)
    df = df.drop_duplicates(subset=["url"])
    logger.info("After deduplication: %d rows (removed %d)", len(df), before - len(df))

    # Class distribution
    dist = df["label"].value_counts()
    logger.info("Label distribution:\n  Phishing (1): %d\n  Legitimate (0): %d", dist.get(1, 0), dist.get(0, 0))

    # Domain-based split to prevent leakage
    from urllib.parse import urlparse
    df["_domain"] = df["url"].apply(lambda u: urlparse(u).hostname or u)

    # Group by domain, split domains (not individual URLs)
    domains = df["_domain"].unique()
    train_d, test_d = train_test_split(domains, test_size=0.15, random_state=RANDOM_SEED)
    train_d, val_d = train_test_split(train_d, test_size=0.12, random_state=RANDOM_SEED)

    train_df = df[df["_domain"].isin(train_d)].drop("_domain", axis=1)
    val_df = df[df["_domain"].isin(val_d)].drop("_domain", axis=1)
    test_df = df[df["_domain"].isin(test_d)].drop("_domain", axis=1)

    logger.info("Split sizes — Train: %d | Val: %d | Test: %d", len(train_df), len(val_df), len(test_df))

    # Save splits
    train_df.to_csv(OUTPUT_DIR / "train.csv", index=False)
    val_df.to_csv(OUTPUT_DIR / "val.csv", index=False)
    test_df.to_csv(OUTPUT_DIR / "test.csv", index=False)

    # Save metadata
    metadata = {
        "total_rows": len(df),
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "test_rows": len(test_df),
        "phishing_count": int(dist.get(1, 0)),
        "legitimate_count": int(dist.get(0, 0)),
        "split_method": "domain_grouped",
        "random_seed": RANDOM_SEED,
        "source_file": str(DATASET_PATH),
        "source_hash": hashlib.md5(DATASET_PATH.read_bytes()).hexdigest(),
    }

    import json
    with open(OUTPUT_DIR / "dataset_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Dataset prepared successfully. Files saved to %s", OUTPUT_DIR)


if __name__ == "__main__":
    main()

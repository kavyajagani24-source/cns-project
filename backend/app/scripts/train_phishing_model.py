"""
Phishing URL classifier training script.

Model: Character-level TF-IDF + Logistic Regression baseline.
Feature schema version: 1.0

Usage:
    uv run python -m app.scripts.train_phishing_model
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score, roc_auc_score,
)
from sklearn.pipeline import Pipeline

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATASETS_DIR = BASE_DIR / "datasets"
ARTIFACTS_DIR = BASE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(exist_ok=True)

MODEL_VERSION = "1.0.0"
FEATURE_SCHEMA_VERSION = "1.0"
RANDOM_SEED = 42


def load_split(name: str) -> pd.DataFrame:
    path = DATASETS_DIR / f"{name}.csv"
    if not path.exists():
        raise FileNotFoundError(f"Split file not found: {path}. Run prepare_dataset first.")
    df = pd.read_csv(path)
    df = df.dropna(subset=["url", "label"])
    df["label"] = df["label"].astype(int)
    return df


def main():
    logger.info("=== CyberShield AI — Phishing URL Classifier Training ===")
    logger.info("Model version: %s | Feature schema: %s", MODEL_VERSION, FEATURE_SCHEMA_VERSION)

    # Load data
    try:
        train_df = load_split("train")
        val_df = load_split("val")
        test_df = load_split("test")
    except FileNotFoundError as e:
        logger.error(str(e))
        logger.info("Run: uv run python -m app.scripts.prepare_dataset")
        sys.exit(1)

    logger.info("Train: %d | Val: %d | Test: %d", len(train_df), len(val_df), len(test_df))

    X_train, y_train = train_df["url"].tolist(), train_df["label"].tolist()
    X_val, y_val = val_df["url"].tolist(), val_df["label"].tolist()
    X_test, y_test = test_df["url"].tolist(), test_df["label"].tolist()

    # Character-level TF-IDF: captures n-gram patterns in URL strings
    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        max_features=50_000,
        min_df=2,
        sublinear_tf=True,
    )

    logger.info("Fitting TF-IDF vectorizer...")
    X_train_vec = vectorizer.fit_transform(X_train)
    X_val_vec = vectorizer.transform(X_val)
    X_test_vec = vectorizer.transform(X_test)

    logger.info("Training Logistic Regression...")
    model = LogisticRegression(
        C=1.0,
        max_iter=1000,
        solver="saga",
        class_weight="balanced",
        random_state=RANDOM_SEED,
        n_jobs=-1,
    )
    model.fit(X_train_vec, y_train)

    # Validation evaluation
    y_val_pred = model.predict(X_val_vec)
    y_val_proba = model.predict_proba(X_val_vec)[:, 1]
    val_f1 = f1_score(y_val, y_val_pred)
    val_auc = roc_auc_score(y_val, y_val_proba)
    logger.info("Validation — F1: %.4f | AUC: %.4f", val_f1, val_auc)

    # Test evaluation
    y_test_pred = model.predict(X_test_vec)
    y_test_proba = model.predict_proba(X_test_vec)[:, 1]

    precision = precision_score(y_test, y_test_pred, zero_division=0)
    recall = recall_score(y_test, y_test_pred, zero_division=0)
    f1 = f1_score(y_test, y_test_pred, zero_division=0)
    accuracy = accuracy_score(y_test, y_test_pred)
    auc = roc_auc_score(y_test, y_test_proba)
    cm = confusion_matrix(y_test, y_test_pred).tolist()
    tn, fp, fn, tp = confusion_matrix(y_test, y_test_pred).ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

    logger.info("=== Test Set Results ===")
    logger.info("Accuracy:  %.4f", accuracy)
    logger.info("Precision: %.4f", precision)
    logger.info("Recall:    %.4f", recall)
    logger.info("F1-score:  %.4f", f1)
    logger.info("ROC-AUC:   %.4f", auc)
    logger.info("FP Rate:   %.4f", fpr)
    logger.info("Confusion matrix:\n%s", classification_report(y_test, y_test_pred, target_names=["legitimate", "phishing"]))

    # Save artifact
    artifact = {
        "model": model,
        "vectorizer": vectorizer,
        "metadata": {
            "model_version": MODEL_VERSION,
            "feature_schema_version": FEATURE_SCHEMA_VERSION,
            "model_type": "LogisticRegression+TF-IDF(char_wb,3-5gram)",
            "training_samples": len(X_train),
            "trained_at": datetime.now(timezone.utc).isoformat(),
            "dataset_dir": str(DATASETS_DIR),
            "evaluation": {
                "test_accuracy": round(accuracy, 4),
                "test_precision": round(precision, 4),
                "test_recall": round(recall, 4),
                "test_f1": round(f1, 4),
                "test_auc": round(auc, 4),
                "test_fpr": round(fpr, 4),
                "confusion_matrix": cm,
                "val_f1": round(val_f1, 4),
                "val_auc": round(val_auc, 4),
            },
        },
    }

    artifact_path = ARTIFACTS_DIR / "phishing_model.joblib"
    joblib.dump(artifact, artifact_path)
    logger.info("Model artifact saved to %s", artifact_path)

    # Save human-readable evaluation report
    report = {
        "model_version": MODEL_VERSION,
        "trained_at": artifact["metadata"]["trained_at"],
        "dataset": {
            "train": len(X_train),
            "validation": len(X_val),
            "test": len(X_test),
            "split_method": "domain_grouped",
        },
        "model_architecture": {
            "vectorizer": "TF-IDF char_wb n-gram (3,5) max_features=50000",
            "classifier": "LogisticRegression C=1.0 balanced class_weight",
        },
        "test_results": artifact["metadata"]["evaluation"],
        "notes": [
            "Probability output is uncalibrated. Label as 'model_score' not 'confidence'.",
            "This model was trained on the dataset in datasets/. Check dataset_metadata.json for provenance.",
            "Do not use this model as the sole arbiter of safety.",
        ],
    }
    report_path = ARTIFACTS_DIR / "evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    logger.info("Evaluation report saved to %s", report_path)
    logger.info("Training complete.")


if __name__ == "__main__":
    main()

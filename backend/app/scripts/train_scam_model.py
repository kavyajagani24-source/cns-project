"""Train optional scam classifier on externally obtained and reviewed labeled text data.
Usage: python -m app.scripts.train_scam_model --data datasets/scam_messages.csv
CSV columns: text,label with label 0 (benign) or 1 (scam).
No synthetic benchmark scores are presented as real-world performance.
"""
import argparse
from pathlib import Path
import joblib
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

def train(path: Path, output: Path):
    df = pd.read_csv(path).dropna(subset=["text", "label"])
    df["label"] = pd.to_numeric(df["label"], errors="raise").astype(int)
    if not set(df.label.unique()) == {0, 1} or len(df) < 100:
        raise ValueError("Requires at least 100 labeled examples spanning both classes; use independent data for meaningful evaluation")
    df = df.drop_duplicates(subset="text")
    if df.label.value_counts().min() < 10:
        raise ValueError("Each class needs at least 10 distinct examples")
    Xtrain, Xtest, ytrain, ytest = train_test_split(df.text.astype(str), df.label, test_size=0.25, random_state=42, stratify=df.label)
    pipe = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=40000, min_df=2, sublinear_tf=True)), ("classifier", LogisticRegression(max_iter=1000, class_weight="balanced"))])
    pipe.fit(Xtrain, ytrain)
    pred = pipe.predict(Xtest)
    print(classification_report(ytest, pred, digits=3, zero_division=0))
    print("Confusion matrix:\n", confusion_matrix(ytest, pred))
    print("CAUTION: Random message split can overestimate generalization if templates/campaigns overlap; run a separate source/time-disjoint evaluation before deployment.")
    output.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, output)
    print("Saved:", output)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("artifacts/scam_text_model.joblib"))
    args = parser.parse_args()
    train(args.data, args.output)

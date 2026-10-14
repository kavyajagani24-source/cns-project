# CyberShield AI — Part 3 ML Training

## Overview
Part 3 uses a hybrid social-engineering detection architecture combining deterministic rules and an optional machine-learning text classifier.

The hybrid risk score is calculated as:

**Risk Score = 0.70 × Rule Score + 0.30 × ML Score**

If the trained ML model is unavailable, the application uses rule-based scoring.

## Dataset
- Source: UCI SMS Spam Collection
- URL: https://archive.ics.uci.edu/dataset/228/sms+spam+collection
- Total messages: 5,574
- Labels: 0 = legitimate (ham), 1 = spam

The dataset is used as an initial spam-classification baseline. Spam detection performance should not be interpreted as equivalent to detecting all social-engineering scams.

## Data Preparation
The downloaded `SMSSpamCollection` file was converted into a CSV named `scam_messages.csv` with two columns:

- `text`: SMS message content
- `label`: Binary class (0 or 1)

The training CSV is stored locally in `backend/datasets/`.

## Model
The training implementation uses:
- TF-IDF text vectorization
- Logistic Regression
- Binary classification

Training script: `backend/app/scripts/train_scam_model.py`

## Training Instructions
Install backend dependencies using the existing project configuration.

From the `backend` directory, execute:

```powershell
python -m app.scripts.train_scam_model --data datasets/scam_messages.csv
```

The model is saved to:

`backend/artifacts/scam_text_model.joblib`

The generated model artifact is ignored by Git and should be recreated locally after setting up the project.

## Evaluation
The initial SMS spam experiment produced the following results:

| Metric | Result |
|---|---|
| Accuracy | 98.1% |
| Spam precision | 92.1% |
| Spam recall | 92.6% |
| Spam F1-score | 92.4% |

These results come from the training script's random train/test split, not from an independent scam-specific benchmark.

## Hybrid Integration
The trained model is loaded by `backend/app/services/scam_analysis/engine.py`.

The classifier's output contributes 30% to the composite risk score; deterministic rules contribute 70%.

If no model artifact is available, the application continues in rule-only mode.

## Functional Verification
- React frontend production build passed.
- Eight Scam Analysis backend automated tests passed.
- Browser-to-FastAPI inference verified.
- Trained model successfully loaded and produced an ML score.
- MongoDB scan history saving, retrieval, and deletion verified.

## Limitations and Future Improvements
- SMS spam is not identical to social-engineering fraud.
- Further training and independent evaluation should use representative banking, government impersonation, delivery, and technical-support scam messages.
- Risk scores are heuristic assessments, not calibrated probabilities of fraud.
- The model artifact and local datasets are not included in GitHub.
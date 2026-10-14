# Part 3 — Scam & Impersonation Analysis

## What was added
- `POST /api/scam/analyze`: SMS, email, call transcript, chat, or other pasted **text**; returns risk score, rule/ML contributions, category, exact text offsets, explanations, and context-specific protective actions.
- `GET /api/scam/scans` and `DELETE /api/scam/scans/{id}`: opt-in MongoDB history, with redacted indicator excerpts and **no raw messages** persisted.
- `ScamAnalysisPage.tsx` and dedicated CSS: five example presets, evidence highlighting, accessible labels, risk bar, history, and error states.
- Explainable detection rules, multi-signal combination bonuses, optional scikit-learn TF-IDF Logistic Regression classifier, train script, and tests.

## Local setup
From `backend`: install dependencies using your existing environment (`uv sync` where supported), then `uvicorn app.main:app --reload`. From `frontend`: `npm ci`, then `npm run dev`. In the application, open `/scam-analysis`. The frontend proxies `/api` according to its existing Vite config.

## Train optional ML component
Provide a reviewed CSV with `text,label` (0=benign, 1=scam), at least 100 rows spanning both classes. Run from `backend`:

`python -m app.scripts.train_scam_model --data datasets/scam_messages.csv`

This produces `backend/artifacts/scam_text_model.joblib`. Restart backend to load it. Until a model is present, the API explicitly reports `ml_status: not_trained` and uses rules alone. **No sample training dataset or trained model is represented as validated research.** The random-split evaluation in the training script is diagnostic; credible deployment validation requires independent datasets separated by source, campaign, and time. Review language coverage, false positives, and calibration before releasing model scores to end users.

## Privacy, scope, and limitations
- Text only: this does not transcribe audio recordings; call **transcripts** are supported.
- Scam scores are heuristics, **not** calibrated fraud probabilities. The model score is experimental if enabled.
- Pattern recognition is English-oriented; benign quotations, fraud-awareness training and adversarial paraphrases may lead to errors. An unknown message cannot be certified safe.
- All data is sent to the configured backend. History is **opt-in** and redacts evidence excerpts. Do not send real OTPs/passwords or regulated/private customer conversations without appropriate authorization. This is not a complete personal-data anonymization system.
- MongoDB failures make history unavailable; analysis itself remains functional, and the API reports `stored: false` if saving fails.
- Does not change phishing/deepfake detection; existing services and model assets are preserved.

## Tests
From `backend`: `pytest -q tests/test_scam_analysis.py`. From `frontend`: `npm run build`.

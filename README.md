# CyberShield AI

**Intelligent Phishing Detection Platform — Part 1**

> An evidence-based cybersecurity platform using threat intelligence, machine learning, DNS inspection, and TLS analysis to assess suspicious URLs.

---

## ✅ Part 1 Status

| Component | Status |
|---|---|
| FastAPI backend | ✅ Running |
| React + Vite frontend | ✅ Running |
| MongoDB Atlas | ✅ Connected |
| ML phishing classifier | ✅ Trained & loaded (v1.0.0) |
| HaGeZi TIF threat intel | ✅ Offline fixture active (sync available) |
| URL feature extraction | ✅ 18 lexical features |
| DNS analyzer | ✅ Async, bounded |
| TLS inspector | ✅ Certificate validation |
| Domain registration (RDAP) | ✅ With fallback |
| Hybrid risk engine | ✅ Evidence-based policy |
| Scan history (MongoDB) | ✅ Persisted |
| Deepfake module | 🔜 Part 2 interface defined |
| Scam analysis module | 🔜 Part 3 interface defined |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- MongoDB Atlas account (or local MongoDB)

### 1. Clone & Setup

```powershell
git clone <repo-url>
cd cns-project
```

### 2. Backend

```powershell
cd backend

# Copy environment config
Copy-Item .env.example .env
# Edit .env and set your MONGODB_URI

# Install dependencies (auto-creates venv)
uv sync

# Train the ML model (uses synthetic dataset for dev)
uv run python -m app.scripts.create_test_dataset
uv run python -m app.scripts.prepare_dataset
uv run python -m app.scripts.train_phishing_model

# Start the backend
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Backend runs at: **http://127.0.0.1:8000**  
API docs: **http://127.0.0.1:8000/api/docs**

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## ⚙️ Environment Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DATABASE` | | `cybershield_ai` | Database name |
| `FRONTEND_ORIGIN` | | `http://localhost:5173` | CORS allowed origin |
| `HAGEZI_SYNC_ENABLED` | | `false` | Auto-sync TI on startup |
| `PHISHING_MODEL_PATH` | | `artifacts/phishing_model.joblib` | ML model artifact path |

---

## 🤖 ML Model Training

```powershell
# Step 1: Create synthetic dev dataset (200 URLs)
uv run python -m app.scripts.create_test_dataset

# Step 2: Prepare splits (domain-grouped, no leakage)
uv run python -m app.scripts.prepare_dataset

# Step 3: Train TF-IDF + Logistic Regression
uv run python -m app.scripts.train_phishing_model
```

For production accuracy, replace with a real labeled dataset (PhishTank, ISCX-URL-2016, UCI ML).

---

## 🧪 Running Tests

```powershell
cd backend
uv run pytest tests/ -v
```

**Current: 34/34 tests passing**

---

## 🎯 HaGeZi Threat Intelligence Sync

The offline fixture (3 test domains) is active by default.  
To sync the full TIF Medium list (~629K domains):

```powershell
# Via API (POST)
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/threat-intel/sync" -Method POST

# Or enable auto-sync on startup in .env:
HAGEZI_SYNC_ENABLED=true
```

**Attribution:** [HaGeZi DNS Blocklists](https://github.com/hagezi/dns-blocklists) — GPL-3.0

---

## 📁 Project Structure

```
cns-project/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI endpoints
│   │   ├── core/                # Config & logging
│   │   ├── db/                  # MongoDB connection
│   │   ├── repositories/        # Data access layer
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── scripts/             # ML training scripts
│   │   └── services/
│   │       ├── phishing/        # Feature extractor, DNS, TLS, ML, risk engine
│   │       ├── threat_intelligence/  # HaGeZi service
│   │       ├── deepfake/        # Part 2 interface stub
│   │       └── scam_analysis/   # Part 3 interface stub
│   ├── tests/                   # 34 pytest tests
│   ├── artifacts/               # Trained model (gitignored)
│   └── datasets/                # URL datasets (gitignored)
└── frontend/
    └── src/
        ├── components/          # Sidebar, RiskBadge
        ├── pages/               # Dashboard, Scanner, History, etc.
        ├── services/api.ts      # Typed API client
        └── types/api.ts         # TypeScript types
```

---

## 🛣️ Roadmap

| Part | Module | Status |
|---|---|---|
| **Part 1** | Phishing URL Detection | ✅ Complete |
| **Part 2** | Deepfake Video Detection (PwTF-DVD) | 🔜 Planned |
| **Part 3** | Scam & Impersonation Analysis | 🔜 Planned |

---

## 📜 License & Attribution

- **HaGeZi DNS Blocklists** — GPL-3.0 — https://github.com/hagezi/dns-blocklists
- CyberShield AI is an educational/research project.

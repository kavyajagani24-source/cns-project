# PwTF-DVD Model Weights

## Required checkpoint

| Field | Value |
|-------|-------|
| File name | `for_deploy_model3.pth` |
| Expected path | `backend/models/deepfake/pwtf_dvd/for_deploy_model3.pth` |
| Source | [Google Drive](https://drive.google.com/file/d/10D74h8NhpZ2Ut3Te_ieTIAZYOTL6mNQd/view) |
| Paper | "Beyond Spatial Frequency: Pixel-wise Temporal Frequency-based Deepfake Video Detection" (ICCV 2025) |
| License | MIT — Copyright (c) 2025 TAEHOON KIM |

## Download instructions

### Option A — Automated (via gdown)
```bash
cd backend
uv run python -c "import gdown; gdown.download(id='10D74h8NhpZ2Ut3Te_ieTIAZYOTL6mNQd', output='models/deepfake/pwtf_dvd/for_deploy_model3.pth', quiet=False)"
```

### Option B — Manual
1. Open https://drive.google.com/file/d/10D74h8NhpZ2Ut3Te_ieTIAZYOTL6mNQd/view
2. Click **Download**
3. Move the file to `backend/models/deepfake/pwtf_dvd/for_deploy_model3.pth`
4. Restart the backend

## After placing the weights

The backend will automatically load the model on the next request to `/api/deepfake/health`.
Model initialization status changes from `weights_missing` → `ready`.

## Attribution

This model is the official implementation from the PwTF-DVD paper. 
CyberShield AI does **not** claim authorship of the model.
See `third_party/PwTF-DVD/LICENSE` for the full MIT license text.

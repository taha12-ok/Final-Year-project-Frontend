# MedAI Platform — AI-Powered Medical Screening (Final Year Project, SMIU)

AI-assisted medical image screening: **Fracture (X-ray) · Brain Tumor (MRI) · Kidney Disease (CT)** — with calibrated confidence, modality gate (rejects random photos), Grad-CAM explainability, PDF reports, a conversational AI Health Assistant (Roman Urdu + English), and a **Model Lab** dashboard for honest evaluation.

> ⚠️ Screening aid only — **not** a medical diagnosis. Always consult a qualified doctor.

## Architecture

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Frontend (Next.js 14)  │  HTTPS  │  Backend (FastAPI)           │
│  Vercel                 │ ──────► │  Hugging Face Spaces (Docker)│
│                         │         │                              │
│  • Landing + UI         │         │  • Modality gate (photo? ✗)  │
│  • AI Health Assistant  │         │  • ResNet50 ×3 (PyTorch)     │
│    (streaming chat,     │         │  • Temperature calibration   │
│     Groq via API route) │         │  • Grad-CAM + PDF report     │
│  • Model Lab dashboard  │         │  • /metrics for the Lab      │
└─────────────────────────┘         └──────────────────────────────┘
```

## Features

- **3 screening models** — ResNet50, temperature-calibrated confidence, per-class probabilities
- **Modality gate** — selfie/normal photo upload → rejected with a clear message (never a fake 100% result)
- **Inconclusive detection** — low-confidence scans are flagged honestly (UI + PDF)
- **Grad-CAM** — "AI ne kahan focus kiya" heatmap on every result
- **AI Health Assistant** — WhatsApp-style streaming chat; asks intake questions in Roman Urdu/English, gives a structured assessment, then hands off to the right screening page with patient details pre-filled
- **Model Lab (`/lab`)** — test accuracy, per-class F1, confusion matrices, temperature, pipeline diagram — powered by `/metrics/{model}` from the backend
- **PDF reports** — patient details, finding banner (incl. inconclusive state), Grad-CAM
- **Security** — CORS whitelist, rate limiting, upload validation, no PHI storage, secrets only in env

## Getting started

```bash
# Frontend
npm install
cp .env.example .env.local   # fill GROQ_API_KEY etc.
npm run dev                  # http://localhost:3000

# Backend (see backend repo / backend-upgrade folder)
uvicorn main:app --port 8000
```

Environment variables (`.env.local`): see `.env.example`.

## Retraining (Kaggle, free GPU)

`docs/kaggle/MedAI_Retraining.ipynb` — run all cells on Kaggle GPU with the 3 datasets attached. Outputs: new `.pth` models, `metrics/*.json`, `temperature.json`, `modality_gate.json`, and a pass/fail report (targets: fracture ≥90%, brain ≥95%, kidney ≥90% test accuracy).

## Deployment

- **Frontend:** Vercel (`NEXT_PUBLIC_BACKEND_URL` → HF Space URL)
- **Backend:** Hugging Face Spaces (Docker, free, 24/7) — full guide: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Viva prep

[`docs/VIVA-QA.md`](docs/VIVA-QA.md) — temperature scaling, OOD detection, Grad-CAM, class imbalance, architecture decisions — Roman Urdu explanations.
[`docs/SECURITY-NOW.md`](docs/SECURITY-NOW.md) — leaked-credentials rotation checklist.

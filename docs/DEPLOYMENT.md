# 🚀 Backend Deployment — 100% FREE, no credit card (Back4App Containers)

> **Recommended: Back4App Containers.** GitHub login se deploy hota hai, **card bilkul nahi mangta**, free tier permanent hai (256MB RAM — humara ONNX backend iske liye optimize ho chuka hai: cv2-free stack + teeno int8 models + LRU memory cap).

## Kya deploy hoga

- ONNX engine (torch-free) — teeno **int8-quantized models** (~24MB each, 256MB RAM me fit)
- LRU memory cap: 2 models loaded rehte hain, teesra demand pe swap (RAM kabhi OOM nahi hoti)
- Heatmap: Activation Mapping (Grad-CAM equivalent for ResNet) — viva ke liye `docs/VIVA-QA.md`
- Modality gate: photo aaye to reject (HTTP 422 `not_a_scan`)
- Dynamic `PORT` — container platform khud set karta hai

---

## Deploy steps (10 min, card nahi chahiye)

### Step 1 — Account
1. https://www.back4app.com → **Sign up** → **Continue with GitHub**
2. GitHub authorize karo (repo access permission dena)

### Step 2 — Deploy
1. Dashboard → **Build an app** → **Containers** (ya "New Container App")
2. **Import from GitHub** → repo select karo: `taha12-ok/Final-Year-project-Backend`
   - Pehli dafa GitHub permission maang sakta hai — All repositories ya select karo
3. Settings:
   - **Branch:** `main`
   - **Root directory:** *(khali chhodo — repo root)*
   - **Dockerfile:** khali chhodo (root `Dockerfile` auto-detect hoga — wo already free-tier wala hai)
4. **Create / Deploy** dabao

### Step 3 — Environment variables (Deploy settings me)
| Key | Value |
|---|---|
| `PRELOAD_MODELS` | `1` |
| `MAX_LOADED_MODELS` | `2` |
| `ORT_THREADS` | `1` |

> `PORT` Back4App khud inject karta hai — set karne ki zaroorat nahi.

### Step 4 — Wait for build (~5-8 min)
- Build logs me dikhega: pip install → models copy → uvicorn start
- "Live" hone pe **URL milega** (e.g. `https://medai-backend-xxxx.b4a.run`)

### Step 5 — Frontend connect
1. **Vercel** → apna project → **Settings → Environment Variables**
2. `NEXT_PUBLIC_BACKEND_URL` = Back4App ka URL (copy from Step 4)
3. **Redeploy** karo frontend ka

---

## Test checklist (deploy ke baad)

```bash
# Health
curl https://YOUR-APP.b4a.run/health

# Fracture X-ray test (t_fracture.jpg = koi X-ray image)
curl -X POST https://YOUR-APP.b4a.run/predict/fracture -F "file=@t_fracture.jpg"

# Random photo reject hona chahiye (HTTP 422)
curl -X POST https://YOUR-APP.b4a.run/predict/brain -F "file=@random_photo.jpg"
```

Expected: `confidence`, `modality_gate.score > 0.5`, `gradcam_image` (base64) — random photo pe `not_a_scan` error.

---

## Agar Back4App kaam na kare — backup: Render (free, card nahi)

1. render.com → **New Web Service** → GitHub repo
2. Runtime: **Docker** → Instance Type: **Free** (dhyan se $0 wala — paid select hua to card dialog khul jata hai)
3. Env vars same as Step 3
4. Dockerfile path: `./Dockerfile.free` (agar root Dockerfile auto-detect na ho)

---

## Local test (deploy se pehle verify)

```bash
PRELOAD_MODELS=1 MAX_LOADED_MODELS=2 ORT_THREADS=1 uvicorn main:app --port 8000
# Teen predictions + 1 random-photo-reject + PDF report test karo
```

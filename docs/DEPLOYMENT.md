# 🚀 Backend Deployment — 100% FREE, no credit card

> ⚠️ **Zaroori baat:** Back4App Containers free plan ka URL **TEMPORARY hota hai (har deployment pe ~60 min zinda)** — screenshot pe "Temporary URL Active" banner isi liye hai. Permanent URL paid plan me hai.
>
> **Isliye final plan ye hai:**
> - **Testing / aaj ka demo:** Back4App (pehle se deployed, live) ✅
> - **Permanent (website hamesha live):** **Render.com Free instance** — card NAHI mangta (Free instance select karne pe), permanent URL milta hai, bas 15 min inactivity ke baad cold-start (~50s) hota hai

## Current live URLs

| Platform | URL | Note |
|---|---|---|
| Back4App (temporary) | `https://fypbackend-8wadjfi2.b4a.run` | ~60 min zinda, har deploy pe naya |
| Render (permanent) | deploy karne ke baad milega | neeche steps |

---

## Render deploy — permanent URL (10 min, card nahi)

1. **render.com** → Sign up with GitHub
2. **New + → Web Service** → `taha12-ok/Final-Year-project-Backend` connect karo
3. **⚠️ Instance Type: FREE (0.1 CPU / 512 MB) select karo — $0 wala.** (Paid/Starter select hua to card ka dialog khul jata hai — wo cancel karke Free chuno)
4. Runtime: **Docker** → Dockerfile path: `./Dockerfile` (root wala free-tier hai)
5. Environment variables:
   - `PRELOAD_MODELS` = `1`
   - `MAX_LOADED_MODELS` = `2` (Render 512MB pe `3` bhi kar sakte ho)
   - `ORT_THREADS` = `1`
6. **Create Web Service** → build ~5-8 min → permanent URL (e.g. `medai-backend.onrender.com`)
7. **Vercel** → project → Settings → Environment Variables → `NEXT_PUBLIC_BACKEND_URL` = Render URL → **Redeploy**

> Cold start: free instance 15 min idle ke baad so jata hai; pehli request ~50s leti hai, phir fast. Demo se pehle ek baar /health kholein — garam ho jayega.

## Kya deploy hoga

- ONNX engine (torch-free) — teeno **int8-quantized models** (~24MB each, 256MB RAM me fit)
- LRU memory cap: 2 models loaded rehte hain, teesra demand pe swap (RAM kabhi OOM nahi hoti)
- Heatmap: Activation Mapping (Grad-CAM equivalent for ResNet) — viva ke liye `docs/VIVA-QA.md`
- Modality gate: photo aaye to reject (HTTP 422 `not_a_scan`)
- Dynamic `PORT` — container platform khud set karta hai

---

## Back4App deploy steps (testing ke liye — URL temporary rehta hai)

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

### Step 5 — Frontend connect (temporary testing)
1. **Vercel** → apna project → **Settings → Environment Variables**
2. `NEXT_PUBLIC_BACKEND_URL` = Back4App ka URL (copy from Step 4)
3. **Redeploy** karo frontend ka
4. ⚠️ Har naye Back4App deploy ka naya temporary URL hoga — Vercel env update karna hoga. Permanent solution upar Render wala hai.

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

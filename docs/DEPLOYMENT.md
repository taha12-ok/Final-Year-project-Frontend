# 🚀 Backend Deployment — 100% FREE (Render free tier + ONNX)

> **Update:** HF Spaces ab Docker Spaces ke liye PRO maangta hai, isliye hum **Render.com free tier** pe deploy karte hain — ONNX engine ke sath (torch-free, 512MB RAM me fit, permanent URL).

## Kaam kaise karta hai (dual engine)

- Notebook ab har model ka **int8-quantized ONNX export** bhi banati hai (`*_model_int8.onnx`, ~24MB each)
- Backend khud detect karta hai: ONNX files hon to **ONNX engine** (torch-free, chhota RAM) — warna PyTorch `.pth`
- Heatmap: ONNX mode me **Activation Mapping** (Grad-CAM ka equivalent for ResNet) — viva me explain karne ke liye `docs/VIVA-QA.md` dekho

---

## Step 1 — Kaggle notebook run karo (agar abhi tak nahi kiya)

1. kaggle.com → apni notebook → **File → Import Notebook** → `docs/kaggle/MedAI_Retraining.ipynb`
2. Right panel → **Session options → Accelerator → GPU T4**
3. **Add Input** → ye 3 datasets add karo (search by name):
   - `Bone Fracture Multi-Region X-ray Data` (bmadushanirodrigo)
   - `Brain Tumor MRI Dataset` (masoudnickparvar)
   - `CT KIDNEY DATASET: Normal-Cyst-Tumor and Stone` (nazmul0087)
   - **Bonus (gate ke liye):** koi bhi normal photos dataset — jaise `cats and dogs images classification`
   - *Aur jo bhi 15 datasets tumne already add kiye hain — notebook keywords se khud sahi wali pakad legi*
4. **Run All** → ~60-90 min → right panel Output → `/kaggle/working` → `medai_v2_package.zip` **⬇**

## Step 2 — Backend repo me files daalo

`medai_v2_package.zip` extract karo, aur ye files `FYP-backend` folder me copy karo (local: `C:\Users\ESHOP\Desktop\FYP-backend`):

```
fracture_model.pth, brain_model.pth, kidney_model.pth      → root
fracture_model_int8.onnx, brain_model_int8.onnx, kidney_model_int8.onnx  → root
temperature.json, modality_gate.json                        → root
metrics/fracture.json, metrics/brain.json, metrics/kidney.json → metrics/
```

Phir push:
```bash
cd C:\Users\ESHOP\Desktop\FYP-backend
git add .
git commit -m "v2 models + ONNX + calibration"
git push origin main
```

## Step 3 — Render pe deploy (free)

1. **render.com** → GitHub se sign up/login
2. **New + → Web Service**
3. Tumhara repo connect karo: `taha12-ok/Final-Year-project-Backend`
   - Agar repo list me na aaye: render.com dashboard → account settings → **GitHub permissions** me repo access grant karo
4. Settings:
   - **Name:** `medai-backend`
   - **Region:** Singapore (Pakistan ke liye fastest)
   - **Branch:** `main`
   - **Runtime:** **Docker**
   - **Dockerfile path:** `./Dockerfile.free`
   - **Instance Type:** **Free**
5. **Environment Variables** add karo:
   - `ALLOWED_ORIGINS` = `https://final-year-project-medai.vercel.app,http://localhost:3000`
   - `PRELOAD_MODELS` = `1`
6. **Create Web Service** → build ~5-8 min → live!

Tumhara URL: `https://medai-backend-XXXX.onrender.com` (Render dashboard pe dikhega)

**Test:**
- `https://<tumhara-url>/` → `{"message": "MedAI Screening API v2 ✅", ...}`
- `https://<tumhara-url>/health` → `{"engine": "onnx", ...}` (agar ONNX models push kiye)

## Step 4 — Vercel env update

1. vercel.com → project → Settings → Environment Variables
2. `NEXT_PUBLIC_BACKEND_URL` = `https://<tumhara-render-url>`
3. Redeploy

## Step 5 — Live verification

1. Site kholo → kisi bhi screening pe real X-ray upload karo → result aana chahiye
2. Random selfie upload karo → **"This doesn't look like a medical scan"** amber warning (modality gate working)
3. `/lab` kholo → metrics dikhne lagenge (agar metrics/*.json push kiye)

---

## ⚠️ Free tier notes (Render)

- **15 min idle ke baad service sleep** hoti hai — pehli request pe ~30-50 sec cold start. Demo se pehle ek baar URL khol lena (wake up ho jayegi).
- **750 hours/month free** — ek service 24/7 ke liye kaafi hai.
- Agar speed aur zimmedari barhani ho to $7/month starter tier bhi hai (optional, free zaroori nahi).

## HF Spaces alternative (agar kabhi PRO le ho)

HF ab Docker Spaces ke liye PRO maangta hai. PRO ho to:
1. huggingface.co → New Space → SDK: **Docker** → name `medai-backend`
2. Backend repo me: `git remote add space https://huggingface.co/spaces/tahashabbir/medai-backend`
3. `git push space main --force` (token password me)
4. Vercel env me HF URL dal do

## Checklist
- [ ] Kaggle notebook run → package zip download
- [ ] Backend repo me files copy + push
- [ ] Render service create (Docker, Dockerfile.free, free tier)
- [ ] `/` aur `/health` live check
- [ ] Vercel `NEXT_PUBLIC_BACKEND_URL` update + redeploy
- [ ] Live site se scan analyze + selfie rejection test ✅

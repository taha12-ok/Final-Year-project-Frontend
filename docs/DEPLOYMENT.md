# 🚀 HF Spaces Deployment — Colab khatam, permanent backend (FREE)

> **Kya milega:** 24/7 chalne wala backend URL — na Colab cell chalana, na ngrok, na har demo se pehle setup. Sab kuch **100% free** hai.

---

## Step 1 — HF Account + Token (5 min)

1. **huggingface.co** → **Sign Up** (free, email se ho jata hai)
2. Right-top profile photo → **Settings** → left me **Access Tokens**
3. **Create new token**:
   - Name: `medai-backend`
   - Role/Permission: **Write**
4. Token copy karo ( `hf_...` se start hota hai) — ye sirf push ke waqt chahiye

## Step 2 — New Space banao (2 min)

1. huggingface.co → **New → Space**
2. **Space name:** `medai-backend`
3. **SDK:** **Docker** → **Blank** template
4. **Visibility:** **Public** (free CPU quota + Vercel se call ho sake; code public hoga — usme koi key nahi hai, models bhi publicly available datasets se trained hain — theek hai)
5. **Create Space** → khali Space ban jayegi

## Step 3 — Local machine pe backend repo ready karo

```bash
# 1. GitHub repo clone karo
git clone https://github.com/taha12-ok/Final-Year-project-Backend.git
cd Final-Year-project-Backend

# 2. Backend-upgrade files copy karo (main ne ye folder bana rakha hai):
#    Frontend repo ke andar: backend-upgrade/
#    Copy: main.py, modality.py, calibration.py, requirements.txt, Dockerfile
cp /c/Users/ESHOP/Desktop/Final\ Year\ Project\ FYP/backend-upgrade/main.py .
cp /c/Users/ESHOP/Desktop/Final\ Year\ Project\ FYP/backend-upgrade/modality.py .
cp /c/Users/ESHOP/Desktop/Final\ Year\ Project\ FYP/backend-upgrade/calibration.py .
cp /c/Users/ESHOP/Desktop/Final\ Year\ Project\ FYP/backend-upgrade/requirements.txt .
cp /c/Users/ESHOP/Desktop/Final\ Year\ Project\ FYP/backend-upgrade/Dockerfile .

# 3. metrics folder banao (notebook ke outputs ke liye)
mkdir -p metrics
touch metrics/.gitkeep
```

> **Abhi (purane models ke saath bhi chalega)** — naye models notebook se aane ke baad bhi ye files replace ho jayengi (same names), to abhi push kar sakte ho.

## Step 4 — HF Space me push karo

```bash
# HF Space ke remote ko add karo (username aur Space name apna dalna):
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/medai-backend

# Push (username: $hf username, password: Step-1 wala token)
git push space main --force
```

Push ke baad Space ke **Logs** tab me dekho:
- `Installing requirements...` (~4-5 min, torch waghera)
- `Loading fracture model... Loading brain model... Loading kidney model...`
- Jab **`Running on http://0.0.0.0:8000`** aaye → **live!**

Tumhara URL hoga: `https://YOUR_USERNAME-medai-backend.hf.space`

**Turant test:**
- `https://YOUR_USERNAME-medai-backend.hf.space/` → `{"message": "MedAI Screening API v2 ✅", ...}`
- `/docs` → Swagger UI khud dekh lo

## Step 5 — Vercel env update (2 min)

1. vercel.com → project → **Settings → Environment Variables**
2. `NEXT_PUBLIC_BACKEND_URL` = `https://YOUR_USERNAME-medai-backend.hf.space`
3. **Redeploy** karo

## Step 6 — Naye models (notebook ke baad)

Kaggle notebook (`docs/kaggle/MedAI_Retraining.ipynb`) run karke `medai_v2_package.zip` milega:
- `fracture_model.pth`, `brain_model.pth`, `kidney_model.pth` → repo root me daalo (purane replace)
- `temperature.json` → repo root me
- `modality_gate.json` → repo root me
- `metrics/fracture.json`, `metrics/brain.json`, `metrics/kidney.json` → `metrics/` folder me
- Phir dobara: `git add . && git commit -m "v2 models" && git push space main --force`

Done! `/lab` page pe metrics live dikhne lagenge aur random-photo rejection active ho jayegi (trained gate).

---

## ⚠️ Zaroori notes

- **Sleep/timeout:** HF free Spaces ke free CPU pe **24/7 chalta hai**; 48h idle ke baad Space pause ho sakti hai — Space page pe jaake **Restart** karna hai (ya factory reset). Demo se pehle ek baar URL khol lena.
- **Cold start:** Space restart ke baad pehli request pe models load hote hain (~1 min) — `PRELOAD_MODELS=1` isliye diya hai.
- **CORS:** backend me `ALLOWED_ORIGINS` env me Vercel URL hai; HF pe default theek hai. Naya domain add karna ho to Space → Settings → Variables me `ALLOWED_ORIGINS` set karo.
- **Model files bari hain (~94 MB each):** pehli push me thora time lagega. HF free LFS quota (50GB) me 3 models asani fit ho jate hain.

## Checklist
- [ ] HF account + write token
- [ ] Space created (Docker, public)
- [ ] Backend-upgrade files repo me copy + push
- [ ] Space URL live check (`/` aur `/docs`)
- [ ] Vercel `NEXT_PUBLIC_BACKEND_URL` update + redeploy
- [ ] Website se ek scan analyze kar ke dekha ✅

# 🔐 SECURITY — Ye abhi kar do (10 minute)

> **Kyun zaroori hai:** Groq key, ngrok token aur Gmail app password leak ho chuke hain (chat paste + frontend repo ke purane `.env.example` me). Jo bhi ye dekh le, tumhare naam pe quota use kar sakta hai ya tumhari email bhej sakta hai. Steps exact hain — bas click karte jao.

---

## 1. Groq API Key Rotate karo
1. **console.groq.com** kholo → login (Google)
2. Left sidebar **API Keys** → purani key (`gsk_gmBD...`) dikhegi
3. **Delete/Revoke** → phir **Create API Key** → nayi key copy karo
4. Nayi key sirf: `.env.local` (`GROQ_API_KEY=`) + Vercel dashboard — repo me kabhi nahi

## 2. ngrok Authtoken Revoke karo
1. **dashboard.ngrok.com** kholo
2. **Universal Authtoken** → apna token (`381ee3...`) → **Revoke/Delete**
3. **Done** — HF Spaces pe shift ke baad ngrok ki zaroorat hi nahi rahegi ✅

## 3. Gmail App Password Remove karo
1. **myaccount.google.com/apppasswords** (2-Step Verification on hona chahiye)
2. Purana app password entry **Delete** karo
3. Contact form email chahiye to **naya** banao (16 chars) — sirf `.env.local` + Vercel me

## 4. Vercel env update
- vercel.com → project → Settings → Environment Variables
- `GROQ_API_KEY` nayi key, `GMAIL_APP_PASSWORD` nayi value

---

## Checklist:
- [ ] Groq purani key revoked + nayi key `.env.local` + Vercel me
- [ ] ngrok token revoked
- [ ] Gmail app password removed (naya sirf .env.local/Vercel me)
- [ ] Botay "security done" 👍

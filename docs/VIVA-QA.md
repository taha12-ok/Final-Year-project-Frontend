# 🎓 Viva Q&A Sheet (Roman Urdu) — Ye sab tum explain kar sako

> Examiner ke common sawal + simple jawab. Har jawab me "kya hai" + "kyun kiya" dono hain — isi se lagta hai ke kaam samjha hua hai.

---

## 1. Temperature Scaling (Confidence Calibration)

**Sawal:** Tumhara model pehle har image pe 100% confident tha — ye problem kaise solve ki?

**Jawab:** Ye problem **overconfidence / poor calibration** kehte hain. Neural network softmax se confidence nikalta hai, lekin wo sirf *relative scores* deta hai — real probability nahi. Humne **temperature scaling** use ki: logits ko ek learned temperature `T` se divide kar ke softmax lagate hain.

- `T > 1` → probabilities flatten (zyada honest)
- `T < 1` → sharp (zyada confident)
- `T` validation set pe minimize ki: `CrossEntropy(logits / T, labels)` — ye Guo et al. 2015 ka standard technique hai ("On Calibration of Modern Neural Networks").

**Viva point:** "Ab model jab 70% bolta hai to 70% cases me sach me sahi hota hai — isi ko calibration kehte hain. Aur 60% se neeche confidence pe hum result ko 'inconclusive' mark karte hain instead of forcing a wrong answer."

---

## 2. Out-of-Distribution Detection (Random Photo ka Masla)

**Sawal:** Agar koi selfie ya normal hand ki photo dale to kya hota hai?

**Jawab:** Ye **OOD (out-of-distribution) input** hota hai. Humne 2-layer defense banayi:

1. **Modality Gate** — halka classifier (7 simple features: grayscale ratio, saturation, edge density, color cast, texture) jo decide karta hai image medical scan hai ya normal photo. Ye Kaggle pe scans (positives) vs normal photos (negatives) pe train hua hai. Photo aayi to model tak nahi jati — seedha message: "Yeh X-ray/MRI/CT nahi lagti."
2. **Confidence Gate** — agar phir bhi koi ajeeb image nikal jaye, to calibrated confidence check hoti hai. Low confidence → "inconclusive" verdict, forced 100% claim nahi.

**Viva point:** "Ye medical AI me safety-critical hai — model ko us domain ke bahar ke inputs pe jawab dena hi nahi chahiye. Isko 'abstain when uncertain' principle kehte hain."

---

## 3. Grad-CAM

**Sawal:** Grad-CAM kya hai aur kaise kaam karta hai?

**Jawab:** **Gradient-weighted Class Activation Mapping** — model ka "focus area" visualise karta hai.

- Last convolutional layer ke feature maps lete hain
- Predicted class ke liye gradients nikaalte hain
- Har feature map ko gradient se weight karke average karte hain → heatmap
- Heatmap ko original image pe overlay karte hain — red/yellow = model ne wahan dekha

**Viva point:** "Isse interpretability milti hai — agar model fracture bole lekin Grad-CAM dikhae ke wo bone pe hi focus kar raha hai, to trust badhta hai. Agar kisi ajeeb corner pe focus kare to humein pata chal jata hai ke model galat feature seekh raha hai."

---

## 4. Data Augmentation & Class Imbalance

**Sawal:** Training me kya kiya taake model overfit na ho?

**Jawab:** 5 cheezein:
1. **Augmentation** — random crop, flip, rotation (±7°), brightness/contrast jitter — model ko har epoch me thora different image dikhti hai
2. **Class weights** — agar fractured images kam hain to unki error ka weight zyada — model minority class ignore nahi karta
3. **Label smoothing (0.05)** — model 100% sure hone ki bajaye 95% pe seekhta hai — overconfidence kam
4. **Early stopping** — validation accuracy improve nahi hoti to ruk jao — memorization se bachao
5. **Separate test set** — jo training me kabhi nahi dekha — final number usi ka hai (honest evaluation)

---

## 5. Class Imbalance Handling

**Sawal:** Dataset me ek class ki images zyada hon to kya hota hai?

**Jawab:** Model majority class pe bias ho jata hai (e.g. sab images ko "Normal" bol de aur 80% accuracy aa jaye — lekin patients miss!). Humne **weighted CrossEntropyLoss** use kiya: har class ka weight = total/count. Isse minority class ki errors zyada punish hoti hain. Overall accuracy ke sath hum **per-class F1** aur **confusion matrix** bhi dekhte hain — sirf accuracy dhoka de sakti hai.

---

## 6. Transfer Learning

**Sawal:** ResNet50 kyun? ImageNet weights kyun?

**Jawab:** Medical datasets chhote hote hain (thousands, not millions). **Transfer learning** me ImageNet pe pretrained model lete hain — pehle layers already edges, textures, shapes seekh chuki hoti hain. Sirf last layer (fc) hamari classes pe train hoti hai + fine-tuning. Isse:
- Kam data me achi accuracy
- Fast convergence
- Better generalization

---

## 7. Architecture Decisions

**Sawal:** Frontend aur backend alag kyun?

**Jawab:** Separation of concerns:
- **Frontend (Next.js/Vercel)** — UI, chat assistant, API key safely server-side
- **Backend (FastAPI/HF Spaces)** — heavy PyTorch inference, GPU-friendly, models ki privacy
- Dono independently scale/deploy ho sakte hain. CORS + rate limiting se backend sirf authorized frontend se accept karta hai.

**Sawal:** Groq API key frontend me kyun nahi?

**Jawab:** API keys client-side pe leak ho jati hain. Isliye Next.js API route (server) ke through jata hai — key sirf server env me rehti hai. Ye industry standard hai.

---

## 8. Security (Examiner zaroor poochta hai)

**Jawab ke points:**
- **CORS whitelist** — sirf humara frontend hi backend call kar sakta hai
- **Rate limiting** — abuse/DoS se bachao (30 req/min per IP)
- **Input validation** — file size, type, corrupted images handle
- **No PHI storage** — patient data server pe store nahi hota, sirf PDF generation ke liye transient
- **Secrets in env** — kabhi repo me nahi
- **Inconclusive results** — model uncertainty ko honestly report karna bhi safety hai

---

## 9. "Agar model galat bole to?"

**Jawab:** Ye **sab se important sawal** hai. Honest answer:
- Model **screening aid** hai, diagnostic tool nahi
- Har result pe disclaimer hai — "qualified doctor se confirm karein"
- Confidence calibration se uncertainty visible hai — model apni limits batata hai
- Grad-CAM se doctor dekh sakta hai model ne kahan focus kiya — galat focus = reject the result
- Future work: ensemble models, more data, radiologist feedback loop

---

## 10. Future Work (Agar pooche)

- **More models** — chest X-ray (pneumonia), skin lesions, ECG
- **Ensemble** — multiple models ka vote — accuracy + robustness
- **Explainability++** — chest X-ray reports, attention maps
- **Mobile app** — React Native / PWA
- **Radiologist portal** — real clinics me pilot
- **Federated learning** — hospitals ka data bina share kiye train

---

## Quick One-Liners (Ratta nahi, samajh!)

| Term | One-liner |
|------|-----------|
| Temperature scaling | Logits ÷ T se softmax — confidence ko real probability banata hai |
| OOD detection | Model sirf apne domain (medical scans) pe jawab de, bahar ke inputs reject |
| Grad-CAM | Gradients se heatmap — model ne image me kahan dekha |
| Label smoothing | 100% sure hone ki saza — overconfidence control |
| Class weights | Minority class ke errors zyada punish — imbalance fix |
| Early stopping | Validation pe improve band = training band — overfitting se bachao |
| Macro F1 | Har class ka F1 average — imbalance me honest metric |
| Confusion matrix | Kaun si class kis me confuse ho rahi hai — visualization |
| Transfer learning | ImageNet se seekhi hui features ko medical domain me reuse |
| CORS | Kaunsi websites hi backend call kar sakti hain — whitelist |

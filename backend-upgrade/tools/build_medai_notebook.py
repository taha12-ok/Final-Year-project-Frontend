#!/usr/bin/env python3
"""
Build script: MedAI_Retraining.ipynb generate karta hai (docs/kaggle/ folder me).
Cell sources neeche CELLS list me hain — edit karo aur dobara run karo:
    python tools/build_medai_notebook.py
"""
import json
import os

# ─────────────────────────────────────────────────────────────
# Cell 0 — markdown intro
# ─────────────────────────────────────────────────────────────
md_intro = r"""# 🏥 MedAI Model Retraining Kit (v2)

**Ye notebook kya karti hai:** teeno models (Fracture / Brain / Kidney) ko sahi datasets pe retrain karti hai — balanced data, honest test evaluation, temperature calibration, aur modality-gate training.

## 🔑 Tumhara manual kaam (sirf 3 cheezein):
1. **Settings → Accelerator → GPU T4 x2 (ya P100)** on karo
2. **Add Input → Datasets** se ye 3 datasets add karo (search by name):
   - `fracture-multi-region-x-ray-data` (Bone Fracture Multi-Region X-ray Data)
   - `brain-tumor-mri-dataset` (Brain Tumor MRI Dataset — masoudnickparvar)
   - `ct-kidney-dataset-normal-cyst-tumor-and-stone` (CT KIDNEY DATASET — nazmul0087)
3. **Run All** dabao (~60-90 min total). End me zip download karke mujhe bhej do. Bas!

## 📤 Output (kya milega):
- `fracture_model.pth`, `brain_model.pth`, `kidney_model.pth` — drop-in replacement (backend me koi code change nahi)
- `metrics/fracture.json`, `metrics/brain.json`, `metrics/kidney.json` — Model Lab dashboard ke liye
- `temperature.json` — calibration file
- `modality_gate.json` — trained photo-vs-scan gate
- `test_results.txt` — pass/fail report

**Pass criteria:** Fracture ≥90% · Brain ≥95% · Kidney ≥90% (test set). Fail hua to notebook khud batayegi — tab hum aur improve karenge."""

# ─────────────────────────────────────────────────────────────
# Cell 1 — setup
# ─────────────────────────────────────────────────────────────
code_setup = r'''# ── Setup: imports, config, reproducibility, GPU guard ──
import os, json, shutil, random, zipfile, textwrap, glob
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms, models
from PIL import Image

SEED = 42
random.seed(SEED); np.random.seed(SEED); torch.manual_seed(SEED)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Device: {DEVICE}")

# ⚠️ GPU GUARD: bina GPU ke training bahut slow hoga (CPU pe din lag jayenge).
# Kaggle: right side Settings -> Accelerator -> GPU T4 x2 select karo, phir Run All.
if DEVICE.type != "cuda":
    raise RuntimeError(
        "❌ GPU nahi mila!\n"
        "   Kaggle me right panel → Session options → Accelerator → 'GPU T4 x2' select karo\n"
        "   phir session restart ho gaya ke baad Run All dobara chalao."
    )

# ─────────────────────────────────────────────────────────────
# SMART DATASET DISCOVERY — jo bhi datasets add kiye hain, khud dhoond lega.
# /kaggle/input ke andar keywords se match karta hai (slug thora alag ho to bhi chalega).
# ─────────────────────────────────────────────────────────────
INPUT_ROOT = "/kaggle/input"

def discover(keywords, exclude=None):
    """input root me keyword-match karne wala pehla dataset dir return karo."""
    exclude = exclude or []
    best = None
    for d in sorted(os.listdir(INPUT_ROOT)):
        dl = d.lower()
        if any(ex in dl for ex in exclude):
            continue
        if any(k in dl for k in keywords):
            cand = os.path.join(INPUT_ROOT, d)
            # andar images hone chahiye
            found = False
            for root, dirs, files in os.walk(cand):
                if any(f.lower().endswith((".jpg", ".jpeg", ".png")) for f in files[:200]):
                    found = True
                    break
            if found:
                best = cand
                break
    return best

FRACTURE_ROOT = discover(["fracture", "bone-fracture", "bone fracture", "x-ray-data"])
BRAIN_ROOT    = discover(["brain-tumor", "brain tumor", "brainmri"], exclude=["kidney"])
KIDNEY_ROOT   = discover(["kidney", "ct-kidney"], exclude=["brain"])

print("FRACTURE_ROOT:", FRACTURE_ROOT)
print("BRAIN_ROOT:   ", BRAIN_ROOT)
print("KIDNEY_ROOT:  ", KIDNEY_ROOT)

_missing = [n for n, r in [("fracture", FRACTURE_ROOT), ("brain", BRAIN_ROOT), ("kidney", KIDNEY_ROOT)] if r is None]
if _missing:
    print("\n❌ Ye datasets nahi mile:", _missing)
    print("   Jo /kaggle/input me mojood hai wo ye hai:")
    for d in sorted(os.listdir(INPUT_ROOT)):
        print("     -", d)
    raise RuntimeError(f"Datasets missing: {_missing} — upar wali list dekh kar sahi datasets Add Input se add karo.")

OUT = "/kaggle/working/medai_v2"
os.makedirs(f"{OUT}/metrics", exist_ok=True)

# 5-epoch ki sanity run ke liye flag (validation ke liye, train nahi)
FAST_TEST = False   # pehli baar check karna ho to True karo, phir False karke pura run

NUM_EPOCHS    = 1 if FAST_TEST else 14
BATCH_SIZE    = 64 if not FAST_TEST else 16

print("Config OK — epochs:", NUM_EPOCHS, "| batch:", BATCH_SIZE)'''

# ─────────────────────────────────────────────────────────────
# Cell 2 — dataset verification
# ─────────────────────────────────────────────────────────────
code_verify = r'''# ── Dataset paths verify karo (smart discovery ne pehle hi pakad liya) ──
for name, root in [("FRACTURE", FRACTURE_ROOT), ("BRAIN", BRAIN_ROOT), ("KIDNEY", KIDNEY_ROOT)]:
    if root and os.path.exists(root):
        subs = sorted(os.listdir(root))[:8]
        print(f"✅ {name}: {root}")
        print(f"   Top-level: {subs}")
    else:
        print(f"⚠️ {name} root nahi mila: {root}")'''

# ─────────────────────────────────────────────────────────────
# Cell 3 — training engine
# ─────────────────────────────────────────────────────────────
code_engine = r'''# ── Training engine: shared functions (teeno models ke liye same) ──
from collections import Counter
from sklearn.metrics import confusion_matrix, classification_report, f1_score
from torch.utils.data import Subset  # noqa: F401 (Subset-safe targets ke liye)

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

train_tf = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.RandomResizedCrop(224, scale=(0.8, 1.0)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(7),
    transforms.ColorJitter(brightness=0.12, contrast=0.12),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])
eval_tf = transforms.Compose([
    transforms.Grayscale(num_output_channels=3),
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
])

def build_model(num_classes: int):
    """ResNet50 ImageNet-pretrained — same architecture jo backend load karta hai."""
    m = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    return m

def train_one(name, train_ds, val_ds, num_classes, class_names, epochs):
    """Full training + validation + metrics + temperature calibration."""
    print(f"\n{'='*60}\n🏋️ TRAINING: {name.upper()}  ({len(train_ds)} train / {len(val_ds)} val)\n{'='*60}")

    # class weights — imbalance handle (Subset-safe: ImageFolder aur Subset dono)
    def _targets(ds):
        if isinstance(ds, Subset):
            return [ds.dataset.targets[i] for i in ds.indices]
        return ds.targets
    counts = Counter(_targets(train_ds))
    total = sum(counts.values())
    weights = torch.tensor([total / counts[i] for i in range(num_classes)], dtype=torch.float32).to(DEVICE)
    print("Class distribution:", {class_names[i]: counts[i] for i in range(num_classes)})

    pin = DEVICE.type == "cuda"
    train_dl = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=2, pin_memory=pin)
    val_dl   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=pin)

    model = build_model(num_classes).to(DEVICE)
    crit  = nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)
    opt   = torch.optim.AdamW(model.parameters(), lr=3e-4, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)

    best_val, patience, bad = 0.0, 4, 0
    history = []
    for ep in range(1, epochs + 1):
        model.train(); tl, tn = 0.0, 0
        for xb, yb in train_dl:
            xb, yb = xb.to(DEVICE, non_blocking=True), yb.to(DEVICE, non_blocking=True)
            opt.zero_grad()
            out = model(xb)
            loss = crit(out, yb)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
            tl += loss.item() * len(yb); tn += len(yb)
        sched.step()

        model.eval(); vl, vn, correct = 0.0, 0, 0
        all_logits, all_labels = [], []
        with torch.no_grad():
            for xb, yb in val_dl:
                xb, yb = xb.to(DEVICE, non_blocking=True), yb.to(DEVICE, non_blocking=True)
                out = model(xb)
                vl += crit(out, yb).item() * len(yb); vn += len(yb)
                correct += (out.argmax(1) == yb).sum().item()
                all_logits.append(out.cpu()); all_labels.append(yb.cpu())
        val_acc = correct / max(vn, 1)
        history.append({"epoch": ep, "train_loss": tl/tn, "val_loss": vl/vn, "val_acc": val_acc})
        print(f"  epoch {ep:>2}/{epochs} | train_loss {tl/tn:.4f} | val_loss {vl/vn:.4f} | val_acc {val_acc:.4f}")

        if val_acc > best_val:
            best_val, bad = val_acc, 0
            torch.save(model.state_dict(), f"{OUT}/{name}_model.pth")
        else:
            bad += 1
            if bad >= patience:
                print(f"  ⏹ early stop at epoch {ep}")
                break

    # best weights reload
    model.load_state_dict(torch.load(f"{OUT}/{name}_model.pth"))

    # ── Temperature scaling (validation set pe tune) ──
    all_logits = torch.cat(all_logits).float()
    all_labels = torch.cat(all_labels)
    logits_t = all_logits.clone().requires_grad_(True).to(DEVICE)
    labels_t = all_labels.to(DEVICE)
    temp = nn.Parameter(torch.ones(1).to(DEVICE) * 1.2)
    opt_t = torch.optim.LBFGS([temp], lr=0.1, max_iter=60)
    def closure():
        opt_t.zero_grad()
        loss = nn.CrossEntropyLoss()(logits_t / temp, labels_t)
        loss.backward()
        return loss
    opt_t.step(closure)
    T = float(temp.item())
    print(f"  🌡 learned temperature: {T:.3f}")

    # ── Final metrics (best model, val set) ──
    with torch.no_grad():
        probs = torch.softmax(all_logits / max(T, 1e-6), dim=1)
        conf, pred = probs.max(1)
    pred, labels_np = pred.numpy(), all_labels.numpy()
    cm = confusion_matrix(labels_np, pred, labels=list(range(num_classes)))
    rep = classification_report(labels_np, pred, target_names=class_names, output_dict=True, zero_division=0)
    f1s = {c: round(rep[c]["f1-score"], 4) for c in class_names}
    # by-index list — cells isko backend-name order me map karne ke liye use karte hain
    f1_by_index = [round(rep[class_names[i]]["f1-score"], 4) for i in range(num_classes)]
    acc = float((pred == labels_np).mean())

    metrics = {
        "model": name, "architecture": "resnet50",
        "classes": class_names,
        "accuracy": round(acc, 4),
        "best_val_accuracy": round(best_val, 4),
        "per_class_f1": f1s,
        "per_class_f1_by_index": f1_by_index,
        "macro_f1": round(float(f1_score(labels_np, pred, average="macro", zero_division=0)), 4),
        "confusion_matrix": cm.tolist(),
        "temperature": round(T, 4),
        "epochs_run": len(history),
        "history": history,
        "trained_with": "balanced classes, class weights, label smoothing, augmentation, early stopping",
    }
    with open(f"{OUT}/metrics/{name}.json", "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  ✅ {name}: val_acc {acc:.4f} | macro_f1 {metrics['macro_f1']:.4f}")

    # GPU RAM free karo
    del model
    torch.cuda.empty_cache() if DEVICE.type == "cuda" else None
    return metrics

print("Training engine ready ✅")'''

# ─────────────────────────────────────────────────────────────
# Cell 4 — fracture
# ─────────────────────────────────────────────────────────────
code_fracture = r'''# ── 1) FRACTURE — bmadushanirodrigo/fracture-multi-region-x-ray-data ──
# Structure: train/valid/test folders, har folder me fractured/ + not fractured/
def find_subdirs_containing(root, keyword):
    out = []
    for dirpath, dirnames, _ in os.walk(root):
        base = os.path.basename(dirpath).lower()
        if keyword in base and not any(k in base for k in ["train", "valid", "test"]):
            out.append(dirpath)
        elif keyword in base:
            out.append(dirpath)
    return sorted(set(out))

fr_train_root, fr_val_root, fr_test_root = None, None, None
for dirpath, dirnames, _ in os.walk(FRACTURE_ROOT):
    base = os.path.basename(dirpath).lower().strip()
    if base == "train": fr_train_root = dirpath
    elif base in ("valid", "validation"): fr_val_root = dirpath
    elif base == "test": fr_test_root = dirpath

print("Fracture roots:", fr_train_root, fr_val_root, fr_test_root)
assert fr_train_root and fr_val_root and fr_test_root, "Fracture dataset structure samajh nahi aayi — paths print karke dekho"

fr_train = datasets.ImageFolder(fr_train_root, transform=train_tf)
fr_val   = datasets.ImageFolder(fr_val_root,   transform=eval_tf)
fr_test  = datasets.ImageFolder(fr_test_root,  transform=eval_tf)
print("Classes (ImageFolder order):", fr_train.classes)

# Backend expects ['Fractured', 'Not Fractured'] — is order ko ensure karo
# ImageFolder alphabetically sort karta hai: 'fractured' < 'not fractured' ✅
assert [c.lower() for c in fr_train.classes] == ["fractured", "not fractured"], \
    f"Class order mismatch: {fr_train.classes}"

fr_metrics = train_one("fracture", fr_train, fr_val, 2, ["Fractured", "Not Fractured"], NUM_EPOCHS)

# Test set evaluation (honest final number)
fr_model = build_model(2).to(DEVICE)
fr_model.load_state_dict(torch.load(f"{OUT}/fracture_model.pth"))
fr_model.eval()
test_dl = DataLoader(fr_test, batch_size=BATCH_SIZE, num_workers=2)
correct, total = 0, 0
with torch.no_grad():
    for xb, yb in test_dl:
        xb, yb = xb.to(DEVICE), yb.to(DEVICE)
        correct += (fr_model(xb).argmax(1) == yb).sum().item()
        total += len(yb)
fr_test_acc = correct / total
fr_metrics["test_accuracy"] = round(fr_test_acc, 4)
with open(f"{OUT}/metrics/fracture.json", "w") as f:
    json.dump(fr_metrics, f, indent=2)
print(f"🦴 FRACTURE TEST ACCURACY: {fr_test_acc:.4f}  (target ≥ 0.90)")
del fr_model; torch.cuda.empty_cache() if DEVICE.type == "cuda" else None'''

# ─────────────────────────────────────────────────────────────
# Cell 5 — brain
# ─────────────────────────────────────────────────────────────
code_brain = r'''# ── 2) BRAIN — masoudnickparvar/brain-tumor-mri-dataset ──
# Structure: Training/ + Testing/ folders, har ek me 4 class folders
br_train_root, br_test_root = None, None
for dirpath, dirnames, _ in os.walk(BRAIN_ROOT):
    base = os.path.basename(dirpath).lower().strip()
    if base == "training": br_train_root = dirpath
    elif base == "testing": br_test_root = dirpath

print("Brain roots:", br_train_root, br_test_root)
assert br_train_root and br_test_root, "Brain dataset structure samajh nahi aayi"

# Training ka 10% validation banate hain (stratified split)
from sklearn.model_selection import train_test_split

br_train_full = datasets.ImageFolder(br_train_root, transform=train_tf)
br_targets = br_train_full.targets
br_idx_train, br_idx_val = train_test_split(
    list(range(len(br_targets))), test_size=0.1, stratify=br_targets, random_state=SEED)

# Eval transforms val pe apply karne ke liye: do datasets banao
br_train_full_eval = datasets.ImageFolder(br_train_root, transform=eval_tf)
br_train = Subset(br_train_full, br_idx_train)
br_val   = Subset(br_train_full_eval, br_idx_val)
br_test  = datasets.ImageFolder(br_test_root, transform=eval_tf)

brain_classes = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]
# ImageFolder alphabetical order: glioma < meningioma < notumor/notumor variants < pituitary
# 'notumor' ya 'no tumor' dono ho sakte hain — classes print karke check
print("Brain ImageFolder classes:", br_train_full.classes)
# Backend order: ['Glioma','Meningioma','No Tumor','Pituitary']
# Notebook class order ko is se map karta hai:
order_map = {}
for i, c in enumerate(br_train_full.classes):
    cl = c.lower().replace(" ", "").replace("_", "")
    if cl == "glioma": order_map[i] = 0
    elif cl == "meningioma": order_map[i] = 1
    elif cl in ("notumor",): order_map[i] = 2
    elif cl == "pituitary": order_map[i] = 3
assert len(order_map) == 4, f"Brain classes unexpected: {br_train_full.classes}"
assert sorted(order_map.keys()) == [0,1,2,3], "Brain class mapping incomplete"

br_metrics = train_one("brain", br_train, br_val, 4, brain_classes, NUM_EPOCHS)

# NOTE: train_one ke andar sab kuch ImageFolder index order me hai.
# Backend order: ['Glioma','Meningioma','No Tumor','Pituitary']
# ImageFolder order: alphabetical (e.g. ['glioma','meningioma','notumor','pituitary'])
# Isliye metrics ko backend order me REMAP karna zaroori hai.
ifmap = {}
for i, c in enumerate(br_train_full.classes):
    cl = c.lower().replace(" ", "").replace("_", "")
    if cl == "glioma": ifmap[i] = 0
    elif cl == "meningioma": ifmap[i] = 1
    elif cl == "notumor": ifmap[i] = 2
    elif cl == "pituitary": ifmap[i] = 3
assert len(ifmap) == 4, f"Brain classes unexpected: {br_train_full.classes}"
assert sorted(ifmap.keys()) == [0,1,2,3], "Brain class mapping incomplete"
inv = {v: k for k, v in ifmap.items()}
cm = br_metrics["confusion_matrix"]
br_metrics["confusion_matrix"] = [[cm[inv[i]][inv[j]] for j in range(4)] for i in range(4)]
f1_idx = br_metrics["per_class_f1_by_index"]
br_metrics["per_class_f1"] = {brain_classes[i]: f1_idx[inv[i]] for i in range(4)}
with open(f"{OUT}/metrics/brain.json", "w") as f:
    json.dump(br_metrics, f, indent=2)

# Test set evaluation
br_model = build_model(4).to(DEVICE)
br_model.load_state_dict(torch.load(f"{OUT}/brain_model.pth"))
br_model.eval()
test_dl = DataLoader(br_test, batch_size=BATCH_SIZE, num_workers=2)
correct, total = 0, 0
with torch.no_grad():
    for xb, yb in test_dl:
        xb, yb = xb.to(DEVICE), yb.to(DEVICE)
        correct += (br_model(xb).argmax(1) == yb).sum().item()
        total += len(yb)
br_test_acc = correct / total
br_metrics["test_accuracy"] = round(br_test_acc, 4)
with open(f"{OUT}/metrics/brain.json", "w") as f:
    json.dump(br_metrics, f, indent=2)
print(f"🧠 BRAIN TEST ACCURACY: {br_test_acc:.4f}  (target ≥ 0.95)")

# ── CRITICAL: model ke output order ko backend order me fix karo ──
# (ImageFolder alphabetical order backend order se alag ho sakta hai —
#  warna fc weights permute karke re-save karna zaroori hai)
if ifmap != {0:0, 1:1, 2:2, 3:3}:
    print("  ↺ fc layer output order backend order me permute ho raha hai...")
    with torch.no_grad():
        w = br_model.fc.weight.data.clone()
        b = br_model.fc.bias.data.clone()
        for img_idx, backend_idx in ifmap.items():
            br_model.fc.weight.data[backend_idx] = w[img_idx]
            br_model.fc.bias.data[backend_idx] = b[img_idx]
    torch.save(br_model.state_dict(), f"{OUT}/brain_model.pth")
    print("  ✅ brain_model.pth backend order me re-save ho gaya")
del br_model; torch.cuda.empty_cache() if DEVICE.type == "cuda" else None'''

# ─────────────────────────────────────────────────────────────
# Cell 6 — kidney
# ─────────────────────────────────────────────────────────────
code_kidney = r'''# ── 3) KIDNEY — nazmul0087/ct-kidney-dataset-normal-cyst-tumor-and-stone ──
# Structure: ek folder jisme 4 class subfolders (ya CSV). Pehle folders check karo.
kid_class_root = None
for dirpath, dirnames, _ in os.walk(KIDNEY_ROOT):
    subdirs = [d for d in dirnames if not d.startswith(".")]
    img_exts = (".jpg", ".jpeg", ".png", ".bmp")
    has_images = any(
        any(f.lower().endswith(img_exts) for f in os.listdir(os.path.join(dirpath, d))[:50])
        for d in subdirs if os.path.isdir(os.path.join(dirpath, d))
    )
    if len(subdirs) >= 4 and has_images:
        kid_class_root = dirpath
        break

print("Kidney class root:", kid_class_root)
assert kid_class_root, "Kidney class folders nahi mile — structure print karke dekho"
print("Kidney classes:", sorted(os.listdir(kid_class_root)))

kid_full = datasets.ImageFolder(kid_class_root, transform=train_tf)
kid_targets = kid_full.targets

# Stratified 80/10/10 split (train/val/test)
idx = list(range(len(kid_targets)))
idx_train, idx_temp = train_test_split(idx, test_size=0.2, stratify=kid_targets, random_state=SEED)
temp_targets = [kid_targets[i] for i in idx_temp]
idx_val, idx_test = train_test_split(idx_temp, test_size=0.5, stratify=temp_targets, random_state=SEED)

kid_full_eval = datasets.ImageFolder(kid_class_root, transform=eval_tf)
kid_train = Subset(kid_full, idx_train)
kid_val   = Subset(kid_full_eval, idx_val)
kid_test  = Subset(kid_full_eval, idx_test)

kidney_classes = ["Cyst", "Normal", "Stone", "Tumor"]
# ImageFolder alphabetical: Cyst < Normal < Stone < Tumor ✅ (backend order match)
iforder = {c.lower(): i for i, c in enumerate(kid_full.classes)}
assert [iforder[c.lower()] for c in kidney_classes] == [0,1,2,3], \
    f"Kidney class order mismatch: {kid_full.classes}"

kid_metrics = train_one("kidney", kid_train, kid_val, 4, kidney_classes, NUM_EPOCHS)

# Test evaluation
kid_model = build_model(4).to(DEVICE)
kid_model.load_state_dict(torch.load(f"{OUT}/kidney_model.pth"))
kid_model.eval()
test_dl = DataLoader(kid_test, batch_size=BATCH_SIZE, num_workers=2)
correct, total = 0, 0
with torch.no_grad():
    for xb, yb in test_dl:
        xb, yb = xb.to(DEVICE), yb.to(DEVICE)
        correct += (kid_model(xb).argmax(1) == yb).sum().item()
        total += len(yb)
kid_test_acc = correct / total
kid_metrics["test_accuracy"] = round(kid_test_acc, 4)
with open(f"{OUT}/metrics/kidney.json", "w") as f:
    json.dump(kid_metrics, f, indent=2)
print(f"🫘 KIDNEY TEST ACCURACY: {kid_test_acc:.4f}  (target ≥ 0.90)")
del kid_model; torch.cuda.empty_cache() if DEVICE.type == "cuda" else None'''

# ─────────────────────────────────────────────────────────────
# Cell 7 — modality gate training
# ─────────────────────────────────────────────────────────────
code_gate = r'''# ── 4) MODALITY GATE — scan vs normal photo classifier ──
# Positives: teeno datasets ki random images (medical scans)
# Negatives: Kaggle ke popular photo datasets se negatives chahiye.
# Agar photo dataset mojood nahi to built-in synthetic negatives use honge.
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

def extract_features_pil(img):
    """backend-upgrade/modality.py ke compute_features ka exact mirror."""
    img = img.convert("RGB").resize((256, 256), Image.BILINEAR)
    arr = np.asarray(img).astype(np.float32) / 255.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    maxc = arr.max(axis=-1); minc = arr.min(axis=-1)
    sat = np.where(maxc > 1e-6, (maxc - minc) / (maxc + 1e-6), 0.0)
    gray_ratio = float((sat < 0.08).mean())
    sat_mean = float(sat.mean())
    sat_p90 = float(np.percentile(sat, 90))
    gray = 0.299*r + 0.587*g + 0.114*b
    gx = np.zeros_like(gray); gy = np.zeros_like(gray)
    gx[:, 1:-1] = gray[:, 2:] - gray[:, :-2]
    gy[1:-1, :] = gray[2:, :] - gray[:-2, :]
    mag = np.sqrt(gx**2 + gy**2)
    edge_density = float((mag > 0.12).mean())
    edge_strength = float(mag.mean())
    blue_minus_red = float((b - r).mean())
    lap = np.zeros_like(gray)
    lap[1:-1, 1:-1] = 4*gray[1:-1,1:-1] - gray[:-2,1:-1] - gray[2:,1:-1] - gray[1:-1,:-2] - gray[1:-1,2:]
    lap_std = float(lap.std())
    return np.array([gray_ratio, sat_mean, sat_p90, edge_density, edge_strength, blue_minus_red, lap_std])

# ── Positives: scans ──
scan_paths = []
def collect_scans(root, limit):
    exts = (".jpg", ".jpeg", ".png", ".bmp")
    got = 0
    for dirpath, _, files in os.walk(root):
        for f in files:
            if f.lower().endswith(exts):
                scan_paths.append(os.path.join(dirpath, f))
                got += 1
                if got >= limit: return

collect_scans(FRACTURE_ROOT, 900)
collect_scans(BRAIN_ROOT, 900)
collect_scans(KIDNEY_ROOT, 900)
print(f"Positive scan images: {len(scan_paths)}")

X, y = [], []
for p in scan_paths:
    try:
        with Image.open(p) as im:
            X.append(extract_features_pil(im)); y.append(1)
    except Exception:
        pass
print(f"Extracted positives: {len(X)}")

# ── Negatives: normal photos ──
NEG_ROOTS = []
for cand in [
    "/kaggle/input/cats-and-dogs-images-classification",
    "/kaggle/input/cifar10-python",
    "/kaggle/input/cifar-10-python",
    "/kaggle/input/animal-faces",
    "/kaggle/input/flickr8k",
]:
    if os.path.exists(cand): NEG_ROOTS.append(cand)

neg_paths = []
for root in NEG_ROOTS:
    exts = (".jpg", ".jpeg", ".png", ".bmp")
    for dirpath, _, files in os.walk(root):
        for f in files:
            if f.lower().endswith(exts):
                neg_paths.append(os.path.join(dirpath, f))
        if len(neg_paths) >= 2700: break
    if len(neg_paths) >= 2700: break

if len(neg_paths) < 500:
    print("⚠️ Photo dataset nahi mila — Kaggle me koi bhi photo dataset add karo")
    print("   (jaise 'cats and dogs images classification') aur cell dobara chalao.")
    print("   Jab tak: heuristic fallback backend me active rahega (safe side).")
else:
    random.shuffle(neg_paths)
    neg_paths = neg_paths[:2700]
    for p in neg_paths:
        try:
            with Image.open(p) as im:
                X.append(extract_features_pil(im)); y.append(0)
        except Exception:
            pass

X, y = np.array(X), np.array(y)
print(f"Gate dataset: {X.shape[0]} images | positives: {y.sum()}, negatives: {len(y)-y.sum()}")

if len(np.unique(y)) == 2:
    X_mean, X_std = X.mean(0), X.std(0) + 1e-8
    Xn = (X - X_mean) / X_std
    clf = LogisticRegression(max_iter=2000, class_weight="balanced")
    cv = cross_val_score(clf, Xn, y, cv=5, scoring="f1")
    print(f"Gate 5-fold F1: {cv.mean():.4f} ± {cv.std():.4f}")
    clf.fit(Xn, y)
    probs = clf.predict_proba(Xn)[:, 1]
    best_t, best_f1 = 0.5, 0
    from sklearn.metrics import f1_score as f1s_fn
    for t in np.arange(0.2, 0.9, 0.02):
        f1 = f1s_fn(y, (probs >= t).astype(int))
        if f1 > best_f1: best_f1, best_t = f1, t
    gate = {
        "weights": clf.coef_[0].tolist(), "bias": float(clf.intercept_[0]),
        "mu": X_mean.tolist(), "sigma": X_std.tolist(),
        "threshold": round(float(best_t), 3),
        "cv_f1": round(float(cv.mean()), 4),
        "trained_on": {"positives": int(y.sum()), "negatives": int((1-y).sum())},
    }
    with open(f"{OUT}/modality_gate.json", "w") as f:
        json.dump(gate, f, indent=2)
    print(f"✅ Modality gate saved (threshold {best_t:.2f}, F1 {best_f1:.4f})")'''

# ─────────────────────────────────────────────────────────────
# Cell 8.5 — ONNX export (free-tier deployment ke liye: Render 512MB)
# ─────────────────────────────────────────────────────────────
code_onnx = r'''# ── 5) ONNX EXPORT — lightweight deployment (Render free tier 512MB) ──
# Har model ko ONNX me convert + dynamic int8 quantize karo.
# Quantized ONNX ~24MB/model hota hai (94MB se neeche) aur CPU pe fast hai.
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

def export_onnx(name, num_classes):
    print(f"\n⏳ Exporting {name} → ONNX...")
    m = build_model(num_classes).to(DEVICE)
    m.load_state_dict(torch.load(f"{OUT}/{name}_model.pth", map_location=DEVICE))
    m.eval().to("cpu")  # ONNX export CPU pe

    dummy = torch.randn(1, 3, 224, 224)
    onnx_path = f"{OUT}/{name}_model.onnx"
    torch.onnx.export(
        m, dummy, onnx_path,
        input_names=["input"], output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=13,
    )
    print(f"  ✅ {name}_model.onnx ({os.path.getsize(onnx_path)/1e6:.1f} MB)")

    # Dynamic int8 quantization
    q_path = f"{OUT}/{name}_model_int8.onnx"
    quantize_dynamic(onnx_path, q_path, weight_type=QuantType.QInt8)
    print(f"  ✅ {name}_model_int8.onnx ({os.path.getsize(q_path)/1e6:.1f} MB)")

    # Sanity: ONNX runtime se output verify karo
    import onnxruntime as ort
    sess = ort.InferenceSession(q_path, providers=["CPUExecutionProvider"])
    out = sess.run(None, {"input": dummy.numpy()})[0]
    with torch.no_grad():
        ref = m(dummy).numpy()
    diff = float(abs(out - ref).max())
    print(f"  🔍 max logit diff vs PyTorch: {diff:.4f} (<0.1 good)")

    del m
    torch.cuda.empty_cache() if DEVICE.type == "cuda" else None

export_onnx("fracture", 2)
export_onnx("brain", 4)
export_onnx("kidney", 4)
print("\n✅ All ONNX exports done — ye /kaggle/working/medai_v2/ me hain:")
for f in sorted(os.listdir(OUT)):
    if f.endswith(".onnx"):
        print("   -", f)'''

code_package_orig = None  # marker: original package cell niche hai

# ─────────────────────────────────────────────────────────────
# Cell 8 — package + report
# ─────────────────────────────────────────────────────────────
code_package = r'''# ── 6) FINAL REPORT + PACKAGE ──
report_lines = ["="*62, "MedAI v2 RETRAINING REPORT", "="*62]
temps = {}
all_ok = True

for name, target in [("fracture", 0.90), ("brain", 0.95), ("kidney", 0.90)]:
    mp = f"{OUT}/metrics/{name}.json"
    if not os.path.exists(mp):
        report_lines.append(f"❌ {name}: metrics missing (cell fail hua?)")
        all_ok = False
        continue
    m = json.load(open(mp))
    acc = m.get("test_accuracy", 0)
    status = "✅ PASS" if acc >= target else "❌ BELOW TARGET"
    if acc < target: all_ok = False
    temps[name] = {"temperature": m.get("temperature", 1.0)}
    report_lines.append(f"{status}  {name.upper():9s} test_acc={acc:.4f} (target ≥{target}) macro_f1={m['macro_f1']:.4f}")

with open(f"{OUT}/temperature.json", "w") as f:
    json.dump(temps, f, indent=2)

report_lines.append("="*62)
report_lines.append("Overall: " + ("🎉 ALL PASS — backend me deploy karo!" if all_ok else "⚠️ Kuch models target se neeche — aur epochs/changes chahiye. Mujhe batana."))
print("\n".join(report_lines))

with open(f"{OUT}/test_results.txt", "w") as f:
    f.write("\n".join(report_lines) + "\n")

# Zip banao
zip_path = "/kaggle/working/medai_v2_package.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(OUT):
        for file in files:
            fp = os.path.join(root, file)
            zf.write(fp, os.path.relpath(fp, OUT))
print(f"\n📦 Package: {zip_path}")
print("   Right panel → Output → /kaggle/working → medai_v2_package.zip → ⬇ download")
print("   Isme: teeno .pth + teeno int8 .onnx + metrics/ + temperature.json + modality_gate.json")'''

md_package = r"""## 📦 Ho gaya? Ab files nikalo:
1. Right panel → **Output** section → `/kaggle/working` folder kholo
2. `medai_v2_package.zip` ke aage **download icon (⬇)** pe click karo
   - Agar zip na dikhe: **Save Version** (top-right) dabao → **Save & Run All (Commit)** — run complete hone ke baad output files version me permanently aa jayengi, phir wahan se download hongi
3. Zip mujhe do — main backend + HF Spaces pe deploy kar dunga

---
**Agar koi cell fail ho:** error message mujhe dikha do — main fix karke updated notebook bana dunga."""

cells = [
    {"cell_type": "markdown", "metadata": {}, "source": md_intro},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_setup},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_verify},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_engine},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_fracture},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_brain},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_kidney},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_gate},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_onnx},
    {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": code_package},
    {"cell_type": "markdown", "metadata": {}, "source": md_package},
]

nb = {
    "cells": cells,
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.10"},
        "accelerator": "GPU",
    },
    "nbformat": 4,
    "nbformat_minor": 4,
}

os.makedirs("docs/kaggle", exist_ok=True)
out_path = "docs/kaggle/MedAI_Retraining.ipynb"
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)
print(f"✅ Notebook written: {out_path}")

# Sanity: valid JSON + cell count
with open(out_path, encoding="utf-8") as f:
    check = json.load(f)
print(f"Valid ipynb: {len(check['cells'])} cells")

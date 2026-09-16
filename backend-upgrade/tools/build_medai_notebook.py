#!/usr/bin/env python3
"""
Build script: MedAI_Retraining.ipynb generate karta hai (docs/kaggle/ folder me).
Cell sources neeche hain — edit karo aur dobara run karo:
    python tools/build_medai_notebook.py
"""
import json
import os

# ─────────────────────────────────────────────────────────────
# Cell 0 — markdown intro
# ─────────────────────────────────────────────────────────────
md_intro = r"""# 🏥 MedAI Model Retraining Kit (v2.1)

**Ye notebook kya karti hai:** teeno models (Fracture / Brain / Kidney) ko sahi datasets pe retrain karti hai — balanced data, honest test evaluation, temperature calibration, ONNX export, aur modality-gate training.

## 🔑 Tumhara manual kaam (sirf 2 cheezein):
1. **Settings → Accelerator → GPU T4 x2 (ya P100)** on karo
2. **Run All** dabao (~60-90 min total)

> **Datasets ki zaroorat nahi!** Agar datasets Add Input se attached hain to notebook unhe khud dhoondh legi (nested folders me bhi). Aur agar attached NAHI hain to notebook **khud kagglehub se download** kar legi (3 canonical datasets). Kuch bhi manually add karne ki zaroorat nahi.

## 📤 Output (kya milega):
- `fracture_model.pth`, `brain_model.pth`, `kidney_model.pth` — drop-in replacement
- `fracture_model_int8.onnx`, `brain_model_int8.onnx`, `kidney_model_int8.onnx` — free hosting ke liye (~24MB each)
- `metrics/fracture.json`, `metrics/brain.json`, `metrics/kidney.json` — Model Lab dashboard ke liye
- `temperature.json` — calibration file
- `modality_gate.json` — trained photo-vs-scan gate
- `test_results.txt` — pass/fail report
- `medai_v2_package.zip` — sab kuch ek zip me

**Pass criteria:** Fracture ≥90% · Brain ≥95% · Kidney ≥90% (test set). Fail hua to notebook khud batayegi."""

# ─────────────────────────────────────────────────────────────
# Cell 1 — setup + smart discovery + kagglehub fallback
# ─────────────────────────────────────────────────────────────
code_setup = r'''# ── Setup: imports, config, reproducibility, GPU guard ──
import os, json, shutil, random, zipfile, glob
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

# ⚠️ GPU GUARD: bina GPU ke training bahut slow hoga.
if DEVICE.type != "cuda":
    raise RuntimeError(
        "❌ GPU nahi mila!\n"
        "   Kaggle me right panel → Session options → Accelerator → 'GPU T4 x2' select karo,\n"
        "   session restart ke baad Run All dobara chalao."
    )

INPUT_ROOT = "/kaggle/input"

# ─────────────────────────────────────────────────────────────
# SMART DATASET DISCOVERY (recursive) — Kaggle naya UI datasets ko
# /kaggle/input/datasets/<owner>/<slug> me nest karta hai, isliye
# poori tree me search karte hain, sirf top-level nahi.
# ─────────────────────────────────────────────────────────────
def _all_dirs(base, max_depth=7):
    """base ke andar sab directories (depth-limited, file reads ke bagair)."""
    base = base.rstrip("/")
    bd = base.count("/")
    out = []
    for dirpath, dirnames, _ in os.walk(base):
        if dirpath.count("/") - bd >= max_depth:
            dirnames[:] = []
            continue
        out.append(dirpath)
    return out

def _has_images(d, check=80):
    for root, _, files in os.walk(d):
        if any(f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")) for f in files[:check]):
            return True
    return False

def _child_names(d, depth=4):
    """d ke andar (depth tak) sab child folder ke names (lowercase)."""
    names = set()
    bd = d.rstrip("/").count("/")
    for dirpath, dirnames, _ in os.walk(d):
        if dirpath.count("/") - bd >= depth:
            dirnames[:] = []
            continue
        names.update(x.lower().strip() for x in dirnames)
    return names

_BAD_TAIL = {"train","test","training","testing","valid","validation",
             "fractured","not fractured","notfractured","cyst","normal","stone","tumor",
             "glioma","meningioma","pituitary","notumor","positive","negative"}

def find_dataset(keywords, prefer=None, exclude=None):
    """Recursive: path me keyword match + images hon. Structure-match ko prefer karta hai."""
    prefer = set(prefer or []); exclude = list(exclude or [])
    best, best_score = None, -1
    for dp in _all_dirs(INPUT_ROOT):
        pl = dp.lower().rstrip("/")
        if os.path.basename(pl) in _BAD_TAIL:
            continue
        if any(ex in pl for ex in exclude):
            continue
        if any(k in pl for k in keywords):
            if not _has_images(dp):
                continue
            names = _child_names(dp)
            score = dp.count("/") + 50 * len(prefer & names)
            if score > best_score:
                best, best_score = dp, score
    return best

def kagglehub_download(slug):
    """Dataset mounted nahi hai? kagglehub se auto-download (Kaggle pe no-auth)."""
    try:
        import kagglehub
    except ImportError:
        os.system("pip install -q kagglehub")
        import kagglehub
    print(f"⏳ Auto-download: {slug} (pehli baar 1-5 min lag sakte hain)...")
    return kagglehub.dataset_download(slug)

def _ok_fracture(root):
    return root and {"train", "test"}.issubset(_child_names(root))

def _ok_brain(root):
    return root and {"training", "testing"}.issubset(_child_names(root))

def _ok_kidney(root):
    if not root: return False
    for dp in _all_dirs(root, max_depth=4):
        subs = [s for s in os.listdir(dp) if os.path.isdir(os.path.join(dp, s)) and not s.startswith(".")]
        if len(subs) >= 4 and all(_has_images(os.path.join(dp, s)) for s in subs[:4]):
            return True
    return False

FRACTURE_ROOT = find_dataset(["fracture", "x-ray", "bone"], prefer={"train", "valid", "test"})
BRAIN_ROOT    = find_dataset(["brain-tumor", "brain_tumor", "brain tumor", "brainmri", "brain-mri"],
                             prefer={"training", "testing"}, exclude=["kidney"])
KIDNEY_ROOT   = find_dataset(["kidney"], prefer={"cyst", "tumor", "stone", "normal"}, exclude=["brain"])

print("Discovery (mounted):")
print("  FRACTURE_ROOT:", FRACTURE_ROOT)
print("  BRAIN_ROOT:   ", BRAIN_ROOT)
print("  KIDNEY_ROOT:  ", KIDNEY_ROOT)

# Structure-validate; galat dataset laga ho to canonical download
if not _ok_fracture(FRACTURE_ROOT):
    FRACTURE_ROOT = kagglehub_download("bmadushanirodrigo/fracture-multi-region-x-ray-data")
if not _ok_brain(BRAIN_ROOT):
    BRAIN_ROOT = kagglehub_download("masoudnickparvar/brain-tumor-mri-dataset")
if not _ok_kidney(KIDNEY_ROOT):
    KIDNEY_ROOT = kagglehub_download("nazmul0087/ct-kidney-dataset-normal-cyst-tumor-and-stone")

print("\nFinal roots:")
print("  FRACTURE_ROOT:", FRACTURE_ROOT)
print("  BRAIN_ROOT:   ", BRAIN_ROOT)
print("  KIDNEY_ROOT:  ", KIDNEY_ROOT)

_missing = [n for n, r in [("fracture", FRACTURE_ROOT), ("brain", BRAIN_ROOT), ("kidney", KIDNEY_ROOT)] if r is None]
if _missing:
    print("\n❌ Ye datasets download bhi nahi ho sake:", _missing)
    raise RuntimeError(f"Datasets missing: {_missing} — internet/kagglehub check karo ya Add Input se manually add karo.")

OUT = "/kaggle/working/medai_v2"
os.makedirs(f"{OUT}/metrics", exist_ok=True)

FAST_TEST = False   # sanity check ke liye True karo (1 epoch), phir False
NUM_EPOCHS = 1 if FAST_TEST else 14
BATCH_SIZE = 16 if FAST_TEST else 64

print("\nConfig OK — epochs:", NUM_EPOCHS, "| batch:", BATCH_SIZE)'''

# ─────────────────────────────────────────────────────────────
# Cell 2 — dataset verification
# ─────────────────────────────────────────────────────────────
code_verify = r'''# ── Dataset structure verify ──
def show_tree(root, max_items=10, max_depth=2):
    bd = root.rstrip("/").count("/")
    for dirpath, dirnames, files in os.walk(root):
        d = dirpath.count("/") - bd
        if d > max_depth:
            dirnames[:] = []
            continue
        img_count = sum(1 for f in files if f.lower().endswith((".jpg",".jpeg",".png",".bmp")))
        print("  " * d + os.path.basename(dirpath) + f"/  ({img_count} images)")

for name, root in [("FRACTURE", FRACTURE_ROOT), ("BRAIN", BRAIN_ROOT), ("KIDNEY", KIDNEY_ROOT)]:
    print(f"✅ {name}: {root}")
    show_tree(root)
    print()'''

# ─────────────────────────────────────────────────────────────
# Cell 3 — training engine
# ─────────────────────────────────────────────────────────────
code_engine = r'''# ── Training engine: shared functions (teeno models ke liye same) ──
from collections import Counter
from sklearn.metrics import confusion_matrix, classification_report, f1_score
from sklearn.model_selection import train_test_split
from torch.utils.data import Subset

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

def make_ifmap(if_classes, backend_classes, aliases):
    """ImageFolder index -> backend index mapping (folder names flexible)."""
    ifmap = {}
    for i, c in enumerate(if_classes):
        cl = c.lower().replace(" ", "").replace("_", "").replace("-", "")
        for bi, bname in enumerate(backend_classes):
            if cl in aliases[bname]:
                ifmap[i] = bi
                break
    return ifmap

def train_one(name, train_ds, val_ds, num_classes, class_names, epochs):
    """Full training + validation + metrics + temperature calibration (IF order me)."""
    print(f"\n{'='*60}\n🏋️ TRAINING: {name.upper()}  ({len(train_ds)} train / {len(val_ds)} val)\n{'='*60}")

    def _targets(ds):
        if isinstance(ds, Subset):
            return [ds.dataset.targets[i] for i in ds.indices]
        return ds.targets
    counts = Counter(_targets(train_ds))
    total = sum(counts.values())
    weights = torch.tensor([total / counts[i] for i in range(num_classes)], dtype=torch.float32).to(DEVICE)
    print("Class distribution:", {class_names[i]: counts.get(i, 0) for i in range(num_classes)})

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

    with torch.no_grad():
        probs = torch.softmax(all_logits / max(T, 1e-6), dim=1)
        conf, pred = probs.max(1)
    pred, labels_np = pred.numpy(), all_labels.numpy()
    cm = confusion_matrix(labels_np, pred, labels=list(range(num_classes)))
    rep = classification_report(labels_np, pred, target_names=class_names, output_dict=True, zero_division=0)
    f1s = {c: round(rep[c]["f1-score"], 4) for c in class_names}
    f1_by_index = [round(rep[class_names[i]]["f1-score"], 4) for i in range(num_classes)]
    acc = float((pred == labels_np).mean())

    metrics = {
        "model": name, "architecture": "resnet50",
        "classes": list(class_names),
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

    del model
    torch.cuda.empty_cache() if DEVICE.type == "cuda" else None
    return metrics

def remap_outputs(name, metrics, ifmap, backend_classes):
    """Metrics + saved model ko ImageFolder order se BACKEND order me convert karo."""
    n = len(backend_classes)
    inv = {v: k for k, v in ifmap.items()}
    cm = metrics["confusion_matrix"]
    metrics["confusion_matrix"] = [[cm[inv[i]][inv[j]] for j in range(n)] for i in range(n)]
    f1_idx = metrics["per_class_f1_by_index"]
    metrics["per_class_f1"] = {backend_classes[i]: f1_idx[inv[i]] for i in range(n)}
    metrics["per_class_f1_by_index"] = [f1_idx[inv[i]] for i in range(n)]
    metrics["classes"] = list(backend_classes)
    with open(f"{OUT}/metrics/{name}.json", "w") as f:
        json.dump(metrics, f, indent=2)
    # fc layer permute (agar order alag tha)
    if ifmap != {i: i for i in range(n)}:
        mp = f"{OUT}/{name}_model.pth"
        if os.path.exists(mp):
            model = build_model(n)
            model.load_state_dict(torch.load(mp, map_location="cpu"))
            with torch.no_grad():
                w = model.fc.weight.data.clone(); b = model.fc.bias.data.clone()
                for img_idx, backend_idx in ifmap.items():
                    model.fc.weight.data[backend_idx] = w[img_idx]
                    model.fc.bias.data[backend_idx] = b[img_idx]
            torch.save(model.state_dict(), mp)
            del model
            print(f"  ↺ {name}_model.pth fc output order backend order me permute ho gaya")
    return metrics

def eval_test_acc(name, num_classes, test_ds):
    """Honest test accuracy (order-independent)."""
    if not os.path.exists(f"{OUT}/{name}_model.pth"):
        print(f"⚠️ {name}_model.pth nahi mila — test eval skip")
        return None
    model = build_model(num_classes).to(DEVICE)
    model.load_state_dict(torch.load(f"{OUT}/{name}_model.pth", map_location=DEVICE))
    model.eval()
    test_dl = DataLoader(test_ds, batch_size=BATCH_SIZE, num_workers=2, pin_memory=DEVICE.type == "cuda")
    correct, total = 0, 0
    with torch.no_grad():
        for xb, yb in test_dl:
            xb, yb = xb.to(DEVICE), yb.to(DEVICE)
            correct += (model(xb).argmax(1) == yb).sum().item()
            total += len(yb)
    acc = correct / max(total, 1)
    print(f"  📊 {name.upper()} TEST ACCURACY: {acc:.4f}")
    del model
    torch.cuda.empty_cache() if DEVICE.type == "cuda" else None
    return acc

print("Training engine ready ✅")'''

# ─────────────────────────────────────────────────────────────
# Cell 4 — fracture
# ─────────────────────────────────────────────────────────────
code_fracture = r'''# ── 1) FRACTURE ──
if FRACTURE_ROOT is None:
    raise RuntimeError("FRACTURE_ROOT set nahi hua — setup cell dobara chalao.")

fr_train_root, fr_val_root, fr_test_root = None, None, None
for dirpath, dirnames, _ in os.walk(FRACTURE_ROOT):
    base = os.path.basename(dirpath).lower().strip()
    if base == "train" and fr_train_root is None: fr_train_root = dirpath
    elif base in ("valid", "validation") and fr_val_root is None: fr_val_root = dirpath
    elif base == "test" and fr_test_root is None: fr_test_root = dirpath

print("Fracture roots:", fr_train_root, fr_val_root, fr_test_root)
if not (fr_train_root and fr_test_root):
    raise RuntimeError(
        f"Fracture dataset me train/test folders nahi mile.\nRoot: {FRACTURE_ROOT}\n"
        f"Top-level: {sorted(os.listdir(FRACTURE_ROOT))[:12]}"
    )

fr_train_full = datasets.ImageFolder(fr_train_root, transform=train_tf)
print("Fracture ImageFolder classes:", fr_train_full.classes)

# Flexible class mapping (folder ka naam/order kuch bhi ho)
fr_ifmap = make_ifmap(
    fr_train_full.classes, ["Fractured", "Not Fractured"],
    {"Fractured": ("fractured", "fracture", "positive"),
     "Not Fractured": ("notfractured", "notfracture", "negative", "normal", "intact")},
)
if len(fr_ifmap) != 2:
    raise RuntimeError(f"Fracture classes unexpected: {fr_train_full.classes} — fractured/not fractured variants expected")

if fr_val_root is None:
    print("⚠️ valid/ folder nahi mila — train ka 10% stratified validation bana rahe hain")
    fr_targets = fr_train_full.targets
    idx_tr, idx_va = train_test_split(list(range(len(fr_targets))), test_size=0.1, stratify=fr_targets, random_state=SEED)
    fr_train_full_eval = datasets.ImageFolder(fr_train_root, transform=eval_tf)
    fr_train = Subset(fr_train_full, idx_tr)
    fr_val   = Subset(fr_train_full_eval, idx_va)
else:
    fr_train = fr_train_full
    fr_val   = datasets.ImageFolder(fr_val_root, transform=eval_tf)
fr_test = datasets.ImageFolder(fr_test_root, transform=eval_tf)

fr_metrics = train_one("fracture", fr_train, fr_val, 2, fr_train_full.classes, NUM_EPOCHS)

# Test eval PEHLE (model + labels dono ImageFolder order me) — scalar accuracy order-independent hai
fr_test_acc = eval_test_acc("fracture", 2, fr_test)

# Phir backend order me remap (metrics + saved model dono)
fr_metrics = remap_outputs("fracture", fr_metrics, fr_ifmap, ["Fractured", "Not Fractured"])
if fr_test_acc is not None:
    fr_metrics["test_accuracy"] = round(fr_test_acc, 4)
    with open(f"{OUT}/metrics/fracture.json", "w") as f:
        json.dump(fr_metrics, f, indent=2)
    print(f"🦴 FRACTURE TEST ACCURACY: {fr_test_acc:.4f}  (target ≥ 0.90)")'''

# ─────────────────────────────────────────────────────────────
# Cell 5 — brain
# ─────────────────────────────────────────────────────────────
code_brain = r'''# ── 2) BRAIN ──
if BRAIN_ROOT is None:
    raise RuntimeError("BRAIN_ROOT set nahi hua — setup cell dobara chalao.")

br_train_root, br_test_root = None, None
for dirpath, dirnames, _ in os.walk(BRAIN_ROOT):
    base = os.path.basename(dirpath).lower().strip()
    if base == "training" and br_train_root is None: br_train_root = dirpath
    elif base == "testing" and br_test_root is None: br_test_root = dirpath

print("Brain roots:", br_train_root, br_test_root)
if not (br_train_root and br_test_root):
    raise RuntimeError(
        f"Brain dataset me Training/Testing folders nahi mile.\nRoot: {BRAIN_ROOT}\n"
        f"Top-level: {sorted(os.listdir(BRAIN_ROOT))[:12]}"
    )

br_train_full = datasets.ImageFolder(br_train_root, transform=train_tf)
print("Brain ImageFolder classes:", br_train_full.classes)

brain_classes = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]
br_ifmap = make_ifmap(
    br_train_full.classes, brain_classes,
    {"Glioma": ("glioma",), "Meningioma": ("meningioma",),
     "No Tumor": ("notumor", "healthy", "normal"), "Pituitary": ("pituitary",)},
)
if len(br_ifmap) != 4:
    raise RuntimeError(f"Brain classes unexpected: {br_train_full.classes} — Glioma/Meningioma/No Tumor/Pituitary expected")

br_targets = br_train_full.targets
br_idx_train, br_idx_val = train_test_split(
    list(range(len(br_targets))), test_size=0.1, stratify=br_targets, random_state=SEED)

br_train_full_eval = datasets.ImageFolder(br_train_root, transform=eval_tf)
br_train = Subset(br_train_full, br_idx_train)
br_val   = Subset(br_train_full_eval, br_idx_val)
br_test  = datasets.ImageFolder(br_test_root, transform=eval_tf)

br_metrics = train_one("brain", br_train, br_val, 4, br_train_full.classes, NUM_EPOCHS)

# Test eval PEHLE (IF order me), phir remap
br_test_acc = eval_test_acc("brain", 4, br_test)

br_metrics = remap_outputs("brain", br_metrics, br_ifmap, brain_classes)
if br_test_acc is not None:
    br_metrics["test_accuracy"] = round(br_test_acc, 4)
    with open(f"{OUT}/metrics/brain.json", "w") as f:
        json.dump(br_metrics, f, indent=2)
    print(f"🧠 BRAIN TEST ACCURACY: {br_test_acc:.4f}  (target ≥ 0.95)")'''

# ─────────────────────────────────────────────────────────────
# Cell 6 — kidney
# ─────────────────────────────────────────────────────────────
code_kidney = r'''# ── 3) KIDNEY ──
if KIDNEY_ROOT is None:
    raise RuntimeError("KIDNEY_ROOT set nahi hua — setup cell dobara chalao.")

# Class-folders wala root dhoondo (4+ image subdirs)
kid_class_root = None
for dirpath, dirnames, _ in os.walk(KIDNEY_ROOT):
    subs = [d for d in dirnames if not d.startswith(".")]
    if len(subs) >= 4 and all(_has_images(os.path.join(dirpath, s)) for s in subs[:4]):
        kid_class_root = dirpath
        break

print("Kidney class root:", kid_class_root)
if kid_class_root is None:
    raise RuntimeError(
        f"Kidney dataset me 4 class folders nahi mile.\nRoot: {KIDNEY_ROOT}\n"
        f"Top-level: {sorted(os.listdir(KIDNEY_ROOT))[:12]}"
    )
print("Kidney classes:", sorted(os.listdir(kid_class_root)))

kid_full = datasets.ImageFolder(kid_class_root, transform=train_tf)
kidney_classes = ["Cyst", "Normal", "Stone", "Tumor"]
kid_ifmap = make_ifmap(
    kid_full.classes, kidney_classes,
    {"Cyst": ("cyst",), "Normal": ("normal",), "Stone": ("stone",), "Tumor": ("tumor",)},
)
if len(kid_ifmap) != 4:
    raise RuntimeError(f"Kidney classes unexpected: {kid_full.classes} — Cyst/Normal/Stone/Tumor expected")

kid_targets = kid_full.targets
idx = list(range(len(kid_targets)))
idx_train, idx_temp = train_test_split(idx, test_size=0.2, stratify=kid_targets, random_state=SEED)
temp_targets = [kid_targets[i] for i in idx_temp]
idx_val, idx_test = train_test_split(idx_temp, test_size=0.5, stratify=temp_targets, random_state=SEED)

kid_full_eval = datasets.ImageFolder(kid_class_root, transform=eval_tf)
kid_train = Subset(kid_full, idx_train)
kid_val   = Subset(kid_full_eval, idx_val)
kid_test  = Subset(kid_full_eval, idx_test)

kid_metrics = train_one("kidney", kid_train, kid_val, 4, kid_full.classes, NUM_EPOCHS)

# Test eval PEHLE (IF order me), phir remap
kid_test_acc = eval_test_acc("kidney", 4, kid_test)

kid_metrics = remap_outputs("kidney", kid_metrics, kid_ifmap, kidney_classes)
if kid_test_acc is not None:
    kid_metrics["test_accuracy"] = round(kid_test_acc, 4)
    with open(f"{OUT}/metrics/kidney.json", "w") as f:
        json.dump(kid_metrics, f, indent=2)
    print(f"🫘 KIDNEY TEST ACCURACY: {kid_test_acc:.4f}  (target ≥ 0.90)")'''

# ─────────────────────────────────────────────────────────────
# Cell 7 — modality gate
# ─────────────────────────────────────────────────────────────
code_gate = r'''# ── 4) MODALITY GATE — scan vs normal photo classifier ──
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.metrics import f1_score as f1s_fn

def extract_features_pil(img):
    """backend modality.py ke compute_features ka exact mirror."""
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

# ── Positives: medical scans ──
scan_paths = []
def collect_scans(root, limit):
    if root is None: return
    got = 0
    for dirpath, _, files in os.walk(root):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
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

neg_source = "none"
# ── Negatives: normal photos (pehle attached photo-datasets se) ──
photo_kw = ["cifar", "cats", "dogs", "animal", "face", "flickr", "imagenet",
            "photo", "fruit", "flower", "food", "car", "bird", "natural"]
roots_norm = [r.rstrip("/") for r in (FRACTURE_ROOT, BRAIN_ROOT, KIDNEY_ROOT) if r]
neg_dirs = []
for dp in _all_dirs(INPUT_ROOT, max_depth=6):
    pl = dp.lower()
    if any(pl.startswith(rn) for rn in roots_norm):
        continue
    if any(k in pl for k in photo_kw) and _has_images(dp):
        neg_dirs.append(dp)
neg_dirs.sort(key=lambda p: -p.count("/"))
print("Photo dataset candidates:", neg_dirs[:5] or "koi nahi")

neg_paths = []
for root in neg_dirs[:5]:
    for dirpath, _, files in os.walk(root):
        for f in files:
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                neg_paths.append(os.path.join(dirpath, f))
        if len(neg_paths) >= 2700: break
    if len(neg_paths) >= 2700: break

if len(neg_paths) >= 500:
    neg_source = "kaggle_photo_dataset"
    random.shuffle(neg_paths)
    neg_paths = neg_paths[:2700]
    for p in neg_paths:
        try:
            with Image.open(p) as im:
                X.append(extract_features_pil(im)); y.append(0)
        except Exception:
            pass
else:
    # ── Synthetic photographic negatives (hamesha available) ──
    print("⚠️ Real photo dataset nahi mila — synthetic colored-noise negatives use kar rahe hain")
    neg_source = "synthetic"
    rng = np.random.default_rng(7)
    gx, gy = np.meshgrid(np.linspace(0, 1, 256), np.linspace(0, 1, 256))
    for _ in range(1500):
        base = rng.uniform(0.15, 0.9, 3)
        img = np.zeros((256, 256, 3), np.float32)
        for c in range(3):
            img[..., c] = base[c] * (0.5 + 0.5 * gx) + rng.normal(0, 0.10, (256, 256))
        img = np.clip(img, 0, 1)
        X.append(extract_features_pil(Image.fromarray((img * 255).astype(np.uint8))))
        y.append(0)

X, y = np.array(X), np.array(y)
print(f"Gate dataset: {X.shape[0]} images | positives: {int(y.sum())}, negatives: {int((1-y).sum())} (source: {neg_source})")

if len(np.unique(y)) == 2 and X.shape[0] >= 200:
    X_mean, X_std = X.mean(0), X.std(0) + 1e-8
    Xn = (X - X_mean) / X_std
    clf = LogisticRegression(max_iter=2000, class_weight="balanced")
    cv = cross_val_score(clf, Xn, y, cv=5, scoring="f1")
    print(f"Gate 5-fold F1: {cv.mean():.4f} ± {cv.std():.4f}")
    clf.fit(Xn, y)
    probs = clf.predict_proba(Xn)[:, 1]
    best_t, best_f1 = 0.5, 0
    for t in np.arange(0.2, 0.9, 0.02):
        f1 = f1s_fn(y, (probs >= t).astype(int))
        if f1 > best_f1: best_f1, best_t = f1, t
    gate = {
        "weights": clf.coef_[0].tolist(), "bias": float(clf.intercept_[0]),
        "mu": X_mean.tolist(), "sigma": X_std.tolist(),
        "threshold": round(float(best_t), 3),
        "cv_f1": round(float(cv.mean()), 4),
        "trained_on": {"positives": int(y.sum()), "negatives": int((1-y).sum()),
                        "negatives_source": neg_source},
    }
    with open(f"{OUT}/modality_gate.json", "w") as f:
        json.dump(gate, f, indent=2)
    print(f"✅ Modality gate saved (threshold {best_t:.2f}, F1 {best_f1:.4f})")
else:
    print("⚠️ Gate training skip — data kam tha. Backend heuristic fallback use karega (safe).")'''

# ─────────────────────────────────────────────────────────────
# Cell 8 — ONNX export
# ─────────────────────────────────────────────────────────────
code_onnx = r'''# ── 5) ONNX EXPORT — free hosting (Render 512MB) ke liye ──
# Har trained model ko ONNX me convert + dynamic int8 quantize (~24MB each).
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

def export_onnx(name, num_classes):
    pth = f"{OUT}/{name}_model.pth"
    if not os.path.exists(pth):
        print(f"⚠️ {name}_model.pth nahi mila (training cell fail/skip hua) — export skip")
        return
    print(f"\n⏳ Exporting {name} → ONNX...")
    m = build_model(num_classes)
    m.load_state_dict(torch.load(pth, map_location="cpu"))
    m.eval()

    dummy = torch.randn(1, 3, 224, 224)
    onnx_path = f"{OUT}/{name}_model.onnx"
    torch.onnx.export(
        m, dummy, onnx_path,
        input_names=["input"], output_names=["logits"],
        dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
        opset_version=13,
        do_constant_folding=False,
    )
    print(f"  ✅ {name}_model.onnx ({os.path.getsize(onnx_path)/1e6:.1f} MB)")

    q_path = f"{OUT}/{name}_model_int8.onnx"
    quantize_dynamic(onnx_path, q_path, weight_type=QuantType.QInt8)
    print(f"  ✅ {name}_model_int8.onnx ({os.path.getsize(q_path)/1e6:.1f} MB)")

    import onnxruntime as ort
    sess = ort.InferenceSession(q_path, providers=["CPUExecutionProvider"])
    out = sess.run(None, {"input": dummy.numpy()})[0]
    with torch.no_grad():
        ref = m(dummy).numpy()
    diff = float(abs(out - ref).max())
    print(f"  🔍 max logit diff vs PyTorch: {diff:.4f} (<0.1 good)")

    del m

export_onnx("fracture", 2)
export_onnx("brain", 4)
export_onnx("kidney", 4)
print("\n✅ ONNX exports done — /kaggle/working/medai_v2/ me ye files hain:")
for f in sorted(os.listdir(OUT)):
    if f.endswith(".onnx"):
        print("   -", f)'''

# ─────────────────────────────────────────────────────────────
# Cell 9 — package + report
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
print(f"\n📦 Package: {zip_path} ({os.path.getsize(zip_path)/1e6:.1f} MB)")
print("   Isme: teeno .pth + teeno int8 .onnx + metrics/ + temperature.json + modality_gate.json")
print("   ⬇ Download: Save Version → Save & Run All (Commit) → phir Output panel se download")'''

md_package = r"""## 📦 Ho gaya? Ab files nikalo:
1. **Save Version** (top-right) → **Save & Run All (Commit)** — ye zaroori hai warna output download nahi hota
2. Run complete hone ke baad right panel → **Output** → `medai_v2_package.zip` → **⬇ download**
3. Zip mujhe do — main backend me integrate karke push kar dunga

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

# Sanity: valid JSON + har code cell ka syntax compile check
with open(out_path, encoding="utf-8") as f:
    check = json.load(f)
errs = 0
for i, c in enumerate(check["cells"]):
    if c["cell_type"] == "code":
        try:
            compile(c["source"], f"cell_{i}", "exec")
        except SyntaxError as e:
            errs += 1
            print(f"❌ SYNTAX ERROR cell {i}: {e}")
print(f"Valid ipynb: {len(check['cells'])} cells | syntax errors: {errs}")

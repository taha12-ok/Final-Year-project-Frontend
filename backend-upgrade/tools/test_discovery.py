#!/usr/bin/env python3
"""Test: discovery logic ko fake nested Kaggle layout pe verify karo (bina torch ke)."""
import os, sys, tempfile, shutil

# Notebook cell 1 se sirf discovery helpers extract karo (torch import se pehle wala hissa)
sys.path.insert(0, os.path.dirname(__file__))

# --- discovery helpers (notebook se exact copy — keep in sync) ---
INPUT_ROOT = None  # set below

def _all_dirs(base, max_depth=7):
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

# ─────────────────────────────────────────────
# Fake Kaggle nested layout banao
# ─────────────────────────────────────────────
tmp = tempfile.mkdtemp()
INPUT_ROOT = os.path.join(tmp, "input").replace("\\", "/")
os.makedirs(INPUT_ROOT)

def touch_img(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(b"\xff\xd8\xff\xe0fakejpg")  # fake jpg magic

DS = os.path.join(INPUT_ROOT, "datasets").replace("\\", "/")

# 1) Fracture (nested, tumhare jaisa slug)
fr = os.path.join(DS, "bmadushanirodrigo", "fracture-multi-region-x-ray-data", "versions", "2")
for split in ("train", "valid", "test"):
    for cls in ("fractured", "not fractured"):
        for i in range(3):
            touch_img(os.path.join(fr, split, cls, f"img{i}.jpg"))

# 2) Brain (masoudnickparvar — Training/Testing)
br = os.path.join(DS, "masoudnickparvar", "brain-tumor-mri-dataset", "versions", "1")
for split in ("Training", "Testing"):
    for cls in ("glioma", "meningioma", "notumor", "pituitary"):
        for i in range(3):
            touch_img(os.path.join(br, split, cls, f"img{i}.jpg"))

# 3) Kidney (flat class folders, CSV bhi saath me)
kd = os.path.join(DS, "nazmul0087", "ct-kidney-dataset-normal-cyst-tumor-and-stone", "versions", "1")
for cls in ("Cyst", "Normal", "Stone", "Tumor"):
    for i in range(3):
        touch_img(os.path.join(kd, "CT-KIDNEY-DATASET-Normal-Cyst-Tumor-Stone", cls, f"img{i}.jpg"))

# 4) Confuser: ek photo dataset (cifar) jisme 'normal' naam ka folder ho
cf = os.path.join(DS, "someuser", "cifar10-images", "versions", "3")
for cls in ("normal", "cat", "dog"):
    for i in range(3):
        touch_img(os.path.join(cf, cls, f"img{i}.jpg"))

# Ek dataset jo images ke bagair sirf CSV ho (confuser #2)
bad = os.path.join(DS, "foo", "brain-tumor-csv-metadata", "versions", "1")
os.makedirs(bad, exist_ok=True)
with open(os.path.join(bad, "labels.csv"), "w") as f:
    f.write("a,b\n1,2\n")

# ── Run discovery exactly like the notebook ──
FRACTURE_ROOT = find_dataset(["fracture", "x-ray", "bone"], prefer={"train", "valid", "test"})
BRAIN_ROOT    = find_dataset(["brain-tumor", "brain_tumor", "brain tumor", "brainmri", "brain-mri"],
                             prefer={"training", "testing"}, exclude=["kidney"])
KIDNEY_ROOT   = find_dataset(["kidney"], prefer={"cyst", "tumor", "stone", "normal"}, exclude=["brain"])

ok = True
def check(name, got, want):
    """got ya to want khud ho ya uska ancestor ho (subtree me structure mil jaye) — dono sahi."""
    global ok
    g = os.path.normpath(got or "").lower()
    w = os.path.normpath(want).lower()
    good = got and (g == w or w.startswith(g + os.sep))
    print(f"{'✅' if good else '❌'} {name}: {got}")
    if not good:
        ok = False

check("FRACTURE", FRACTURE_ROOT, fr)
check("BRAIN", BRAIN_ROOT, br)
check("KIDNEY", KIDNEY_ROOT, kd)

# Structure validators
print(f"{'✅' if _ok_fracture(FRACTURE_ROOT) else '❌'} _ok_fracture: {_ok_fracture(FRACTURE_ROOT)}")
print(f"{'✅' if _ok_brain(BRAIN_ROOT) else '❌'} _ok_brain: {_ok_brain(BRAIN_ROOT)}")
print(f"{'✅' if _ok_kidney(KIDNEY_ROOT) else '❌'} _ok_kidney: {_ok_kidney(KIDNEY_ROOT)}")
ok = ok and _ok_fracture(FRACTURE_ROOT) and _ok_brain(BRAIN_ROOT) and _ok_kidney(KIDNEY_ROOT)

# Edge: top-level flat layout (purana style) bhi chale
INPUT_ROOT = os.path.join(tmp, "input2").replace("\\", "/")
fr2 = os.path.join(INPUT_ROOT, "fracture-multi-region-x-ray-data")
for split in ("train", "valid", "test"):
    touch_img(os.path.join(fr2, split, "fractured", "a.jpg"))
got2 = find_dataset(["fracture", "x-ray", "bone"], prefer={"train", "valid", "test"})
print(f"{'✅' if got2 and os.path.normpath(got2) == os.path.normpath(fr2) else '❌'} flat layout discovery: {got2}")
ok = ok and got2 is not None

shutil.rmtree(tmp)
print("\n" + ("🎉 ALL DISCOVERY TESTS PASS" if ok else "❌ SOME TESTS FAILED"))
sys.exit(0 if ok else 1)

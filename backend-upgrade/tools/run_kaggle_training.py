#!/usr/bin/env python3
"""
Kaggle training HEADLESS run karta hai (browser me kuch nahi karna parta).
Push + poll + download sab automatic. Windows console ke liye ASCII-only prints.

Usage:
  python backend-upgrade/tools/run_kaggle_training.py --token KGAT_xxx
  python backend-upgrade/tools/run_kaggle_training.py --token KGAT_xxx --push-only
  python backend-upgrade/tools/run_kaggle_training.py --skip-push      (poll + download only)

Token kahan save hota hai: ~/.kaggle/access_token (repo me KABHI nahi jata).
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
NOTEBOOK = os.path.join(ROOT, "docs", "kaggle", "MedAI_Retraining.ipynb")

# Canonical datasets — metadata ke through attach honge (flat mount /kaggle/input/<slug>)
DATASETS = [
    "bmadushanirodrigo/fracture-multi-region-x-ray-data",
    "masoudnickparvar/brain-tumor-mri-dataset",
    "nazmul0087/ct-kidney-dataset-normal-cyst-tumor-and-stone",
    "cjinny/mura-v11",        # v3: real normal X-rays (fracture negatives)
    "koryakinp/fingers",      # v3: photo class (scan-type CNN)
]

POLL_SECONDS = 120
MAX_MINUTES = 240


def ensure_kaggle_pkg():
    try:
        import kaggle  # noqa: F401
    except ImportError:
        print("[..] kaggle package install ho raha hai...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "kaggle"], check=True)


def save_token(token):
    """KGAT token ko ~/.kaggle/access_token me save karo (env var bhi set)."""
    tok = token.strip()
    kd = os.path.join(os.path.expanduser("~"), ".kaggle")
    os.makedirs(kd, exist_ok=True)
    p = os.path.join(kd, "access_token")
    with open(p, "w", encoding="utf-8") as f:
        f.write(tok)
    if os.name != "nt":
        os.chmod(p, 0o600)
    os.environ["KAGGLE_API_TOKEN"] = tok
    print("[OK] token saved:", p)


def save_kaggle_json(path):
    """Old-style kaggle.json support (username/key)."""
    with open(path, encoding="utf-8") as f:
        creds = json.load(f)
    if "username" not in creds or "key" not in creds:
        sys.exit("kaggle.json invalid — isme username aur key hone chahiye")
    kd = os.path.join(os.path.expanduser("~"), ".kaggle")
    os.makedirs(kd, exist_ok=True)
    target = os.path.join(kd, "kaggle.json")
    with open(target, "w", encoding="utf-8") as f:
        json.dump(creds, f)
    if os.name != "nt":
        os.chmod(target, 0o600)
    print("[OK] kaggle.json saved:", target)
    return creds["username"]


def prepare_push_dir(username, slug):
    push_dir = os.path.join(ROOT, "docs", "kaggle", "kaggle_push")
    if os.path.exists(push_dir):
        shutil.rmtree(push_dir)
    os.makedirs(push_dir)
    shutil.copy(NOTEBOOK, os.path.join(push_dir, "MedAI_Retraining.ipynb"))
    meta = {
        "id": f"{username}/{slug}",
        "title": "MedAI Retraining v4",
        "code_file": "MedAI_Retraining.ipynb",
        "language": "python",
        "kernel_type": "notebook",
        "is_private": True,
        "enable_gpu": True,
        "enable_internet": True,  # ResNet50 pretrained ImageNet weights download karne ke liye zaroori
        "dataset_sources": DATASETS,
        "competition_sources": [],
        "kernel_sources": [],
    }
    with open(os.path.join(push_dir, "kernel-metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    return push_dir


def cli(args, timeout=600):
    """kaggle CLI ko `python -m kaggle` se chalao (executable PATH me nahi hota Windows pe)."""
    env = dict(os.environ)
    args = list(args)
    if args and args[0] == "kaggle":
        args = args[1:]  # -m kaggle ke sath 'kaggle' literal double ho jata hai
    cmd = [sys.executable, "-m", "kaggle"] + args
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, env=env)
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--token", help="KGAT api token (ya pehle se saved use hoga)")
    ap.add_argument("--kaggle-json", help="old-style kaggle.json path")
    ap.add_argument("--username", default="tahashabbir321")
    ap.add_argument("--slug", default="medai-retraining-v4")
    ap.add_argument("--push-only", action="store_true", help="push karke ruk jao")
    ap.add_argument("--skip-push", action="store_true", help="sirf poll + download")
    args = ap.parse_args()

    if not os.path.exists(NOTEBOOK):
        sys.exit(f"Notebook nahi mila: {NOTEBOOK}")

    ensure_kaggle_pkg()

    kd = os.path.join(os.path.expanduser("~"), ".kaggle")
    has_tok = os.path.exists(os.path.join(kd, "access_token")) or os.path.exists(os.path.join(kd, "kaggle.json"))
    if args.token:
        save_token(args.token)
    elif args.kaggle_json:
        args.username = save_kaggle_json(args.kaggle_json)
    elif not has_tok:
        sys.exit("token ya kaggle.json do (--token / --kaggle-json)")

    full = f"{args.username}/{args.slug}"

    if not args.skip_push:
        push_dir = prepare_push_dir(args.username, args.slug)
        print(f"[..] Kernel push ho raha hai: {full} (GPU T4, datasets attached)")
        r = cli(["kaggle", "kernels", "push", "-p", push_dir])
        out = (r.stdout or "") + (r.stderr or "")
        print(out.strip()[-800:])
        if r.returncode != 0:
            sys.exit(f"[X] push fail hua (exit {r.returncode})")
        print(f"[OK] Pushed! Live: https://www.kaggle.com/code/{full}")
    else:
        print(f"[..] Skip push — existing kernel poll kar rahe hain: {full}")

    if args.push_only:
        return

    print(f"[..] Polling har {POLL_SECONDS}s... (log file me bhi likha jayega)")
    start = time.time()
    while True:
        time.sleep(POLL_SECONDS)
        try:
            r = cli(["kaggle", "kernels", "status", full], timeout=60)
            txt = ((r.stdout or "") + (r.stderr or "")).strip()
        except Exception as e:
            print("[..] status error (retry hoga):", e)
            continue
        s = txt.lower()
        mins = int((time.time() - start) / 60)
        print(f"[{mins:3d} min] {txt[-200:]}")
        sys.stdout.flush()
        if "complete" in s:
            break
        if "error" in s or "cancel" in s:
            print("[X] Run fail/cancel hua.")
            sys.exit(2)
        if mins > MAX_MINUTES:
            print("[X] Timeout — kernel browser me kholo.")
            sys.exit(3)

    outdir = os.path.join(ROOT, "docs", "kaggle", "kaggle_output")
    os.makedirs(outdir, exist_ok=True)
    print("[..] Output download ho raha hai (models ~100MB, time lagega)...")
    r = cli(["kaggle", "kernels", "output", full, "-p", outdir], timeout=1800)
    print(((r.stdout or "") + (r.stderr or "")).strip()[-500:])
    zip_path = os.path.join(outdir, "medai_v2_package.zip")
    if os.path.exists(zip_path):
        print(f"[DONE] {zip_path} ({os.path.getsize(zip_path)/1e6:.1f} MB)")
        print("Ab: models backend me integrate + push (Buffy karega).")
    else:
        print(f"[!] zip nahi mili — output folder: {outdir}")
        for f in os.listdir(outdir):
            print("   -", f)


if __name__ == "__main__":
    main()

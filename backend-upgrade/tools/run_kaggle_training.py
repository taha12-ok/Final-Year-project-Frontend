#!/usr/bin/env python3
"""
Kaggle training HEADLESS run karta hai (browser me Save & Run All ke barabar).
User ke browser me kuch nahi karna parta — push, poll, download sab automatic.

Usage:
  python backend-upgrade/tools/run_kaggle_training.py <path-to-kaggle.json>

kaggle.json kaise milega (30 sec):
  kaggle.com -> profile photo -> Settings -> API section -> Create New Token
  (kaggle.json download ho jayegi)

ASCII-only prints (Windows cp1252 console ke liye).
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
]

POLL_SECONDS = 120
MAX_MINUTES = 240


def ensure_kaggle_pkg():
    try:
        import kaggle  # noqa: F401
    except ImportError:
        print("[..] kaggle package install ho raha hai...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "kaggle"], check=True)


def setup_credentials(kaggle_json_path):
    with open(kaggle_json_path, encoding="utf-8") as f:
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
    print("[OK] credentials set:", os.path.join(kd, "kaggle.json"))
    return creds["username"]


def prepare_push_dir(username, slug):
    push_dir = os.path.join(ROOT, "docs", "kaggle", "kaggle_push")
    if os.path.exists(push_dir):
        shutil.rmtree(push_dir)
    os.makedirs(push_dir)
    shutil.copy(NOTEBOOK, os.path.join(push_dir, "MedAI_Retraining.ipynb"))
    meta = {
        "id": f"{username}/{slug}",
        "title": "MedAI Retraining v2",
        "code_file": "MedAI_Retraining.ipynb",
        "language": "python",
        "kernel_type": "notebook",
        "is_private": True,
        "enable_gpu": True,
        "enable_internet": False,  # datasets attached hain, internet ki zaroorat nahi
        "dataset_sources": DATASETS,
        "competition_sources": [],
        "kernel_sources": [],
    }
    with open(os.path.join(push_dir, "kernel-metadata.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    return push_dir


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("kaggle_json", help="Path to kaggle.json API token")
    ap.add_argument("--slug", default="medai-retraining-v2")
    args = ap.parse_args()

    if not os.path.exists(NOTEBOOK):
        sys.exit(f"Notebook nahi mila: {NOTEBOOK}")

    ensure_kaggle_pkg()
    username = setup_credentials(args.kaggle_json)
    full = f"{username}/{args.slug}"

    push_dir = prepare_push_dir(username, args.slug)

    from kaggle.api.kaggle_api_extended import KaggleApi
    api = KaggleApi()
    api.authenticate()

    print(f"[..] Kernel push ho raha hai: {full}")
    print("     (ye headless 'Save & Run All' hai — GPU T4 pe chalega)")
    api.kernels_push(push_dir)
    print(f"[OK] Pushed! Live progress: https://www.kaggle.com/code/{full}")
    print(f"[..] Polling har {POLL_SECONDS}s... (ye window open rehne do)")

    start = time.time()
    while True:
        time.sleep(POLL_SECONDS)
        try:
            st = api.kernels_status(full)
        except Exception as e:  # transient network error — retry
            print("[..] status check error (retry hoga):", e)
            continue
        s = str(getattr(st, "status", st)).lower()
        mins = int((time.time() - start) / 60)
        print(f"[{mins:3d} min] status: {s}")
        if "complete" in s:
            break
        if "error" in s or "cancel" in s:
            print("[X] Run fail/cancel hua. Logs ke liye:")
            print(f"    python -m kaggle kernels output {full} -p docs/kaggle/kaggle_output")
            sys.exit(2)
        if mins > MAX_MINUTES:
            print("[X] Timeout — browser me kernel kholo aur dekho kya chal raha hai.")
            sys.exit(3)

    outdir = os.path.join(ROOT, "docs", "kaggle", "kaggle_output")
    os.makedirs(outdir, exist_ok=True)
    print("[..] Output download ho raha hai (models ~100MB, thora time lagega)...")
    api.kernels_output(full, path=outdir)
    zip_path = os.path.join(outdir, "medai_v2_package.zip")
    if os.path.exists(zip_path):
        print(f"[DONE] {zip_path} ({os.path.getsize(zip_path)/1e6:.1f} MB)")
        print("Ab: models backend me integrate + push (Buffy ye karega).")
    else:
        print(f"[!] zip nahi mili — output folder me ye hai: {outdir}")
        for f in os.listdir(outdir):
            print("   -", f)


if __name__ == "__main__":
    main()

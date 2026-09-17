#!/usr/bin/env python3
"""
export_onnx_local.py — Retrained .pth models -> int8 ONNX (local, Render free tier ke liye)

Usage:  python backend-upgrade/tools/export_onnx_local.py [models_dir] [out_dir]
Default: models_dir = docs/kaggle/kaggle_output/medai_v2, out_dir = backend-upgrade/onnx_out
"""
import os
import sys

MODELS_DIR = sys.argv[1] if len(sys.argv) > 1 else "docs/kaggle/kaggle_output/medai_v2"
OUT_DIR = sys.argv[2] if len(sys.argv) > 2 else "backend-upgrade/onnx_out"

SPECS = [("fracture", 2), ("brain", 4), ("kidney", 4)]

os.makedirs(OUT_DIR, exist_ok=True)

import torch
import torch.nn as nn
from torchvision import models as tv_models


def build(num_classes: int):
    m = tv_models.resnet50(weights=None)
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    return m


def main():
    import onnx
    from onnxruntime.quantization import quantize_dynamic, QuantType

    ok = True
    for name, ncls in SPECS:
        pth = os.path.join(MODELS_DIR, f"{name}_model.pth")
        if not os.path.exists(pth):
            print(f"SKIP {name}: {pth} not found")
            ok = False
            continue

        net = build(ncls)
        net.load_state_dict(torch.load(pth, map_location="cpu", weights_only=True))
        net.eval()

        dummy = torch.randn(1, 3, 224, 224)
        fp32_path = os.path.join(OUT_DIR, f"{name}_model.onnx")
        # dynamo=False -> legacy exporter: single-file ONNX (external .data nahi banti)
        # aur onnxruntime quantize_dynamic is graph pe kaam karta hai
        try:
            torch.onnx.export(
                net, dummy, fp32_path,
                input_names=["input"], output_names=["logits"],
                dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
                opset_version=13, dynamo=False,
            )
        except TypeError:
            torch.onnx.export(
                net, dummy, fp32_path,
                input_names=["input"], output_names=["logits"],
                dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
                opset_version=13,
            )
        print(f"{name}: fp32 exported ({os.path.getsize(fp32_path)/1e6:.1f} MB)")

        q_path = os.path.join(OUT_DIR, f"{name}_model_int8.onnx")
        try:
            try:
                # per_channel=True -> conv weights per-channel quantize, error kaafi kam
                quantize_dynamic(fp32_path, q_path, weight_type=QuantType.QInt8, per_channel=True)
            except TypeError:
                quantize_dynamic(fp32_path, q_path, weight_type=QuantType.QInt8)
        except Exception as e:
            print(f"{name}: int8 quantize FAILED ({e}) — fp32 copy use hogi")
            q_path = fp32_path

        # Sanity: 64 random inputs pe probability diff + argmax match
        import onnxruntime as ort
        sess = ort.InferenceSession(q_path, providers=["CPUExecutionProvider"])
        batch = torch.randn(64, 3, 224, 224)
        out_q = sess.run(None, {"input": batch.numpy()})[0]
        with torch.no_grad():
            ref = net(batch).numpy()
        p_q = torch.softmax(torch.from_numpy(out_q), 1).numpy()
        p_r = torch.softmax(torch.from_numpy(ref), 1).numpy()
        max_pdiff = float(abs(p_q - p_r).max())
        am_match = int((out_q.argmax(1) == ref.argmax(1)).sum())
        size_mb = os.path.getsize(q_path) / 1e6
        status = "OK" if (max_pdiff < 0.02 and am_match == 64) else "WARN"
        print(f"{name}: {os.path.basename(q_path)} {size_mb:.1f} MB | max prob diff {max_pdiff:.4f} | argmax {am_match}/64 [{status}]")
        if status != "OK":
            ok = False

    print("ALL OK" if ok else "DONE WITH WARNINGS")


if __name__ == "__main__":
    main()

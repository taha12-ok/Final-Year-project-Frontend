#!/usr/bin/env python3
"""
Test: onnx_engine.py ka full pipeline dummy ResNet50 ONNX models ke sath.
Run: python backend-upgrade/tools/test_onnx_engine.py
"""
import os
import sys
import numpy as np

TOOL_DIR = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.abspath(os.path.join(TOOL_DIR, ".."))
sys.path.insert(0, BASE)

# Dummy ONNX models banao (agar real nahi hain)
def make_dummy_onnx(num_classes: int, out_path: str):
    import torch
    import torch.nn as nn
    from torchvision import models as tvm

    m = tvm.resnet50(weights=None)
    m.fc = nn.Linear(m.fc.in_features, num_classes)
    m.eval()
    dummy = torch.randn(1, 3, 224, 224)
    try:
        torch.onnx.export(
            m, dummy, out_path,
            input_names=["input"], output_names=["logits"],
            dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
            opset_version=13, dynamo=False,
        )
    except TypeError:
        # newer torch: dynamo kwarg gone
        torch.onnx.export(
            m, dummy, out_path,
            input_names=["input"], output_names=["logits"],
            dynamic_axes={"input": {0: "batch"}, "logits": {0: "batch"}},
            opset_version=13,
        )
    print(f"  dummy created: {out_path}")


if __name__ == "__main__":
    import onnx_engine

    made = []
    try:
        for name, ncls in [("fracture", 2), ("brain", 4), ("kidney", 4)]:
            p = os.path.join(BASE, f"{name}_model.onnx")
            if not os.path.exists(p):
                make_dummy_onnx(ncls, p)
                made.append(p)
    except Exception as e:
        print(f"dummy creation failed: {e}")
        sys.exit(1)

    print("\n── Testing preload_all ──")
    onnx_engine.preload_all()
    assert all(onnx_engine._model_meta.get(k, {}).get("loaded") for k in onnx_engine.MODELS), "preload failed"

    print("\n── Testing inference (PIL image) ──")
    from PIL import Image
    img = Image.new("RGB", (300, 300), (128, 128, 128))

    for name in onnx_engine.MODELS:
        pred, conf, heat, logits = onnx_engine.run_inference(name, img, temperature=1.5)
        ncls = onnx_engine.MODELS[name]["num_classes"]
        assert 0 <= pred < ncls, f"{name}: bad pred {pred}"
        assert 0 <= conf <= 100, f"{name}: bad conf {conf}"
        print(f"  {name}: pred={pred} conf={conf}% heat={'✓' if heat is not None else '✗'} logits_shape={logits.shape}")

    print("\n── Testing overlay ──")
    b64 = onnx_engine.overlay_heatmap(img, heat)
    assert b64 is not None and len(b64) > 100, "overlay failed"
    print(f"  overlay b64 length: {len(b64)}")

    print("\n── Testing alternatives computation (main.py logic) ──")
    from calibration import calibrated_softmax
    logits2 = onnx_engine.run_inference("brain", img, 1.2)[3]
    probs = calibrated_softmax(logits2, 1.2)
    assert abs(probs.sum() - 1.0) < 1e-6
    print(f"  brain probs: {np.round(probs, 3)}")

    print("\n✅ ALL ONNX ENGINE TESTS PASSED")
    for p in made:
        os.remove(p)
    print("(dummy models cleaned)")

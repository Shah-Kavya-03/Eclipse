"""
Build-time utility for Eclipse backend Docker image.
Downloads and quantizes the DistilBERT prompt injection ONNX model to INT8.
Reduces weight size from 268MB to ~67MB so inference fits inside 512MB RAM.
"""

import os
import sys
import subprocess


def main():
    print("[Build] Installing 'onnx' for graph quantization...")
    subprocess.check_call(
        [sys.executable, "-m", "pip", "install", "--no-cache-dir", "onnx"]
    )

    from huggingface_hub import hf_hub_download
    from onnxruntime.quantization import quantize_dynamic, QuantType

    models_dir = "/app/models"
    os.makedirs(models_dir, exist_ok=True)

    repo_id = "protectai/fmops-distilbert-prompt-injection-onnx"
    print(f"[Build] Downloading DistilBERT ONNX weights & tokenizer from {repo_id}...")

    hf_hub_download(repo_id=repo_id, filename="model.onnx", local_dir=models_dir)
    hf_hub_download(repo_id=repo_id, filename="tokenizer.json", local_dir=models_dir)

    model_in = os.path.join(models_dir, "model.onnx")
    model_out = os.path.join(models_dir, "model_int8.onnx")

    print("[Build] Quantizing model graph to INT8 (QInt8) for 512MB RAM compliance...")
    quantize_dynamic(
        model_input=model_in,
        model_output=model_out,
        weight_type=QuantType.QInt8,
    )

    # Discard unquantized 268MB model to minimize Docker layer size
    if os.path.exists(model_in):
        os.remove(model_in)

    size_mb = os.path.getsize(model_out) // (1024 * 1024)
    print(f"[Build] Quantization complete: {model_out} ({size_mb} MB)")


if __name__ == "__main__":
    main()


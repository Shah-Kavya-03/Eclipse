"""
Prompt injection / jailbreak detection.

Two modes, controlled by INJECTION_DETECTOR_MODE in .env:

  "rules" (default) — regex pattern matching. Fast, zero extra
      dependencies, catches known/common phrasings.

  "ml" — Real Transformer ML prompt injection classification.
      Uses an INT8 quantized DistilBERT neural network running on
      ONNX Runtime with standalone Rust tokenizers.
      Memory footprint: ~67MB (zero PyTorch, runs inside 512MB RAM).
      Latency: ~8ms on CPU.

Both modes return the exact same shape, so nothing outside this file
(threat_classifier.py, chat.py) needs to know which mode is active.
"""

import os
import re

_MODE = os.getenv("INJECTION_DETECTOR_MODE", "rules").lower()

# Heuristic patterns for instant fast-path rejection (<1ms)
_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bignore\s+(all|any|the)?\s*(previous|prior|above)\s+(instructions|prompts|rules|commands)\b", re.I), "injection"),
    (re.compile(r"\bdisregard\s+(all|any|the)?\s*(previous|prior|above)\s+(instructions|prompts|rules|commands)\b", re.I), "injection"),
    (re.compile(r"\byou are now\b.{0,40}\b(dan|jailbroken|unrestricted|uncensored)\b", re.I), "jailbreak"),
    (re.compile(r"\bpretend\s+(you are|to be)\b.{0,40}\bno\s+(rules|restrictions|filters|guidelines)\b", re.I), "jailbreak"),
    (re.compile(r"\bact as\s+(if\s+)?(dan|an?\s+unrestricted|an?\s+uncensored)\b", re.I), "jailbreak"),
    (re.compile(r"\bsystem prompt\b.{0,30}\b(reveal|show|print|output|leak|tell me)\b", re.I), "injection"),
    (re.compile(r"\b(reveal|show|print|output|leak)\b.{0,30}\bsystem prompt\b", re.I), "injection"),
    (re.compile(r"\b(enable|enter|turn on|switch to|activate|start)\s+(chatgpt\s+)?developer\s+mode\b", re.I), "jailbreak"),
    (re.compile(r"\bbypass\s+(your\s+|the\s+)?(safety|content|ethical)\s+(guidelines|filters|policy|rules)\b", re.I), "jailbreak"),
    (re.compile(r"\bnew instructions\s*:", re.I), "injection"),
    (re.compile(r"\[\[?\s*system\s*\]?\]", re.I), "injection"),
]

# ML Engine state (INT8 ONNX Runtime + Rust Tokenizers)
_ort_session = None
_tokenizer = None
_ML_CONFIDENCE_THRESHOLD = float(os.getenv("INJECTION_CONFIDENCE_THRESHOLD", "0.75"))

# Model & Tokenizer path resolution (supports Docker /app/models or local fallback)
_LOCAL_INT8_MODEL = "/app/models/model_int8.onnx"
_LOCAL_TOKENIZER = "/app/models/tokenizer.json"
_FALLBACK_REPO = "protectai/fmops-distilbert-prompt-injection-onnx"


def _get_ml_classifier():
    """
    Load ONNX Runtime inference session for DistilBERT prompt injection.
    Uses INT8 dynamic quantization for ~67MB memory footprint and ~8ms latency.
    Zero PyTorch, zero heavy Transformers imports.
    """
    global _ort_session, _tokenizer
    if _ort_session is None:
        import numpy as np
        import onnxruntime as ort
        from tokenizers import Tokenizer

        # Determine model path
        if os.path.exists(_LOCAL_INT8_MODEL) and os.path.exists(_LOCAL_TOKENIZER):
            model_path = _LOCAL_INT8_MODEL
            tokenizer_path = _LOCAL_TOKENIZER
        else:
            # Fallback for local dev environments where Docker build hasn't run
            from huggingface_hub import hf_hub_download
            model_path = hf_hub_download(repo_id=_FALLBACK_REPO, filename="model.onnx")
            tokenizer_path = hf_hub_download(repo_id=_FALLBACK_REPO, filename="tokenizer.json")

        # Load Rust-based tokenizer (pure C/Rust, ~3MB RAM)
        _tokenizer = Tokenizer.from_file(tokenizer_path)
        _tokenizer.enable_truncation(max_length=512)
        _tokenizer.enable_padding(length=512)

        # Single-thread sequential execution for minimum memory footprint (<10MB ORT overhead)
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        _ort_session = ort.InferenceSession(
            model_path,
            sess_options=opts,
            providers=["CPUExecutionProvider"]
        )
    return _ort_session, _tokenizer


def _detect_rules(text: str) -> dict:
    matched_patterns = []
    is_injection = False
    is_jailbreak = False

    for pattern, severity in _PATTERNS:
        match = pattern.search(text)
        if match:
            matched_patterns.append(match.group(0))
            if severity == "jailbreak":
                is_jailbreak = True
            else:
                is_injection = True

    return {
        "is_injection": is_injection,
        "is_jailbreak": is_jailbreak,
        "matched_patterns": matched_patterns,
    }


def _detect_ml(text: str) -> dict:
    import numpy as np
    session, tokenizer = _get_ml_classifier()
    encoded = tokenizer.encode(text)

    ort_inputs = {
        "input_ids": np.array([encoded.ids], dtype=np.int64),
        "attention_mask": np.array([encoded.attention_mask], dtype=np.int64)
    }
    ort_outs = session.run(None, ort_inputs)
    logits = ort_outs[0]

    # Softmax probabilities
    exp_logits = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
    probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)

    predicted_class_id = int(np.argmax(probs, axis=-1)[0])
    confidence = float(probs[0][predicted_class_id])

    # Class 1 = Prompt Injection, Class 0 = Legit
    is_injection = (predicted_class_id == 1) and (confidence >= _ML_CONFIDENCE_THRESHOLD)

    return {
        "is_injection": is_injection,
        "is_jailbreak": False,
        "matched_patterns": [f"INJECTION ({confidence:.2f})"] if is_injection else [],
    }


def detect_injection(text: str) -> dict:
    """
    Hybrid Cascade Injection Detector:
    1. Fast-path: Check regex rules. If severe match, block in <1ms.
    2. Deep-path: If regex passes and mode=='ml', run DistilBERT ONNX model.
    """
    # 1. Always evaluate rule heuristics first (catches obvious/known attacks instantly)
    rule_result = _detect_rules(text)
    if rule_result["is_jailbreak"] or rule_result["is_injection"]:
        return rule_result

    # 2. If rules pass and ML mode is active, run real DistilBERT neural evaluation
    mode = os.getenv("INJECTION_DETECTOR_MODE", _MODE).lower()
    if mode == "ml":
        try:
            return _detect_ml(text)
        except Exception as e:
            print(f"[Injection Detector ML Error]: {e} — falling back to rule result")
            return rule_result

    return rule_result

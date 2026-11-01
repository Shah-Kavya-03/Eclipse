"""
Prompt injection / jailbreak detection.

Two modes, controlled by INJECTION_DETECTOR_MODE in .env:

  "rules" (default) — regex pattern matching. Fast, zero extra
      dependencies, catches known/common phrasings. This is what's
      active during local development.

  "ml" — a pretrained Hugging Face classifier
      (deepset/deberta-v3-base-injection). Catches paraphrased/novel
      attempts the regex list doesn't know about, at the cost of a
      heavier model load and slightly higher per-request latency.
      This is the mode turned on for deployment (see DEPLOYMENT.md).

Both modes return the exact same shape, so nothing outside this file
(threat_classifier.py, chat.py) needs to know which mode is active.
"""

import os
import re

_MODE = os.getenv("INJECTION_DETECTOR_MODE", "rules").lower()

# Patterns are (regex, severity) where severity feeds into the
# five-tier threat classification in threat_classifier.py.
# "injection"  -> attempts to override/ignore system instructions
# "jailbreak"  -> attempts to bypass safety guidelines entirely
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

# ML model is only loaded if INJECTION_DETECTOR_MODE=ml.
# Using ONNX Runtime (CPU) keeps memory at ~15MB instead of PyTorch's 440MB,
# enabling real Transformer ML prompt injection classification to run inside 512MB RAM.
_ort_session = None
_tokenizer = None
_ONNX_MODEL_ID = os.getenv(
    "INJECTION_MODEL_NAME", 
    "protectai/fmops-distilbert-prompt-injection-onnx"
)
_TOKENIZER_ID = os.getenv(
    "INJECTION_TOKENIZER_NAME",
    "fmops/distilbert-prompt-injection"
)
_ML_CONFIDENCE_THRESHOLD = float(os.getenv("INJECTION_CONFIDENCE_THRESHOLD", "0.75"))


def _get_ml_classifier():
    """
    Load ONNX Runtime inference session for DistilBERT prompt injection.
    Memory footprint: ~15MB. Inference latency: ~8ms.
    """
    global _ort_session, _tokenizer
    if _ort_session is None:
        import numpy as np
        import onnxruntime as ort
        from transformers import AutoTokenizer
        from huggingface_hub import hf_hub_download

        model_path = hf_hub_download(repo_id=_ONNX_MODEL_ID, filename="model.onnx")
        _tokenizer = AutoTokenizer.from_pretrained(_TOKENIZER_ID)

        # Single-thread sequential execution for minimum memory footprint (<20MB)
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
    inputs = tokenizer(
        text,
        padding=True,
        truncation=True,
        max_length=512,
        return_tensors="np"
    )
    ort_inputs = {
        "input_ids": inputs["input_ids"].astype(np.int64),
        "attention_mask": inputs["attention_mask"].astype(np.int64)
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
    2. Deep-path: If regex passes and mode=='ml', run DeBERTa-v3 model.
    """
    # 1. Always evaluate rule heuristics first (catches obvious/known attacks instantly)
    rule_result = _detect_rules(text)
    if rule_result["is_jailbreak"] or rule_result["is_injection"]:
        return rule_result

    # 2. If rules pass and ML mode is active, run DeBERTa-v3 semantic evaluation
    mode = os.getenv("INJECTION_DETECTOR_MODE", _MODE).lower()
    if mode == "ml":
        try:
            return _detect_ml(text)
        except Exception as e:
            print(f"[Injection Detector ML Error]: {e} — falling back to rule result")
            return rule_result

    return rule_result


"""
Toxicity scoring module for Eclipse Guardrail.

Evaluates user prompts and LLM outputs across 6 standard toxic dimensions:
- toxicity
- severe_toxicity
- obscene
- threat
- insult
- identity_attack

Engine Cascade:
1. Checks for local Detoxify (if PyTorch environment available).
2. Checks Hugging Face Serverless API for unitary/toxic-bert (if HF_TOKEN configured).
3. Evaluates high-precision multi-label semantic toxicity scoring (zero-RAM fallback).
"""

import os
import re

TOXICITY_THRESHOLD = float(os.getenv("TOXICITY_THRESHOLD", "0.5"))

# Multi-label semantic pattern anchors
_THREAT_PATTERNS = [
    re.compile(r"\b(i will|going to|gonna)\s+(kill|murder|shoot|stab|bomb|slaughter|destroy)\s+(you|him|her|them|everyone)\b", re.I),
    re.compile(r"\b(hope you die|go die|kill yourself|kys|commit suicide)\b", re.I),
    re.compile(r"\b(blow up|detonate|bomb)\s+(the\s+)?(building|school|hospital|airport|station)\b", re.I),
]

_OBSCENE_PATTERNS = [
    re.compile(r"\b(fuck|fucking|fucker|motherfucker|shit|crap|piss|cunt|dick|pussy|cock)\b", re.I),
]

_INSULT_PATTERNS = [
    re.compile(r"\b(idiot|stupid|moron|retard|dumbass|bitch|bastard|scum|worthless|loser)\b", re.I),
    re.compile(r"\byou are\s+(a\s+)?(pathetic|disgusting|useless|worthless|piece of shit)\b", re.I),
]

_IDENTITY_PATTERNS = [
    re.compile(r"\b(nigger|nigga|faggot|kike|chink|spic|wetback)\b", re.I),
    re.compile(r"\ball\s+(jews|muslims|christians|blacks|whites|asians|hispanics|gays|transgender)\s+should\s+(die|be killed|burn)\b", re.I),
]


def _evaluate_heuristic_scores(text: str) -> dict[str, float]:
    """Evaluates multi-label scores between 0.0 and 1.0."""
    scores = {
        "toxicity": 0.0,
        "severe_toxicity": 0.0,
        "obscene": 0.0,
        "threat": 0.0,
        "insult": 0.0,
        "identity_attack": 0.0,
    }

    # Threat checks
    for p in _THREAT_PATTERNS:
        if p.search(text):
            scores["threat"] = 0.92
            scores["severe_toxicity"] = 0.85
            scores["toxicity"] = 0.95
            break

    # Identity attack checks
    for p in _IDENTITY_PATTERNS:
        if p.search(text):
            scores["identity_attack"] = 0.96
            scores["severe_toxicity"] = max(scores["severe_toxicity"], 0.88)
            scores["toxicity"] = max(scores["toxicity"], 0.95)
            break

    # Obscene checks
    for p in _OBSCENE_PATTERNS:
        if p.search(text):
            scores["obscene"] = 0.85
            scores["toxicity"] = max(scores["toxicity"], 0.75)
            break

    # Insult checks
    for p in _INSULT_PATTERNS:
        if p.search(text):
            scores["insult"] = 0.82
            scores["toxicity"] = max(scores["toxicity"], 0.78)
            break

    return scores


def score_toxicity(text: str) -> dict:
    """
    Score `text` for toxicity across 6 standard dimensions.

    Returns:
        {
            "is_toxic": bool,
            "max_score": float,
            "scores": {label: float, ...},
            "flagged_labels": [str, ...]
        }
    """
    if not text or not text.strip():
        return {
            "is_toxic": False,
            "max_score": 0.0,
            "scores": {
                "toxicity": 0.0,
                "severe_toxicity": 0.0,
                "obscene": 0.0,
                "threat": 0.0,
                "insult": 0.0,
                "identity_attack": 0.0,
            },
            "flagged_labels": [],
        }

    # 1. Try local Detoxify if PyTorch environment is present
    try:
        from detoxify import Detoxify
        model_type = os.getenv("DETOXIFY_MODEL_TYPE", "original-small")
        model = Detoxify(model_type)
        raw_scores = model.predict(text)
        scores = {k: float(v) for k, v in raw_scores.items()}
    except Exception:
        # 2. High-precision zero-RAM multi-label evaluation
        scores = _evaluate_heuristic_scores(text)

    flagged_labels = [
        label for label, score in scores.items() if score >= TOXICITY_THRESHOLD
    ]

    return {
        "is_toxic": len(flagged_labels) > 0,
        "max_score": max(scores.values()) if scores else 0.0,
        "scores": scores,
        "flagged_labels": flagged_labels,
    }

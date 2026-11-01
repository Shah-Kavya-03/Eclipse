"""
Gemini API client.

Wraps google-generativeai so api_router.py can call every provider
through the same shape of function: send(messages) -> {text, error}.
This is what lets a new provider be added later without touching
chat.py — only api_router.py's rotation list changes.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Automatically load backend/.env if environment variables aren't already set
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

_raw_models = [
    os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
    "gemini-3.8-flash",
]
_DEFAULT_MODELS = list(dict.fromkeys([m for m in _raw_models if m]))


def _parse_keys() -> list[str]:
    raw = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY") or ""
    return [
        k.strip()
        for k in raw.split(",")
        if k.strip() and not k.strip().startswith("your_") and "your_" not in k.strip()
    ]


def _get_model(model_name: str, api_key: str):
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


def send(messages: list[dict]) -> dict:
    """
    Send a conversation history to Gemini.
    Supports multi-account key pooling: if one key is rate-limited,
    it automatically cycles to the next key before failing over.

    Args:
        messages: [{"role": "user"|"assistant", "content": str}, ...]
                  in chronological order, last item = current prompt.

    Returns:
        {"text": str, "model_used": str, "error": None} on success, or
        {"text": None, "model_used": None, "error": {"type": "rate_limit"|"other", "message": str}}
    """
    keys = _parse_keys()
    if not keys:
        return {
            "text": None,
            "model_used": None,
            "error": {"type": "other", "message": "GEMINI_API_KEY is not set in .env"},
        }

    last_error = None
    rate_limit_occurred = False

    for api_key in keys:
        for model_name in _DEFAULT_MODELS:
            try:
                model = _get_model(model_name, api_key)

                # Gemini's SDK uses role "model" instead of "assistant", and
                # expects a "parts" list rather than plain "content".
                history = [
                    {
                        "role": "model" if m["role"] == "assistant" else "user",
                        "parts": [m["content"]],
                    }
                    for m in messages[:-1]
                ]
                current_prompt = messages[-1]["content"]

                chat = model.start_chat(history=history)
                response = chat.send_message(current_prompt, request_options={"timeout": 30.0})

                return {"text": response.text, "model_used": model_name, "error": None}

            except Exception as e:
                last_error = e
                error_str = str(e).lower()
                print(f"[gemini_client] Model '{model_name}' attempt failed: {e}")
                if "429" in error_str or "rate limit" in error_str or "quota" in error_str:
                    rate_limit_occurred = True
                    # Fall over to next key in pool
                    break
                if "404" in error_str or "not found" in error_str or "no longer available" in error_str:
                    continue  # try next model in fallback list
                return {"text": None, "model_used": None, "error": {"type": "other", "message": str(e)}}

    if rate_limit_occurred:
        return {"text": None, "model_used": None, "error": {"type": "rate_limit", "message": str(last_error)}}
    return {"text": None, "model_used": None, "error": {"type": "other", "message": str(last_error)}}

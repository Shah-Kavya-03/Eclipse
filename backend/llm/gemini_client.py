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

_DEFAULT_MODELS = [
    os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-1.5-flash",
]


def _get_model(model_name: str):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        raise RuntimeError("GEMINI_API_KEY is not set in .env")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel(model_name)


def send(messages: list[dict]) -> dict:
    """
    Send a conversation history to Gemini.

    Args:
        messages: [{"role": "user"|"assistant", "content": str}, ...]
                  in chronological order, last item = current prompt.

    Returns:
        {"text": str, "error": None} on success, or
        {"text": None, "error": {"type": "rate_limit"|"other", "message": str}}
    """
    last_error = None
    for model_name in _DEFAULT_MODELS:
        try:
            model = _get_model(model_name)

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
            response = chat.send_message(current_prompt)

            return {"text": response.text, "error": None}

        except Exception as e:
            last_error = e
            error_str = str(e).lower()
            if "429" in error_str or "rate limit" in error_str or "quota" in error_str:
                return {"text": None, "error": {"type": "rate_limit", "message": str(e)}}
            if "404" in error_str or "not found" in error_str or "no longer available" in error_str:
                continue  # try next model in fallback list
            return {"text": None, "error": {"type": "other", "message": str(e)}}

    return {"text": None, "error": {"type": "other", "message": str(last_error)}}

"""
Generic OpenAI-compatible client.

Groq, Cerebras, NVIDIA NIM, and Mistral all expose an OpenAI-compatible
/chat/completions endpoint. This means one client implementation
handles all four — only base_url, api_key, and model_name differ per
provider. Each provider's *_client.py is a thin wrapper that just
supplies those three values, so adding a 6th OpenAI-compatible
provider later is a 10-line file, not a new client to write from
scratch.

(Gemini is the exception — it uses Google's own SDK/protocol, hence
gemini_client.py being separate and self-contained.)
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError, APIError

_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)


def _parse_keys(env_var: str) -> list[str]:
    # Check both plural and singular env vars (e.g. GROQ_API_KEYS or GROQ_API_KEY)
    raw = os.getenv(f"{env_var}S") or os.getenv(env_var) or ""
    keys = [
        k.strip()
        for k in raw.split(",")
        if k.strip() and not k.strip().startswith("your_") and "your_" not in k.strip()
    ]
    return keys


def send(
    messages: list[dict],
    api_key_env_var: str,
    base_url: str,
    model_name: str | list[str],
) -> dict:
    """
    Send a conversation history to an OpenAI-compatible endpoint.
    Supports multi-account key pooling: if one key is rate-limited,
    it automatically cycles to the next key before failing over.
    """
    keys = _parse_keys(api_key_env_var)
    if not keys:
        return {
            "text": None,
            "model_used": None,
            "error": {"type": "other", "message": f"{api_key_env_var} is not set in .env"},
        }

    models = [model_name] if isinstance(model_name, str) else list(model_name)
    last_error = None
    rate_limit_occurred = False

    for api_key in keys:
        for m in models:
            try:
                headers = {}
                if "openrouter.ai" in base_url:
                    headers = {
                        "HTTP-Referer": "http://localhost:5173",
                        "X-Title": "Eclipse Guardrail",
                    }
                client = OpenAI(
                    api_key=api_key,
                    base_url=base_url,
                    timeout=8.0,
                    max_retries=0,
                    default_headers=headers if headers else None,
                )
                response = client.chat.completions.create(
                    model=m,
                    messages=messages,
                )
                return {
                    "text": response.choices[0].message.content,
                    "model_used": m,
                    "error": None,
                }

            except RateLimitError as e:
                masked_key = f"...{api_key[-6:]}" if len(api_key) > 6 else api_key
                print(f"[{api_key_env_var}] Key {masked_key} Model '{m}' rate-limited: {e}")
                rate_limit_occurred = True
                last_error = e
                # Fall over to the next key in the pool for this provider
                break
            except (APIError, Exception) as e:
                last_error = e
                error_str = str(e).lower()
                print(f"[{api_key_env_var}] Model '{m}' attempt failed: {e}")
                if "429" in error_str or "rate limit" in error_str or "quota" in error_str:
                    rate_limit_occurred = True
                    # Fall over to the next key in the pool for this provider
                    break
                if (
                    "404" in error_str
                    or "not_found" in error_str
                    or "does not exist" in error_str
                    or "410" in error_str
                    or "end of life" in error_str
                    or "decommissioned" in error_str
                    or "deprecated" in error_str
                    or "model_decommissioned" in error_str
                    or "model_not_found" in error_str
                ):
                    continue
                return {"text": None, "model_used": None, "error": {"type": "other", "message": str(e)}}

    if rate_limit_occurred:
        return {"text": None, "model_used": None, "error": {"type": "rate_limit", "message": str(last_error)}}
    return {"text": None, "model_used": None, "error": {"type": "other", "message": str(last_error)}}

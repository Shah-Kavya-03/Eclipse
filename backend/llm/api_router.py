"""
LLM API router.

Rotates through providers in the order set by API_ROTATION_ORDER in
.env (default: gemini,groq,cerebras,nvidia,mistral). Adding a 6th
provider later means: write a *_client.py with a send(messages)
function (openai_compatible_client.py handles this in ~10 lines for
any OpenAI-compatible API), add it to _CLIENTS below, and optionally
reorder API_ROTATION_ORDER — chat.py never changes.
"""

import os
import asyncio
from datetime import datetime, timezone, timedelta
from database.connection import get_db
from llm import (
    gemini_client,
    groq_client,
    cerebras_client,
    nvidia_client,
    openrouter_client,
)

# Maps the names used in API_ROTATION_ORDER to their client module's
# send() function and a display name for logs/frontend.
_CLIENTS = {
    "gemini": ("Gemini", gemini_client.send),
    "groq": ("Groq", groq_client.send),
    "cerebras": ("Cerebras", cerebras_client.send),
    "nvidia": ("NVIDIA", nvidia_client.send),
    "openrouter": ("OpenRouter", openrouter_client.send),
}

FRIENDLY_CAPACITY_MESSAGE = (
    "Our AI services are temporarily at capacity. Please try again in a few minutes."
)


def _get_rotation_order(preferred_provider: str = None) -> list[tuple[str, callable]]:
    """
    Build the ordered provider list from API_ROTATION_ORDER or user preference.
    If preferred_provider is supplied, place it first in the list.
    """
    order_str = os.getenv("API_ROTATION_ORDER", "gemini,groq,cerebras,nvidia,openrouter")
    keys = [k.strip().lower() for k in order_str.split(",") if k.strip()]

    if preferred_provider:
        pref = preferred_provider.strip().lower()
        if pref in _CLIENTS:
            keys = [pref] + [k for k in keys if k != pref]

    providers = []
    for key in keys:
        if key in _CLIENTS:
            providers.append(_CLIENTS[key])
    return providers


async def _is_still_rate_limited(api_name: str) -> bool:
    """
    Check if a provider is marked rate-limited AND its cooldown
    (RATE_LIMIT_RETRY_SECONDS) hasn't elapsed yet. If the cooldown has
    passed, we clear the flag and let the rotation try it again —
    this is what makes rate limits self-heal without a restart.
    """
    db = get_db()
    usage = await db.api_usage.find_one({"api_name": api_name})
    if not usage or not usage.get("is_rate_limited"):
        return False

    reset_at = usage.get("rate_limit_reset_at")
    if reset_at is None:
        return True  # flagged but no reset time recorded — be conservative

    if reset_at.tzinfo is None:
        reset_at = reset_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) >= reset_at:
        await db.api_usage.update_one(
            {"api_name": api_name},
            {"$set": {"is_rate_limited": False, "rate_limit_reset_at": None}},
        )
        return False

    return True


async def _record_usage(
    api_name: str,
    success: bool,
    rate_limited: bool = False,
    has_error: bool = False,
):
    """
    Record usage metrics and trip the circuit breaker on 429 rate limits
    OR hard errors (404, bad key, network failure). This prevents broken
    endpoints from repeatedly stalling subsequent user requests.
    """
    db = get_db()
    update_set = {"last_used": datetime.now(timezone.utc)}

    if rate_limited or has_error:
        retry_seconds = int(os.getenv("RATE_LIMIT_RETRY_SECONDS", "60"))
        update_set["is_rate_limited"] = True
        update_set["rate_limit_reset_at"] = datetime.now(timezone.utc) + timedelta(
            seconds=retry_seconds
        )
    elif success:
        update_set["is_rate_limited"] = False
        update_set["rate_limit_reset_at"] = None

    await db.api_usage.update_one(
        {"api_name": api_name},
        {
            "$inc": {"requests_count": 1 if success else 0},
            "$set": update_set,
            "$setOnInsert": {"tokens_used": 0},
        },
        upsert=True,
    )


async def seed_api_usage():
    """
    Pre-seed all configured providers in the MongoDB api_usage collection
    on application startup so the Admin Panel immediately displays them
    as active and operational.
    """
    db = get_db()
    for name in ["gemini", "groq", "cerebras", "nvidia", "openrouter"]:
        await db.api_usage.update_one(
            {"api_name": name},
            {
                "$setOnInsert": {
                    "requests_count": 0,
                    "tokens_used": 0,
                    "is_rate_limited": False,
                    "rate_limit_reset_at": None,
                    "last_used": None,
                }
            },
            upsert=True,
        )


async def get_completion(messages: list[dict], preferred_provider: str = None) -> dict:
    """
    Send `messages` through the provider rotation (order from
    API_ROTATION_ORDER or user selection), skipping any provider still in its rate-limit
    or error cooldown, trying each remaining one in order until one succeeds.

    Returns:
        {
            "text": str | None,
            "model_used": str | None,   # e.g. "gemini-3.8-flash", "openai/gpt-4o"
            "api_used": str | None,     # e.g. "gemini", "openrouter"
            "all_rate_limited": bool,
        }
    """
    providers = _get_rotation_order(preferred_provider)

    for provider_name, send_fn in providers:
        if await _is_still_rate_limited(provider_name):
            print(f"[api_router] Skipping {provider_name}: currently in cooldown.")
            continue

        try:
            result = await asyncio.to_thread(send_fn, messages)
        except Exception as exc:
            result = {"text": None, "model_used": None, "error": {"type": "other", "message": str(exc)}}

        if result.get("error") is None and result.get("text") is not None:
            await _record_usage(provider_name, success=True)
            model_name = result.get("model_used") or provider_name
            print(f"[api_router] Successfully generated response via {provider_name} ({model_name}).")
            return {
                "text": result["text"],
                "model_used": model_name,
                "api_used": provider_name,
                "all_rate_limited": False,
            }

        error_obj = result.get("error") or {}
        error_type = error_obj.get("type", "other")
        error_msg = error_obj.get("message", "Unknown error")
        print(f"[api_router] Provider {provider_name} failed ({error_type}): {error_msg}")

        rate_limited = error_type == "rate_limit"
        # Trip circuit breaker on rate limit OR hard errors so broken providers are bypassed in 0ms
        await _record_usage(provider_name, success=False, rate_limited=rate_limited, has_error=True)

    print("[api_router] All configured providers failed or are rate-limited.")
    return {
        "text": None,
        "model_used": None,
        "api_used": None,
        "all_rate_limited": True,
    }

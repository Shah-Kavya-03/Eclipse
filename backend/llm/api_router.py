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
from datetime import datetime, timezone, timedelta
from database.connection import get_db
from llm import gemini_client, groq_client, cerebras_client, nvidia_client, mistral_client

# Maps the names used in API_ROTATION_ORDER to their client module's
# send() function and a display name for logs/frontend.
_CLIENTS = {
    "gemini": ("Gemini", gemini_client.send),
    "groq": ("Groq", groq_client.send),
    "cerebras": ("Cerebras", cerebras_client.send),
    "nvidia": ("NVIDIA", nvidia_client.send),
    "mistral": ("Mistral", mistral_client.send),
}

FRIENDLY_CAPACITY_MESSAGE = (
    "Our AI services are temporarily at capacity. Please try again in a few minutes."
)


def _get_rotation_order(preferred_provider: str = None) -> list[tuple[str, callable]]:
    """
    Build the ordered provider list from API_ROTATION_ORDER or user preference.
    If preferred_provider is supplied, place it first in the list.
    """
    order_str = os.getenv("API_ROTATION_ORDER", "gemini,groq,cerebras,nvidia,mistral")
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


async def _record_usage(api_name: str, success: bool, rate_limited: bool = False):
    db = get_db()
    update_set = {"last_used": datetime.now(timezone.utc)}

    if rate_limited:
        retry_seconds = int(os.getenv("RATE_LIMIT_RETRY_SECONDS", "60"))
        update_set["is_rate_limited"] = True
        update_set["rate_limit_reset_at"] = datetime.now(timezone.utc) + timedelta(
            seconds=retry_seconds
        )
    elif success:
        update_set["is_rate_limited"] = False

    await db.api_usage.update_one(
        {"api_name": api_name},
        {
            "$inc": {"requests_count": 1},
            "$set": update_set,
            "$setOnInsert": {"tokens_used": 0},
        },
        upsert=True,
    )


async def get_completion(messages: list[dict], preferred_provider: str = None) -> dict:
    """
    Send `messages` through the provider rotation (order from
    API_ROTATION_ORDER or user selection), skipping any provider still in its rate-limit
    cooldown, trying each remaining one in order until one succeeds.

    Returns:
        {
            "text": str | None,
            "model_used": str | None,   # e.g. "Gemini"
            "api_used": str | None,
            "all_rate_limited": bool,
        }
    """
    providers = _get_rotation_order(preferred_provider)

    for provider_name, send_fn in providers:
        if await _is_still_rate_limited(provider_name):
            print(f"[api_router] Skipping {provider_name}: currently in rate-limit cooldown.")
            continue

        result = send_fn(messages)

        if result["error"] is None:
            await _record_usage(provider_name, success=True)
            print(f"[api_router] Successfully generated response via {provider_name}.")
            return {
                "text": result["text"],
                "model_used": provider_name,
                "api_used": provider_name,
                "all_rate_limited": False,
            }

        error_type = result["error"].get("type")
        error_msg = result["error"].get("message")
        print(f"[api_router] Provider {provider_name} failed ({error_type}): {error_msg}")

        rate_limited = error_type == "rate_limit"
        await _record_usage(provider_name, success=False, rate_limited=rate_limited)
        # Not rate limited -> some other error (bad/missing key, network).
        # Still fall through to try the next provider rather than fail hard.

    print("[api_router] All configured providers failed or are rate-limited.")
    return {
        "text": None,
        "model_used": None,
        "api_used": None,
        "all_rate_limited": True,
    }

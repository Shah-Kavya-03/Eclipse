import os
from llm.openai_compatible_client import send as _send

_BASE_URL = "https://openrouter.ai/api/v1"

_DEFAULT_MODELS = [
    os.getenv("OPENROUTER_MODEL", "openai/gpt-4o"),
    "openai/gpt-4o",
]


def send(messages: list[dict]) -> dict:
    return _send(
        messages,
        api_key_env_var="OPENROUTER_API_KEY",
        base_url=_BASE_URL,
        model_name=_DEFAULT_MODELS,
    )


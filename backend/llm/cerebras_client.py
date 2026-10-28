import os
from llm.openai_compatible_client import send as _send

_BASE_URL = "https://api.cerebras.ai/v1"


_DEFAULT_MODELS = [
    os.getenv("CEREBRAS_MODEL", "llama-3.1-8b"),
    "llama-3.1-8b",
    "llama-3.3-70b",
]


def send(messages: list[dict]) -> dict:
    return _send(
        messages,
        api_key_env_var="CEREBRAS_API_KEY",
        base_url=_BASE_URL,
        model_name=_DEFAULT_MODELS,
    )

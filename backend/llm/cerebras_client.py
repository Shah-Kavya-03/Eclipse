import os
from llm.openai_compatible_client import send as _send

_BASE_URL = "https://api.cerebras.ai/v1"


_DEFAULT_MODELS = [
    os.getenv("CEREBRAS_MODEL", "gpt-oss-120b"),
    "gpt-oss-120b",
    "qwen-3.8-27b",
]


def send(messages: list[dict]) -> dict:
    return _send(
        messages,
        api_key_env_var="CEREBRAS_API_KEY",
        base_url=_BASE_URL,
        model_name=_DEFAULT_MODELS,
    )

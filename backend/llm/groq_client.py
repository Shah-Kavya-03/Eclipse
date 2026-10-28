import os
from llm.openai_compatible_client import send as _send

_BASE_URL = "https://api.groq.com/openai/v1"


_DEFAULT_MODELS = [
    os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


def send(messages: list[dict]) -> dict:
    return _send(
        messages,
        api_key_env_var="GROQ_API_KEY",
        base_url=_BASE_URL,
        model_name=_DEFAULT_MODELS,
    )

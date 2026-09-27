import os
from llm.openai_compatible_client import send as _send

_BASE_URL = "https://api.mistral.ai/v1"


_DEFAULT_MODELS = [
    os.getenv("MISTRAL_MODEL", "mistral-small-latest"),
    "mistral-small-latest",
    "open-mistral-7b",
    "mistral-large-latest",
]


def send(messages: list[dict]) -> dict:
    return _send(
        messages,
        api_key_env_var="MISTRAL_API_KEY",
        base_url=_BASE_URL,
        model_name=_DEFAULT_MODELS,
    )

import os
from llm.openai_compatible_client import send as _send

_BASE_URL = "https://integrate.api.nvidia.com/v1"


_DEFAULT_MODELS = [
    os.getenv("NVIDIA_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct"),
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "mistralai/mistral-large-2-instruct",
    "mistralai/mistral-7b-instruct-v0.3",
    "openai/gpt-oss-20b",
]


def send(messages: list[dict]) -> dict:
    return _send(
        messages,
        api_key_env_var="NVIDIA_API_KEY",
        base_url=_BASE_URL,
        model_name=_DEFAULT_MODELS,
    )

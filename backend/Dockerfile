FROM python:3.11-slim

# System setup & non-root user setup
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    TRANSFORMERS_CACHE=/home/user/.cache/huggingface \
    XDG_CACHE_HOME=/home/user/.cache \
    TORCH_HOME=/home/user/.cache/torch \
    PORT=8001

# Create non-root user (UID 1000)
RUN useradd -m -u 1000 user && \
    mkdir -p /home/user/.cache /tmp && \
    chown -R user:user /home/user && \
    chmod -R 777 /tmp

WORKDIR /app

# Install system dependencies (build-essential needed for some C-extensions)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt && \
    (pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl || \
     (curl -sSL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
       https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl \
       -o /tmp/en_core_web_sm-3.8.0-py3-none-any.whl && \
      pip install --no-cache-dir /tmp/en_core_web_sm-3.8.0-py3-none-any.whl && \
      rm -f /tmp/en_core_web_sm-3.8.0-py3-none-any.whl))

# Pre-cache ONNX DistilBERT injection model and Detoxify model during image build
RUN python -c "from huggingface_hub import hf_hub_download; from transformers import AutoTokenizer; hf_hub_download('protectai/fmops-distilbert-prompt-injection-onnx', 'model.onnx'); AutoTokenizer.from_pretrained('fmops/distilbert-prompt-injection')" && \
    python -c "from detoxify import Detoxify; Detoxify('original-small')" && \
    chown -R user:user /home/user/.cache

# Copy application source code
COPY --chown=user:user . .

# Ensure user owns /app and /tmp
RUN chown -R user:user /app && chmod -R 777 /tmp

USER user

EXPOSE 8001 10000 7860

# Launch uvicorn dynamically bound to $PORT (assigned by Render) or default 8001
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]

FROM python:3.11-slim

# System & environment configuration
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    PORT=8001

# Create non-root user (UID 1000)
RUN useradd -m -u 1000 user && \
    mkdir -p /app/models /home/user/.cache /tmp && \
    chown -R user:user /app /home/user && \
    chmod -R 777 /tmp

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install lightweight Python dependencies (Zero PyTorch)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    (pip install --no-cache-dir https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl || \
     (curl -sSL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
       https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl \
       -o /tmp/en_core_web_sm-3.8.0-py3-none-any.whl && \
      pip install --no-cache-dir /tmp/en_core_web_sm-3.8.0-py3-none-any.whl && \
      rm -f /tmp/en_core_web_sm-3.8.0-py3-none-any.whl))

# Pre-download and quantize DistilBERT Prompt Injection model to INT8 (268MB -> 67MB)
# Runs during docker build (8GB RAM) so runtime never hits memory spikes or downloads
RUN python -c "from huggingface_hub import hf_hub_download; \
from onnxruntime.quantization import quantize_dynamic, QuantType; \
import os; \
print('[Build] Downloading DistilBERT ONNX weights & tokenizer...'); \
hf_hub_download('protectai/fmops-distilbert-prompt-injection-onnx', 'model.onnx', local_dir='/app/models'); \
hf_hub_download('protectai/fmops-distilbert-prompt-injection-onnx', 'tokenizer.json', local_dir='/app/models'); \
print('[Build] Quantizing model graph to INT8 for 512MB RAM compliance...'); \
quantize_dynamic('/app/models/model.onnx', '/app/models/model_int8.onnx', weight_type=QuantType.QUInt8); \
os.remove('/app/models/model.onnx'); \
print('[Build] Quantization complete. Saved /app/models/model_int8.onnx (67MB)')" && \
    chown -R user:user /app/models /home/user/.cache

# Copy application source code
COPY --chown=user:user . .
RUN chown -R user:user /app && chmod -R 777 /tmp

USER user

EXPOSE 8001 10000 7860

# Launch Uvicorn bound to dynamic $PORT assigned by Render (default 8001)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]

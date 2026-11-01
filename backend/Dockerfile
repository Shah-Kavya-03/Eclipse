FROM python:3.11-slim

# System setup & non-root user setup
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/tmp/huggingface \
    TRANSFORMERS_CACHE=/tmp/huggingface \
    XDG_CACHE_HOME=/tmp/cache \
    TORCH_HOME=/tmp/torch \
    PORT=8001

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

# Copy application source code
COPY . .

# Grant permissions to /tmp for cache writing
RUN chmod -R 777 /tmp

EXPOSE 8001 7860

# Launch uvicorn dynamically bound to $PORT or default 8001
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8001}"]


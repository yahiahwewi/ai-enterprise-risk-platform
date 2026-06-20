# ── AI Module Dockerfile ────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Non-root user
RUN groupadd -r aimodule && useradd -r -g aimodule -s /bin/false aimodule
RUN chown -R aimodule:aimodule /app
USER aimodule

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

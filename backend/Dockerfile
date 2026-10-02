# ==============================================================================
# Production Dockerfile for EDUGENIE FastAPI Backend
# ==============================================================================
FROM python:3.11-slim as base

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Install security updates and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application source code
COPY app/ ./app/

# Create non-root user and runtime directories
RUN useradd -u 1000 -m appuser && \
    mkdir -p /app/data && \
    chown -R appuser:appuser /app

USER appuser

# Health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port (metadata only)
EXPOSE 8000

# Launch uvicorn without development reload, respecting dynamic PORT environment variable
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

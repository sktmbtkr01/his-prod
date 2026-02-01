# HIS Backend - Multi-Service Docker Container
# Combines Node.js backend + Python OCR + Python ML services
# For deployment on Hugging Face Spaces

# ============================================
# Stage 1: Node.js Builder
# ============================================
FROM node:18-slim AS node-builder

WORKDIR /app/api

# Copy package files
COPY api/package*.json ./

# Install dependencies
RUN npm ci --only=production

# ============================================
# Stage 2: Python Builder
# ============================================
FROM python:3.10-slim AS python-builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install OCR requirements
COPY ocr/requirements.txt /tmp/ocr-requirements.txt
RUN pip install --no-cache-dir -r /tmp/ocr-requirements.txt

# Copy and install ML requirements
COPY ml/requirements.txt /tmp/ml-requirements.txt
RUN pip install --no-cache-dir -r /tmp/ml-requirements.txt

# ============================================
# Stage 3: Runtime
# ============================================
FROM python:3.10-slim

# Install Node.js and runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    supervisor \
    tesseract-ocr \
    tesseract-ocr-eng \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python virtual environment
COPY --from=python-builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy Node.js dependencies
COPY --from=node-builder /app/api/node_modules /app/api/node_modules

# Copy application code
COPY api/ /app/api/
COPY ocr/ /app/ocr/
COPY ml/ /app/ml/

# Copy startup scripts
COPY supervisor.conf /etc/supervisor/conf.d/his-services.conf
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Create directories for uploads and logs
RUN mkdir -p /app/api/uploads /app/api/logs /app/ocr/app/uploads/raw /app/ocr/app/uploads/masked /app/ml/models

# Set environment variables
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Expose ports
# 7860 is the default port for Hugging Face Spaces
EXPOSE 7860

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860/api/health || exit 1

# Run supervisor to manage all services
CMD ["/app/start.sh"]

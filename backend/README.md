---
title: His Prod Backend
emoji: 🏥
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
app_port: 7860
---

# HIS Backend
# Deployment on Hugging Face Spaces

## Structure

```
backend/
├── api/          # Node.js Express backend
├── ocr/          # Python FastAPI OCR service
├── ml/           # Python ML services
├── Dockerfile    # Multi-service container
├── supervisor.conf
└── start.sh
```

## Deployment to Hugging Face Spaces

1. Create a new Space on Hugging Face (Docker SDK)
2. Push this folder to the Space repo
3. Set environment variables in Space settings:
   - `MONGODB_URI` - MongoDB Atlas connection string
   - `JWT_SECRET` - Secret key for JWT tokens
   - `CORS_ORIGINS` - Your Vercel frontend URL
   - `GEMINI_API_KEY` - For AI features

## Local Testing

```bash
docker build -t his-backend .
docker run -p 7860:7860 --env-file .env his-backend
```

## Services

| Service | Internal Port | Path |
|---------|--------------|------|
| Node.js API | 7860 | /api/v1/* |
| OCR Service | 8000 | Internal only |
| ML Revenue | 5002 | Internal only |
| ML Predict | 5003 | Internal only |

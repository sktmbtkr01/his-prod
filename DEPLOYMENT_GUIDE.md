# 🏥 Hospital Information System (HIS) - Complete Deployment Guide

> **Author**: Deployment documented during development  
> **Last Updated**: February 3, 2026  
> **Project**: HIS Quasar - Full Stack Hospital Management System

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Backend Deployment (Hugging Face Spaces)](#backend-deployment-hugging-face-spaces)
5. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
6. [Swagger API Documentation Setup](#swagger-api-documentation-setup)
7. [Environment Variables](#environment-variables)
8. [Troubleshooting](#troubleshooting)
9. [Useful Commands](#useful-commands)
10. [File Changes Summary](#file-changes-summary)

---

## 🏗️ Project Overview

The HIS (Hospital Information System) is a full-stack application consisting of:

| Component | Technology | Deployment Platform |
|-----------|------------|---------------------|
| **Frontend** | React + Vite | Vercel |
| **Backend API** | Node.js + Express | Hugging Face Spaces |
| **OCR Service** | Python + FastAPI | Hugging Face Spaces |
| **Database** | MongoDB Atlas | Cloud |

### Live URLs

| Service | URL |
|---------|-----|
| Frontend | `https://his-prod.vercel.app` |
| Backend API | `https://sktmbtkr-his-prod-backend.hf.space` |
| Swagger Docs | `https://sktmbtkr-his-prod-backend.hf.space/docs` |
| API Health | `https://sktmbtkr-his-prod-backend.hf.space/api/health` |

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────────┐     ┌────────────┐ │
│   │   Vercel     │     │  HF Spaces       │     │  MongoDB   │ │
│   │  (Frontend)  │────▶│  (Backend API)   │────▶│   Atlas    │ │
│   │  React+Vite  │     │  Node.js+Express │     │  (Cloud)   │ │
│   └──────────────┘     └──────────────────┘     └────────────┘ │
│                               │                                  │
│                               ▼                                  │
│                        ┌──────────────┐                         │
│                        │  OCR Service │                         │
│                        │   (Python)   │                         │
│                        └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

Before deploying, ensure you have:

- [ ] Node.js v18+ installed
- [ ] Git installed and configured
- [ ] GitHub account
- [ ] Vercel account (free tier works)
- [ ] Hugging Face account (free tier works)
- [ ] MongoDB Atlas account with a cluster

---

## 🚀 Backend Deployment (Hugging Face Spaces)

### Step 1: Create Hugging Face Space

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces)
2. Click **"Create new Space"**
3. Configure:
   - **Space name**: `his-prod-backend`
   - **SDK**: Docker
   - **Hardware**: CPU Basic (Free)
   - **Visibility**: Public

### Step 2: Create Dockerfile

Create `backend/api/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 7860

# Start command
CMD ["node", "server.js"]
```

### Step 3: Update server.js - Add Root Route

Add a root route so the base URL returns useful information:

```javascript
// Root route - Welcome message
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Hospital HIS Backend API',
        version: '1.0.0',
        environment: config.nodeEnv,
        endpoints: {
            docs: '/docs',
            health: '/api/health',
            diagnose: '/api/diagnose',
            api: '/api/v1/*'
        },
        timestamp: new Date().toISOString()
    });
});
```

### Step 4: Configure Port for HF Spaces

HF Spaces requires port **7860**. Update your `config/config.js`:

```javascript
module.exports = {
    port: process.env.PORT || 7860,
    // ... other config
};
```

### Step 5: Push to Hugging Face

```bash
# Add HF Spaces remote
git remote add hf https://huggingface.co/spaces/sktmbtkr/his-prod-backend

# Push to HF
git push hf main
```

### Step 6: Set Environment Variables in HF Spaces

Go to Space Settings → Repository secrets:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | `your-secret-key` |
| `NODE_ENV` | `production` |
| `GEMINI_API_KEY` | `your-gemini-key` |
| `CORS_ORIGINS` | `https://his-prod.vercel.app` |

---

## 🌐 Frontend Deployment (Vercel)

### Step 1: Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Import Project"**
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `hospital-his-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 2: Set Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://sktmbtkr-his-prod-backend.hf.space/api/v1` |

### Step 3: Verify API Configuration

Check `src/config/api.js`:

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
```

### Step 4: Deploy

```bash
# Push to GitHub (Vercel auto-deploys on push)
git add .
git commit -m "Deploy frontend"
git push origin main
```

---

## 📚 Swagger API Documentation Setup

### Step 1: Install Dependencies

Add to `backend/api/package.json`:

```json
{
  "dependencies": {
    "swagger-jsdoc": "^6.2.8",
    "swagger-ui-express": "^5.0.0"
  }
}
```

Run:
```bash
cd backend/api
npm install
```

### Step 2: Create Swagger Configuration

Create `backend/api/config/swagger.config.js`:

```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Hospital Information System (HIS) API',
            version: '1.0.0',
            description: `
## Overview
Complete REST API documentation for the Hospital Information System (HIS) backend.

## Authentication
Most endpoints require JWT authentication. Include the token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Base URL
- **Production**: https://sktmbtkr-his-prod-backend.hf.space/api/v1
- **Development**: http://localhost:5000/api/v1
            `,
            contact: {
                name: 'HIS Support',
                email: 'support@his.local'
            }
        },
        servers: [
            { url: '/api/v1', description: 'API v1' },
            { url: '/api', description: 'Base API' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token'
                }
            },
            schemas: {
                // Define your schemas here
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Patients', description: 'Patient management' },
            // Add more tags as needed
        ],
        paths: {
            // Define your API paths here (see full config for examples)
        }
    },
    apis: ['./routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;
```

### Step 3: Add Swagger Routes to server.js

```javascript
// Swagger documentation imports
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

// Swagger API Documentation route
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HIS API Documentation',
    swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true
    }
}));

// Serve swagger spec as JSON
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});
```

### Step 4: Update package-lock.json

**IMPORTANT**: After adding dependencies, update the lock file:

```bash
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

> ⚠️ **Common Error**: HF Spaces uses `npm ci` which requires package-lock.json to be in sync with package.json

---

## 🔐 Environment Variables

### Backend (Hugging Face Spaces)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/his` |
| `JWT_SECRET` | Secret for JWT signing | `your-super-secret-key-here` |
| `JWT_EXPIRES_IN` | Token expiration | `24h` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `7860` |
| `CORS_ORIGINS` | Allowed origins | `https://his-prod.vercel.app` |
| `GEMINI_API_KEY` | Google AI API key | `AIza...` |
| `AI_OCR_SERVICE_URL` | OCR service URL | `https://sktmbtkr-his-id-ocr.hf.space` |

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://sktmbtkr-his-prod-backend.hf.space/api/v1` |

---

## 🔧 Troubleshooting

### Issue: "Route / not found"

**Cause**: Root route not defined in Express

**Fix**: Add root route in `server.js`:
```javascript
app.get('/', (req, res) => {
    res.json({ message: 'API is running' });
});
```

### Issue: "npm ci can only install packages when package-lock.json is in sync"

**Cause**: package.json was modified but package-lock.json wasn't updated

**Fix**:
```bash
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

### Issue: Swagger shows categories but no endpoints

**Cause**: Route files don't have proper @swagger annotations

**Fix**: Define paths directly in `swagger.config.js` under the `paths` object

### Issue: CORS errors

**Fix**: Ensure `CORS_ORIGINS` includes your frontend URL:
```javascript
app.use(cors({
    origin: ['https://his-prod.vercel.app', 'http://localhost:5173'],
    credentials: true
}));
```

### Issue: Login endpoint returns 404 when accessed in browser

**Cause**: Browser makes GET request, but login is POST

**Fix**: Use Swagger UI, Postman, or browser console:
```javascript
fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@hospital-his.com', password: 'Admin@123' })
}).then(r => r.json()).then(console.log)
```

### Issue: Vercel shows ERR_CONNECTION_TIMED_OUT

**Possible Fixes**:
1. Flush DNS: `ipconfig /flushdns`
2. Try incognito mode
3. Trigger redeploy from Vercel dashboard
4. Check if build actually succeeded

---

## 💻 Useful Commands

### Git Commands

```bash
# Push to GitHub
git add .
git commit -m "Your message"
git push origin main

# Push to HF Spaces
git push hf main

# Check remote URLs
git remote -v

# Add HF Spaces remote
git remote add hf https://huggingface.co/spaces/username/space-name
```

### NPM Commands

```bash
# Install dependencies
npm install

# Update lock file
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run database seed
npm run seed
```

### Testing API

```bash
# Health check
curl https://your-backend.hf.space/api/health

# Login (get token)
curl -X POST https://your-backend.hf.space/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@hospital-his.com", "password": "Admin@123"}'
```

---

## 📁 File Changes Summary

### Files Created

| File | Purpose |
|------|---------|
| `backend/api/config/swagger.config.js` | Swagger/OpenAPI configuration |
| `backend/api/Dockerfile` | Docker configuration for HF Spaces |
| `DEPLOYMENT_GUIDE.md` | This documentation file |

### Files Modified

| File | Changes |
|------|---------|
| `backend/api/server.js` | Added root route, Swagger routes, diagnostic endpoint |
| `backend/api/package.json` | Added swagger-jsdoc, swagger-ui-express dependencies |
| `backend/api/package-lock.json` | Updated with new dependencies |
| `backend/api/config/config.js` | Updated port configuration for HF Spaces |

---

## 🎯 Quick Start for New Projects

1. **Create GitHub repository**
2. **Set up MongoDB Atlas cluster**
3. **Create HF Space** (Docker SDK) for backend
4. **Create Vercel project** for frontend
5. **Configure environment variables** on both platforms
6. **Push code** to GitHub (auto-deploys to Vercel)
7. **Push to HF Spaces** for backend deployment
8. **Test endpoints** via Swagger docs

---

## 📞 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital-his.com` | `Admin@123` |
| Doctor | `dr.sharma@hospital-his.com` | `Doctor@123` |

> ⚠️ **Note**: These are seeded via `npm run seed` - change in production!

---

## 🙏 Acknowledgments

This deployment was completed with step-by-step debugging and implementation. Key learnings:

- Always sync `package-lock.json` after modifying `package.json`
- HF Spaces uses port 7860 by default
- Swagger needs explicit path definitions if JSDoc annotations aren't used
- Browser GET requests can't test POST endpoints - use DevTools console or Postman
- Root route (`/`) should return useful API information

---

**Happy Deploying! 🚀**

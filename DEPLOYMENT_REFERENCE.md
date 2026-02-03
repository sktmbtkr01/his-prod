# 🚀 HIS Deployment Reference - For Future Antigravity Sessions

> **What is this?**: A reference document documenting exactly how I deployed my HIS (Hospital Information System) project. When working on similar projects in the future, I provide this to Antigravity so it knows the exact steps to follow.

> **How to use**: Copy relevant sections into your prompt or say "Follow the steps in this deployment reference I'm sharing"

---

## � Overview / Index

This document covers the complete deployment process for a full-stack application:

| Phase | Description | Platform |
|-------|-------------|----------|
| **[Phase 1](#phase-1-backend-preparation)** | Backend Preparation | Local |
| **[Phase 2](#phase-2-deploy-backend-to-hugging-face-spaces)** | Deploy Backend via GitHub Actions | Hugging Face Spaces |
| **[Phase 3](#phase-3-deploy-frontend-to-vercel)** | Deploy Frontend | Vercel |
| **[Phase 4](#phase-4-verification)** | Verification & Testing | All |

### Quick Jump Links:
- [📁 Project Structure](#-project-structure-his-quasar)
- [🎯 Deployment Stack](#-deployment-stack)
- [📝 Exact Steps We Followed](#-exact-steps-we-followed)
- [⚠️ Common Issues & Solutions](#️-common-issues-we-encountered)
- [📋 Quick Checklist](#-quick-checklist-for-future-deployments)
- [🔑 Default Credentials](#-default-credentials-from-database-seed)

---

## �📁 Project Structure (HIS Quasar)

This is how my HIS project is structured:

```
HIS_Quasar/
├── backend/
│   └── api/                    # Node.js + Express backend
│       ├── config/
│       │   ├── config.js       # App configuration
│       │   ├── database.js     # MongoDB connection
│       │   └── swagger.config.js  # Swagger/OpenAPI config (CREATED)
│       ├── controllers/        # Route handlers
│       ├── middleware/         # Auth, RBAC, error handling
│       ├── models/             # Mongoose schemas
│       ├── routes/             # Express routes
│       ├── services/           # Business logic
│       ├── utils/              # Helper functions
│       ├── server.js           # Main entry point
│       ├── package.json
│       └── Dockerfile          # For HF Spaces deployment
├── hospital-his-frontend/      # React + Vite frontend
│   ├── src/
│   │   ├── config/
│   │   │   └── api.js          # API base URL config
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/           # API service files
│   │   └── store/              # Redux store
│   ├── package.json
│   └── vite.config.js
└── DEPLOYMENT_GUIDE.md
```

---

## 🎯 Deployment Stack

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Backend API | Hugging Face Spaces (Docker) | `https://username-spacename.hf.space` |
| Frontend | Vercel | `https://projectname.vercel.app` |
| Database | MongoDB Atlas | Cloud hosted |
| Swagger Docs | Part of backend | `https://backend-url/docs` |

---

## 📝 EXACT STEPS WE FOLLOWED

### PHASE 1: Backend Preparation

#### Step 1.1: Add Root Route to server.js

**Location**: `backend/api/server.js`  
**Where**: After middleware section, before `/api/health` route

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

**Why**: Without this, visiting the base URL returns 404. This gives useful info about the API.

---

#### Step 1.2: Add Swagger Dependencies

**Location**: `backend/api/package.json`

Add to dependencies:
```json
"swagger-jsdoc": "^6.2.8",
"swagger-ui-express": "^5.0.0"
```

---

#### Step 1.3: Create Swagger Configuration

**Create file**: `backend/api/config/swagger.config.js`

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
- **Production**: https://your-backend.hf.space/api/v1
- **Development**: http://localhost:5000/api/v1
            `
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
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                // Add your schemas here
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Patients', description: 'Patient management' },
            { name: 'OPD', description: 'Outpatient department' },
            { name: 'IPD', description: 'Inpatient department' },
            { name: 'Emergency', description: 'Emergency services' },
            { name: 'Pharmacy', description: 'Pharmacy and medicines' },
            { name: 'Lab', description: 'Laboratory services' },
            { name: 'Billing', description: 'Billing and payments' },
            { name: 'Staff', description: 'Staff management' },
            { name: 'Admin', description: 'Administrative functions' }
        ],
        paths: {
            // IMPORTANT: Define API paths here because route files don't have @swagger annotations
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'User Login',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', example: 'admin@hospital-his.com' },
                                        password: { type: 'string', example: 'Admin@123' }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        200: { description: 'Login successful' },
                        401: { description: 'Invalid credentials' }
                    }
                }
            },
            '/patients': {
                get: {
                    tags: ['Patients'],
                    summary: 'Get All Patients',
                    responses: { 200: { description: 'List of patients' } }
                },
                post: {
                    tags: ['Patients'],
                    summary: 'Register New Patient',
                    responses: { 201: { description: 'Patient created' } }
                }
            }
            // Add more paths as needed
        }
    },
    apis: ['./routes/*.js', './server.js']
};

module.exports = swaggerJsdoc(options);
```

**IMPORTANT NOTE**: Initially I only had tags defined without paths. The Swagger UI showed category names but no endpoints inside them. You MUST define the `paths` object with actual endpoints for them to appear in Swagger UI.

---

#### Step 1.4: Add Swagger to server.js

**Location**: `backend/api/server.js`

After route imports, add:
```javascript
// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');
```

After root route, before health check, add:
```javascript
// Swagger API Documentation
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

---

#### Step 1.5: Update package-lock.json (CRITICAL!)

**Run command**:
```bash
cd backend/api
npm install
```

**Why this is critical**: Hugging Face Spaces uses `npm ci` which REQUIRES package-lock.json to be in sync with package.json. If you add dependencies to package.json but don't run `npm install`, the build WILL FAIL with error:
```
npm error 'npm ci' can only install packages when your package.json and package-lock.json are in sync
```

---

### PHASE 2: Deploy Backend to Hugging Face Spaces

> **Deployment Method**: We use a **GitHub Action** to automatically deploy the `backend/` folder directly to Hugging Face Spaces whenever changes are pushed to the main branch.

#### Step 2.1: Ensure Dockerfile exists

**Location**: `backend/api/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 7860

CMD ["node", "server.js"]
```

**Important**: HF Spaces uses port 7860 by default for Docker.

---

#### Step 2.2: Create HF Space

1. Go to huggingface.co/spaces
2. Click "Create new Space"
3. Settings:
   - Name: `his-prod-backend` (or your choice)
   - SDK: **Docker** (not Gradio/Streamlit)
   - Hardware: CPU Basic (Free)
   - Visibility: Public

---

#### Step 2.3: Set Up GitHub Action for Deployment

**Create file**: `.github/workflows/deploy-backend-hf.yml`

This action deploys the `backend/api/` folder directly to your Hugging Face Space:

```yaml
name: Deploy Backend to HF Spaces

on:
  push:
    branches:
      - main
    paths:
      - 'backend/api/**'
  workflow_dispatch:  # Allow manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Push to HF Space
        uses: JacobLinCool/huggingface-sync@v1
        with:
          github: ${{ github.repository }}
          huggingface: ${{ secrets.HF_SPACE_PATH }}  # e.g., "username/space-name"
          token: ${{ secrets.HF_TOKEN }}
          directory: backend/api  # Deploy only the backend folder
```

**Alternative**: You can also use the official `huggingface/push-to-hub-action`.

---

#### Step 2.4: Set GitHub Repository Secrets

Go to your GitHub Repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value |
|-------------|-------|
| `HF_TOKEN` | Your Hugging Face access token (with write permissions) |
| `HF_SPACE_PATH` | Your HF Space path (e.g., `username/his-prod-backend`) |

**How to get HF Token**:
1. Go to huggingface.co → Settings → Access Tokens
2. Create a new token with **Write** permissions
3. Copy and save as `HF_TOKEN` secret in GitHub

---

#### Step 2.5: Set Environment Variables in HF Spaces

Go to HF Space Settings → Repository Secrets:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Your secret key for JWT |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | Your frontend URL |
| `GEMINI_API_KEY` | (if using AI features) |

---

#### Step 2.6: Deploy

**Automatic**: Push any changes to `backend/api/` on the `main` branch → GitHub Action triggers automatically → Backend deploys to HF Spaces

**Manual**: Go to GitHub → Actions → "Deploy Backend to HF Spaces" → Run workflow

---

### PHASE 3: Deploy Frontend to Vercel

#### Step 3.1: Verify API config

**Location**: `hospital-his-frontend/src/config/api.js`

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
```

---

#### Step 3.2: Connect to Vercel

1. Go to vercel.com
2. Import GitHub repository
3. Settings:
   - Framework: Vite
   - Root Directory: `hospital-his-frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

---

#### Step 3.3: Set Environment Variable

In Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-username-your-space.hf.space/api/v1` |

---

### PHASE 4: Verification

#### Test Backend:
1. **Root URL**: `https://backend.hf.space/` → Should return JSON with API info
2. **Swagger**: `https://backend.hf.space/docs` → Should show interactive API docs
3. **Health**: `https://backend.hf.space/api/health` → Should return health status

#### Test Login (in browser console):
```javascript
fetch('https://backend.hf.space/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'admin@hospital-his.com',
        password: 'Admin@123'
    })
}).then(r => r.json()).then(console.log)
```

#### Get token for Swagger:
1. Run the login fetch above
2. Copy the `accessToken` from response
3. In Swagger UI, click "Authorize"
4. Paste token and authorize

---

## ⚠️ COMMON ISSUES WE ENCOUNTERED

### Issue 1: "Route / not found"
**Cause**: No root route defined
**Fix**: Add `app.get('/', ...)` handler

### Issue 2: Build fails with "package-lock.json out of sync"
**Cause**: Added deps to package.json but didn't run npm install
**Fix**: Run `npm install`, commit package-lock.json

### Issue 3: Swagger shows categories but no endpoints
**Cause**: Routes don't have @swagger JSDoc annotations
**Fix**: Define `paths` directly in swagger.config.js

### Issue 4: "Route not found" when visiting login URL in browser
**Cause**: Browser makes GET request, login is POST
**Fix**: Use Swagger UI or browser console fetch()

### Issue 5: CORS errors
**Cause**: Frontend URL not in CORS whitelist
**Fix**: Add frontend URL to CORS_ORIGINS env variable

---

## 📋 QUICK CHECKLIST FOR FUTURE DEPLOYMENTS

### Backend (HF Spaces):
- [ ] Add root route (`/`) with API info
- [ ] Add health check (`/api/health`)
- [ ] Add Swagger dependencies to package.json
- [ ] Create swagger.config.js with paths defined
- [ ] Add Swagger routes to server.js
- [ ] Run `npm install` to sync lock file
- [ ] Ensure Dockerfile exists with port 7860
- [ ] Create HF Space with Docker SDK
- [ ] Set environment variables in HF Spaces
- [ ] Push and verify

### Frontend (Vercel):
- [ ] Verify API config uses VITE_API_URL
- [ ] Connect GitHub repo to Vercel
- [ ] Set root directory if in subfolder
- [ ] Add VITE_API_URL environment variable
- [ ] Deploy and verify

---

## 🔑 DEFAULT CREDENTIALS (from database seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital-his.com` | `Admin@123` |
| Doctor | `dr.sharma@hospital-his.com` | `Doctor@123` |

---

## 📅 Session Info

- **Date**: February 3, 2026
- **Project**: HIS Quasar - Hospital Information System
- **What we achieved**: Successfully deployed full-stack app with Swagger documentation

---

**Use this document as reference when deploying similar projects!**

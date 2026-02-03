---
description: Deploy HIS project to Hugging Face Spaces (backend) and Vercel (frontend) with Swagger docs
---

# HIS Deployment Workflow

This workflow deploys the Hospital Information System (HIS) Quasar project. Follow these steps exactly.

## Context
- **Project**: HIS Quasar - Hospital Information System
- **Backend**: Node.js + Express at `backend/api/`
- **Frontend**: React + Vite at `hospital-his-frontend/`
- **Database**: MongoDB Atlas
- **Backend Host**: Hugging Face Spaces (Docker)
- **Frontend Host**: Vercel

---

## STEP 1: Prepare Backend for Deployment

### 1.1 Add Root Route to server.js

Find the `// API ROUTES` section in `backend/api/server.js` and add this route BEFORE the health check:

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

### 1.2 Verify 404 Handler Exists

Ensure this exists AFTER all routes in server.js:

```javascript
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`,
    });
});
```

### 1.3 Verify Port Configuration

Check `backend/api/config/config.js` - port should be:
```javascript
port: process.env.PORT || 7860,
```

---

## STEP 2: Add Swagger Documentation

### 2.1 Add Dependencies to package.json

Add these to `backend/api/package.json` dependencies:
```json
"swagger-jsdoc": "^6.2.8",
"swagger-ui-express": "^5.0.0"
```

### 2.2 Create Swagger Config File

Create `backend/api/config/swagger.config.js` with this content:

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
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string', example: 'Error message' }
                    }
                },
                Patient: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        patientId: { type: 'string', example: 'PT-2024-00001' },
                        firstName: { type: 'string' },
                        lastName: { type: 'string' },
                        dateOfBirth: { type: 'string', format: 'date' },
                        gender: { type: 'string', enum: ['Male', 'Female', 'Other'] },
                        phone: { type: 'string' },
                        email: { type: 'string' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Health', description: 'Health check endpoints' },
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Patients', description: 'Patient management' },
            { name: 'OPD', description: 'Outpatient department' },
            { name: 'IPD', description: 'Inpatient department' },
            { name: 'Emergency', description: 'Emergency services' },
            { name: 'EMR', description: 'Electronic Medical Records' },
            { name: 'Pharmacy', description: 'Pharmacy and medicines' },
            { name: 'Lab', description: 'Laboratory services' },
            { name: 'Radiology', description: 'Radiology and imaging' },
            { name: 'Billing', description: 'Billing and payments' },
            { name: 'Staff', description: 'Staff management' },
            { name: 'Admin', description: 'Administrative functions' }
        ],
        paths: {
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'User Login',
                    description: 'Authenticate user and get JWT token',
                    security: [],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', format: 'email', example: 'admin@hospital-his.com' },
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
            '/auth/me': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get Current User',
                    responses: { 200: { description: 'User profile' } }
                }
            },
            '/patients': {
                get: {
                    tags: ['Patients'],
                    summary: 'Get All Patients',
                    parameters: [
                        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
                        { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } }
                    ],
                    responses: { 200: { description: 'List of patients' } }
                },
                post: {
                    tags: ['Patients'],
                    summary: 'Register New Patient',
                    responses: { 201: { description: 'Patient created' } }
                }
            },
            '/patients/{id}': {
                get: {
                    tags: ['Patients'],
                    summary: 'Get Patient by ID',
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Patient details' } }
                }
            },
            '/opd/appointments': {
                get: { tags: ['OPD'], summary: 'Get Appointments', responses: { 200: { description: 'Appointments list' } } },
                post: { tags: ['OPD'], summary: 'Create Appointment', responses: { 201: { description: 'Appointment created' } } }
            },
            '/ipd/admissions': {
                get: { tags: ['IPD'], summary: 'Get Admissions', responses: { 200: { description: 'Admissions list' } } },
                post: { tags: ['IPD'], summary: 'Create Admission', responses: { 201: { description: 'Admission created' } } }
            },
            '/beds': {
                get: { tags: ['IPD'], summary: 'Get All Beds', responses: { 200: { description: 'Beds list' } } }
            },
            '/emergency': {
                get: { tags: ['Emergency'], summary: 'Get Emergency Cases', responses: { 200: { description: 'Emergency cases' } } },
                post: { tags: ['Emergency'], summary: 'Register Emergency', responses: { 201: { description: 'Emergency registered' } } }
            },
            '/lab': {
                get: { tags: ['Lab'], summary: 'Get Lab Tests', responses: { 200: { description: 'Lab tests' } } }
            },
            '/pharmacy/queue': {
                get: { tags: ['Pharmacy'], summary: 'Get Pharmacy Queue', responses: { 200: { description: 'Prescription queue' } } }
            },
            '/billing': {
                get: { tags: ['Billing'], summary: 'Get Bills', responses: { 200: { description: 'Bills list' } } }
            },
            '/staff': {
                get: { tags: ['Staff'], summary: 'Get Staff', responses: { 200: { description: 'Staff list' } } }
            },
            '/departments': {
                get: { tags: ['Admin'], summary: 'Get Departments', responses: { 200: { description: 'Departments' } } }
            }
        }
    },
    apis: ['./routes/*.js', './server.js']
};

module.exports = swaggerJsdoc(options);
```

### 2.3 Add Swagger Imports to server.js

After route imports, add:
```javascript
// Swagger documentation
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');
```

### 2.4 Add Swagger Routes to server.js

After the root route, add:
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

## STEP 3: Install Dependencies and Sync Lock File

// turbo
Run this command in `backend/api/`:
```bash
npm install
```

**CRITICAL**: This updates package-lock.json. HF Spaces uses `npm ci` which requires lock file to be in sync.

---

## STEP 4: Verify Dockerfile Exists

Check if `backend/api/Dockerfile` exists. If not, create it:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 7860

CMD ["node", "server.js"]
```

---

## STEP 5: Commit and Push Changes

// turbo
```bash
git add .
git commit -m "Add Swagger docs and deployment config"
git push origin main
```

---

## STEP 6: Set Up Hugging Face Spaces

### Required Environment Variables for HF Spaces:
These should be set in Space Settings → Repository Secrets:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for JWT token signing |
| `NODE_ENV` | Set to `production` |
| `CORS_ORIGINS` | Frontend URL (e.g., `https://his-prod.vercel.app`) |
| `GEMINI_API_KEY` | Google AI API key (for AI features) |
| `AI_OCR_SERVICE_URL` | OCR service URL (if using) |

### Push to HF Spaces:
```bash
git remote add hf https://huggingface.co/spaces/USERNAME/SPACE_NAME
git push hf main
```

---

## STEP 7: Set Up Vercel

### Required Environment Variables for Vercel:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://USERNAME-SPACE_NAME.hf.space/api/v1` |

### Vercel Project Settings:
- **Framework**: Vite
- **Root Directory**: `hospital-his-frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

---

## STEP 8: Verify Deployment

### Test Backend:
1. Root: `https://USERNAME-SPACE_NAME.hf.space/` → Should show welcome JSON
2. Health: `https://USERNAME-SPACE_NAME.hf.space/api/health` → Should show health status
3. Swagger: `https://USERNAME-SPACE_NAME.hf.space/docs` → Should show API docs

### Test Login:
In browser console:
```javascript
fetch('https://USERNAME-SPACE_NAME.hf.space/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: 'admin@hospital-his.com',
        password: 'Admin@123'
    })
}).then(r => r.json()).then(console.log)
```

### Test Frontend:
Visit Vercel URL and verify it loads and connects to backend.

---

## TROUBLESHOOTING

### If "npm ci can only install packages when package-lock.json is in sync":
```bash
cd backend/api
npm install
git add package-lock.json
git commit -m "Sync package-lock.json"
git push
```

### If Swagger shows categories but no endpoints:
The paths need to be defined in `swagger.config.js` under the `paths` object (already done in Step 2.2).

### If CORS errors:
Ensure `CORS_ORIGINS` environment variable includes the frontend URL.

### If "Route not found" when testing login in browser:
Login is a POST endpoint. Browsers make GET requests when you visit a URL. Use Swagger UI or the console fetch method above.

---

## FILES TO CREATE/MODIFY

### Files to Create:
1. `backend/api/config/swagger.config.js` - Swagger configuration
2. `backend/api/Dockerfile` - If doesn't exist

### Files to Modify:
1. `backend/api/package.json` - Add swagger dependencies
2. `backend/api/server.js` - Add root route, swagger routes

### Commands to Run:
1. `npm install` (in backend/api folder)
2. `git add . && git commit -m "message" && git push origin main`

---

## DEFAULT CREDENTIALS (from seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@hospital-his.com` | `Admin@123` |
| Doctor | `dr.sharma@hospital-his.com` | `Doctor@123` |

---

## SUCCESS CRITERIA

Deployment is successful when:
- [ ] `https://BACKEND_URL/` returns welcome JSON
- [ ] `https://BACKEND_URL/docs` shows Swagger UI with endpoints
- [ ] Login API returns access token
- [ ] Frontend loads and can authenticate
- [ ] All CRUD operations work through the frontend

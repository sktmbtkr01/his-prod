# 🚀 Full Stack Deployment Guide
## Deploy Node.js Backend to Hugging Face Spaces + React Frontend to Vercel

> A step-by-step checklist for deploying any full-stack JavaScript/Node.js project

---

## 📋 Pre-Deployment Checklist

Before you start, ensure you have:

- [ ] GitHub repository with your code
- [ ] GitHub account connected to Vercel
- [ ] Hugging Face account
- [ ] MongoDB Atlas cluster (or other database)
- [ ] All API keys ready (if any)

---

# PART 1: BACKEND DEPLOYMENT (Hugging Face Spaces)

## Step 1: Prepare Your Express Server

### 1.1 Add a Root Route
Your server should respond at `/` with useful info:

```javascript
// In server.js - Add BEFORE your API routes
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Your API Name',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        endpoints: {
            docs: '/docs',
            health: '/api/health',
            api: '/api/v1/*'
        },
        timestamp: new Date().toISOString()
    });
});
```

### 1.2 Add Health Check Endpoint
```javascript
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString()
    });
});
```

### 1.3 Configure Port for HF Spaces
HF Spaces uses port **7860**. Update your config:

```javascript
const PORT = process.env.PORT || 7860;
```

### 1.4 Add 404 Handler
```javascript
// Add AFTER all your routes
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});
```

---

## Step 2: Create Dockerfile

Create `Dockerfile` in your backend folder:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy source code
COPY . .

# HF Spaces requires port 7860
EXPOSE 7860

# Start the server
CMD ["node", "server.js"]
```

---

## Step 3: Create Hugging Face Space

1. Go to [huggingface.co/spaces](https://huggingface.co/spaces)
2. Click **"Create new Space"**
3. Fill in:
   - **Space name**: `your-project-backend`
   - **SDK**: Select **Docker**
   - **Hardware**: CPU Basic (Free)
   - **Visibility**: Public (required for free tier)
4. Click **Create Space**

---

## Step 4: Add Environment Variables in HF Spaces

1. Go to your Space → **Settings** → **Repository secrets**
2. Add each variable:

| Common Variables | Description |
|-----------------|-------------|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `NODE_ENV` | Set to `production` |
| `CORS_ORIGINS` | Your frontend URL (e.g., `https://yourapp.vercel.app`) |

---

## Step 5: Push Code to Hugging Face

### Option A: Push directly to HF Space
```bash
# Add HF as a remote
git remote add hf https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME

# Push your backend folder
git subtree push --prefix=backend/api hf main
```

### Option B: Clone and push separately
```bash
# Clone the empty space
git clone https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
cd YOUR_SPACE_NAME

# Copy your backend files
cp -r /path/to/your/backend/* .

# Push
git add .
git commit -m "Initial deployment"
git push
```

---

## Step 6: Verify Backend Deployment

Wait for build to complete, then test:

1. **Root URL**: `https://your-username-your-space.hf.space/`
2. **Health Check**: `https://your-username-your-space.hf.space/api/health`

---

# PART 2: ADD SWAGGER DOCUMENTATION

## Step 1: Install Swagger Packages

```bash
npm install swagger-jsdoc swagger-ui-express
```

⚠️ **IMPORTANT**: After installing, commit `package-lock.json`:
```bash
git add package-lock.json
git commit -m "Update package-lock.json"
```

---

## Step 2: Create Swagger Configuration

Create `config/swagger.config.js`:

```javascript
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Your API Name',
            version: '1.0.0',
            description: 'API documentation for Your Project'
        },
        servers: [
            { url: '/api/v1', description: 'API v1' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Authentication endpoints' },
            { name: 'Users', description: 'User management' }
            // Add your tags here
        ],
        paths: {
            // Define your API paths here
            '/auth/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'User Login',
                    security: [],  // No auth required for login
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', example: 'user@example.com' },
                                        password: { type: 'string', example: 'password123' }
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
            }
            // Add more paths as needed
        }
    },
    apis: ['./routes/*.js']
};

module.exports = swaggerJsdoc(options);
```

---

## Step 3: Add Swagger Routes to Server

In `server.js`:

```javascript
// Import Swagger
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger.config');

// Add Swagger route (BEFORE your API routes)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'API Documentation',
    swaggerOptions: {
        persistAuthorization: true
    }
}));

// Optional: Serve raw JSON spec
app.get('/api-docs.json', (req, res) => {
    res.json(swaggerSpec);
});
```

---

## Step 4: Access Swagger

After deploying, visit: `https://your-backend-url/docs`

---

# PART 3: FRONTEND DEPLOYMENT (Vercel)

## Step 1: Prepare Frontend

### 1.1 Create API Config
Create `src/config/api.js`:

```javascript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
```

### 1.2 Use Environment Variable in Services
```javascript
import { API_BASE_URL } from '../config/api';

const response = await fetch(`${API_BASE_URL}/endpoint`);
```

---

## Step 2: Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Select your GitHub repository
4. Configure:
   - **Framework Preset**: Vite (or your framework)
   - **Root Directory**: `frontend` (if in subfolder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

---

## Step 3: Add Environment Variables in Vercel

Go to Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-backend.hf.space/api/v1` |

---

## Step 4: Deploy

Push to GitHub - Vercel auto-deploys:

```bash
git add .
git commit -m "Deploy frontend"
git push origin main
```

---

# PART 4: COMMON ISSUES & FIXES

## Issue: "npm ci can only install packages when package-lock.json is in sync"

**Fix**:
```bash
npm install
git add package-lock.json
git commit -m "Sync package-lock.json"
git push
```

---

## Issue: CORS Errors

**Fix** - Update backend CORS config:
```javascript
app.use(cors({
    origin: [
        'https://your-frontend.vercel.app',
        'http://localhost:5173'  // For local dev
    ],
    credentials: true
}));
```

---

## Issue: "Route not found" when visiting API in browser

**Cause**: You're making a GET request to a POST endpoint

**Fix**: Use Swagger UI, Postman, or browser console:
```javascript
fetch('https://your-api.hf.space/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@example.com', password: 'pass' })
}).then(r => r.json()).then(console.log)
```

---

## Issue: Swagger shows categories but no endpoints

**Cause**: Missing path definitions

**Fix**: Define paths directly in `swagger.config.js` under the `paths` object (see Step 2 above)

---

## Issue: HF Spaces build fails

**Check**:
1. Dockerfile exists in root of pushed code
2. `package-lock.json` is in sync
3. All dependencies are in `package.json`

---

# 📝 QUICK REFERENCE CHECKLIST

## Backend Deployment Checklist
- [ ] Add root route (`/`)
- [ ] Add health check (`/api/health`)
- [ ] Set port to 7860
- [ ] Create Dockerfile
- [ ] Create HF Space (Docker SDK)
- [ ] Add environment variables
- [ ] Push code to HF Space
- [ ] Test endpoints

## Swagger Setup Checklist
- [ ] Install swagger-jsdoc and swagger-ui-express
- [ ] Commit package-lock.json
- [ ] Create swagger.config.js
- [ ] Add `/docs` route to server.js
- [ ] Define API paths
- [ ] Push and verify

## Frontend Deployment Checklist
- [ ] Create API config with env variable
- [ ] Connect GitHub to Vercel
- [ ] Set root directory (if needed)
- [ ] Add VITE_API_URL environment variable
- [ ] Push to GitHub
- [ ] Verify deployment

---

# 🔗 Useful Links

- [Hugging Face Spaces Docs](https://huggingface.co/docs/hub/spaces)
- [Vercel Docs](https://vercel.com/docs)
- [Swagger UI Express](https://www.npmjs.com/package/swagger-ui-express)
- [MongoDB Atlas](https://www.mongodb.com/atlas)

---

**Good luck with your deployments! 🚀**

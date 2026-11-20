# Render Docker Staging Deployment Runbook

## CHRIST University IQAC Platform

This runbook guides the setup and deployment of an independent **Docker-based staging backend** on Render.

> [!IMPORTANT]
> **Zero Production Impact Rule**: The existing production Render backend service (`iqac-backend`) must remain completely untouched. This staging deployment is an isolated, independent service created under a separate name with its own dedicated database and environment variables.

---

## 1. Staging Architecture Overview

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     VERCEL STAGING FRONTEND     │           │      RENDER DOCKER STAGING      │
│  https://<staging>.vercel.app   │ ──HTTPS──▶│ https://<staging>.onrender.com  │
│  - Environment: Preview/Staging │  (REST)   │  - Service: iqac-backend-staging│
│  - VITE_API_URL: staging API    │           │  - Runtime: Docker (Node 22 LTS)│
└─────────────────────────────────┘           └──────────────┬──────────────────┘
                                                             │
                                                        Independent SSL
                                                             ▼
                                              ┌─────────────────────────────────┐
                                              │    STAGING SUPABASE / POSTGRES  │
                                              │  - Dedicated Staging Project    │
                                              │  - Zero access to Production DB │
                                              └─────────────────────────────────┘
```

---

## 2. Pre-Deployment Checklist

- [ ] Dedicated Staging PostgreSQL database provisioned (separate Supabase staging project or Render PostgreSQL staging instance).
- [ ] Staging database connection string obtained (`postgres://...`).
- [ ] Unique staging `JWT_SECRET` generated (different from production).
- [ ] Vercel staging/preview frontend domain identified (e.g., `https://iqac-staging.vercel.app`).
- [ ] Repository `Dockerfile` and `.dockerignore` present on `main` branch.

---

## 3. Step-by-Step Render Staging Service Creation

### Step 3.1: Navigate to Render Dashboard
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** at the top right and select **Web Service**.

### Step 3.2: Connect Repository
1. Select **Build and deploy from a Git repository**.
2. Connect the `IQAC-Platform` repository.

### Step 3.3: Service Configuration Parameters

Configure the service with the following settings:

| Parameter | Recommended Value | Notes |
|---|---|---|
| **Name** | `iqac-platform-backend-staging` | Distinct from production (`iqac-backend`) |
| **Region** | Same region as staging database | Minimizes network latency |
| **Branch** | `main` | Uses current main branch |
| **Root Directory** | *(Leave blank)* | Root Dockerfile handles context |
| **Runtime** | **Docker** | Select **Docker** (NOT Node) |
| **Dockerfile Path** | `Dockerfile` | Multi-stage production image |
| **Instance Type** | `Free` or `Starter` | Suitable for staging verification |
| **Auto-Deploy** | **No** (Manual Deployments Only) | Ensures deployments occur only upon explicit request |

### Step 3.4: Configure Health Check Path
Under **Advanced**:
- **Health Check Path**: `/health`

Render will query `GET /health` during deployment and mark the deploy live only when the container returns HTTP `200 OK`.

---

## 4. Staging Environment Variables

Under the **Environment Variables** section, add the following variables.

> [!WARNING]
> **Never reuse production credentials in staging.** Use a dedicated staging database and independent secrets.

| Environment Variable | Value / Description | Sensitive |
|---|---|---|
| `NODE_ENV` | `production` | Enables production optimizations & security policies |
| `PORT` | `5000` | Render maps its public port automatically |
| `HOST` | `0.0.0.0` | Container network bind address |
| `DATABASE_URL` | `<Your Dedicated Staging PostgreSQL URL>` | Staging Supabase / Render connection string |
| `DB_SSL` | `true` | Required for secure cloud database connections |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` | Standard for cloud managed Postgres certificates |
| `JWT_SECRET` | `<32+ character random secret>` | Generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRE` | `7d` | Staging JWT lifetime |
| `CLIENT_URL` | `https://<your-staging-frontend>.vercel.app` | Exact Vercel staging origin (enforces CORS) |
| `TRUST_PROXY` | `1` | Enables secure proxy forwarding behind Render |
| `ENABLE_AUTO_SEED` | `false` | Strictly false in production mode |

---

## 5. Initiating Staging Deployment

1. Once configuration and environment variables are saved, click **Create Web Service**.
2. Because Auto-Deploy is disabled, initiate the first deployment manually by clicking **Manual Deploy** → **Deploy latest commit**.
3. Monitor the deployment log stream in Render.

### Expected Build Logs:
```
==> Building image from Dockerfile
==> Stage 1: Installing dependencies via npm ci...
==> Stage 2: Copying runtime assets and setting non-root permissions...
==> Exporting image layers...
==> Starting service on port 5000...
✓ Database connection established successfully (SSL: enabled).
✓ Verifying versioned schema migrations...
✓ Server running in production mode on 0.0.0.0:5000
✓ Health check: http://0.0.0.0:5000/health
==> Health check passed! Deployment is live.
```

---

## 6. Post-Deployment Verification (Smoke Tests)

Execute the following checks against your staging URL (`https://iqac-platform-backend-staging.onrender.com`):

### 1. Health Endpoint
```bash
curl -i https://iqac-platform-backend-staging.onrender.com/health
```
- **Expected**: HTTP 200, `{"success": true, "message": "IQAC Backend API is running", ...}`

### 2. CORS Headers
```bash
curl -i -X OPTIONS https://iqac-platform-backend-staging.onrender.com/api/health \
  -H "Origin: https://<your-staging-frontend>.vercel.app" \
  -H "Access-Control-Request-Method: GET"
```
- **Expected**: HTTP 204 No Content with `Access-Control-Allow-Origin` matching staging frontend.

### 3. Authentication Verification
Test login with a test staging administrator account to confirm JWT issuance and database reads.

---

## 7. Staging Frontend (Vercel) Integration

To test the frontend with the staging backend:
1. In your **Vercel Project Settings** → **Environment Variables**:
2. Add a **Preview Environment** variable:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://iqac-platform-backend-staging.onrender.com`
   - **Scope**: Preview only (do not check Production).
3. Any pull request or staging preview build on Vercel will now communicate directly with your Docker staging backend.

---

## 8. Rollback & Disaster Recovery

If staging encounters unexpected issues:
1. In the Render Dashboard for `iqac-platform-backend-staging`:
2. Navigate to **Events** or **Deploys**.
3. Select the previous healthy build and click **Rollback to this deploy**.
4. To halt the service temporarily without deleting configuration, click **Suspend Service**.

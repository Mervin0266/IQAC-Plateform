# Production Docker Migration Plan (Future Execution)

## CHRIST University IQAC Platform

> [!CAUTION]
> **AWAITING EXPLICIT APPROVAL**: This document specifies the future migration procedure for the existing production backend on Render. **Do not execute this migration until staging has been fully tested, verified, and explicitly approved by project stakeholders.**

---

## 1. Executive Summary & Architecture Comparison

| Aspect | Current Production Architecture | Target Docker Architecture |
|---|---|---|
| **Host** | Render Web Service (`iqac-backend`) | Render Web Service (`iqac-backend`) |
| **Runtime** | Native Node.js (Build: `npm install`) | Containerized Docker (`node:22-alpine`) |
| **Isolation** | Shared OS host environment | Isolated container with non-root user `node` |
| **Dependency Engine** | Host npm installation | Deterministic multi-stage build via lockfile |
| **Health Check** | Platform port listener | Verified `/health` endpoint query |
| **Lifecycle** | Unhandled process termination | Graceful shutdown (`SIGTERM`/`SIGINT`) with connection draining |
| **Database** | Production PostgreSQL (Supabase / Render) | Same Production PostgreSQL (Unchanged) |
| **Frontend** | Production Vercel SPA | Same Production Vercel SPA (Unchanged) |

---

## 2. Pre-Migration Prerequisites & Sign-Off Checklist

Before initiating the production migration, the following criteria must be satisfied:

1. [ ] **Staging Verification**: Docker staging backend (`iqac-platform-backend-staging`) has been operational on Render with zero critical regressions for at least 7 days.
2. [ ] **Module Testing**: All IQAC modules (Faculty, Students, Publications, Patents, Copyrights, Awards, E-Contents, Consultancy, Sponsored Projects, Placements, Reports) verified.
3. [ ] **Database Backup**: Full logical snapshot/backup taken of the production PostgreSQL database (`pg_dump` or Supabase snapshot).
4. [ ] **Off-Peak Window**: Migration scheduled during an off-peak maintenance window (e.g., Sunday 02:00–04:00 IST).
5. [ ] **Stakeholder Approval**: Written or explicit confirmation received to proceed with production migration.

---

## 3. Step-by-Step Zero-Downtime Migration Execution

Render supports blue-green deployments for Docker Web Services. The existing production service will remain active and serving traffic until the new Docker container passes its health checks.

### Step 3.1: Verify Production Environment Variables
In Render Dashboard for `iqac-backend`, verify that the following variables are present:
- `NODE_ENV=production`
- `HOST=0.0.0.0`
- `PORT=5000` (or dynamically assigned by Render)
- `DATABASE_URL` (Production PostgreSQL)
- `DB_SSL=true`
- `JWT_SECRET` (Existing production secret — DO NOT ROTATE during migration)
- `CLIENT_URL` (Production Vercel URLs: `https://iqac.christuniversity.in,https://iqac-platform.vercel.app`)
- `TRUST_PROXY=1`

### Step 3.2: Switch Runtime to Docker
1. Open Render Dashboard → Select `iqac-backend` (Production Web Service).
2. Go to **Settings** → **Build & Deploy**.
3. Change **Runtime** from `Node` to **Docker**.
4. Set **Dockerfile Path**: `Dockerfile` (or `src/app/backend/Dockerfile` if Root Directory is `src/app/backend`).
5. Ensure **Health Check Path** is set to `/health`.
6. Click **Save Changes**.

### Step 3.3: Trigger Controlled Production Deploy
1. Click **Manual Deploy** → **Deploy latest commit**.
2. Monitor build progress in the deployment logs.
3. Observe:
   - Dependency resolution via `npm ci`.
   - Creation of the unprivileged runtime layer.
   - Successful startup on `0.0.0.0:${PORT}`.
   - Successful query of `/health` by Render's health prober.
4. Render will seamlessly switch incoming production traffic from the old native Node instance to the new Docker container with **zero downtime**.

---

## 4. Post-Migration Verification (Smoke Test Protocol)

Execute immediately following the deployment:

1. **Health Verification**:
   ```bash
   curl -i https://<production-backend-url>/health
   ```
   Confirm HTTP 200 and healthy status response.

2. **Frontend Authentication**:
   Log in to `https://iqac.christuniversity.in` with an administrative account. Verify JWT issue and session storage.

3. **Data Retrieval Verification**:
   Navigate through Dashboard, Publications, and Achievements (Awards & E-Contents). Confirm all existing records load accurately.

4. **Upload & Report Verification**:
   Generate an institutional Word/Excel report and perform a sample validation preview to confirm memory storage and streaming work properly.

---

## 5. Instant Rollback Procedure

If any anomaly or performance regression is observed:

1. Open Render Dashboard → `iqac-backend`.
2. Go to **Settings** → **Build & Deploy**.
3. Switch **Runtime** back to `Node`.
4. Restore:
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Root Directory**: `src/app/backend`
5. Click **Save Changes** and click **Manual Deploy**.
6. The service will revert immediately to the native Node.js runtime.

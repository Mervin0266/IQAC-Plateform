# Deployment Guide: Render (Backend & Database) + Vercel (Frontend)

This guide provides step-by-step instructions for deploying the **Christ University IQAC Platform** to production:
- **Database**: PostgreSQL hosted on **Render** (or Neon / Supabase)
- **Backend API**: Node.js & Express REST API hosted as a Web Service on **Render**
- **Frontend App**: React 18 + Vite SPA hosted on **Vercel**

---

## Architecture Overview

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│         VERCEL FRONTEND         │           │       RENDER WEB SERVICE        │
│   https://<app>.vercel.app      │ ──HTTPS──▶│    https://<api>.onrender.com   │
│  - React 18 + Vite 6 + Tailwind │  (REST)   │  - Node.js Express API          │
│  - SPA rewrites via vercel.json │           │  - Root: src/app/backend        │
└─────────────────────────────────┘           └──────────────┬──────────────────┘
                                                             │
                                                        Internal /
                                                        External SSL
                                                             ▼
                                              ┌─────────────────────────────────┐
                                              │        RENDER POSTGRESQL        │
                                              │  - Database: iqac_db            │
                                              │  - Auto-seeded with init data   │
                                              └─────────────────────────────────┘
```

---

## Pre-Deployment Checklist

1. [x] Git repository pushed to GitHub.
2. [x] [vercel.json](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/vercel.json) created in the root for SPA client routing.
3. [x] [autoSeed.js](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/autoSeed.js) configured to automatically create tables and seed default users/departments on initial startup.
4. [x] [database.js](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/database.js) supports SSL connection strings (`rejectUnauthorized: false`).
5. [x] [server.js](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/server.js) CORS allows all `*.vercel.app` origins out of the box.

---

## Phase 1: Deploy PostgreSQL Database on Render

### Step 1.1: Create the Database
1. Go to the [Render Dashboard](https://dashboard.render.com/) and sign in.
2. Click **New +** in the top navigation and select **PostgreSQL**.
3. Configure the database settings:
   - **Name**: `iqac-postgres-db`
   - **Database**: `iqac_db`
   - **User**: `iqac_user` (or default `postgres`)
   - **Region**: Choose the region closest to your users (e.g., `Singapore (Southeast Asia)` or `Frankfurt (EU Central)`).  
     *(Important: Take note of this region — your backend service must use the identical region).*
   - **PostgreSQL Version**: `16` (recommended)
   - **Instance Type**: 
     - **Free**: Ideal for testing (Note: Render Free databases expire after 30 days).
     - **Starter ($7/month)**: Recommended for persistent production data without expiry.
4. Click **Create Database**.

### Step 1.2: Retrieve Connection Strings
Once the database status is **Available**:
1. Scroll down to the **Connections** panel.
2. Copy the **Internal Database URL** (e.g., `postgres://iqac_user:password@dpg-xxxx-a:5432/iqac_db`).  
   *(Use this if your backend is hosted in the same Render region — it is faster and incurs no external bandwidth costs).*
3. Keep the **External Database URL** handy as a fallback.

---

## Phase 2: Deploy Backend API on Render

### Step 2.1: Create the Web Service
1. In the Render Dashboard, click **New +** and select **Web Service**.
2. Select **Build and deploy from a Git repository** and connect your GitHub repository (`IQAC-Platform`).
3. Fill in the service details:
   - **Name**: `iqac-backend` (your API will be available at `https://iqac-backend.onrender.com`)
   - **Region**: **Select the same region as your PostgreSQL database**.
   - **Branch**: `main` (or your active deployment branch)
   - **Root Directory**: `src/app/backend`  
     *(⚠️ Critical: Do not leave blank. The backend's `package.json` is located in this subfolder).*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: `Free` (or `Starter` for no cold-starts)

### Step 2.2: Configure Environment Variables
Under the **Environment Variables** section, click **Add Environment Variable** and add the following keys:

| Key | Recommended Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production mode & optimizations |
| `DATABASE_URL` | `<Your Render Internal Database URL>` | Connection string from Phase 1 |
| `DB_SSL` | `true` | Enforces SSL encryption with Postgres |
| `JWT_SECRET` | `<Generate a 32+ char secure random key>` | Secret key used to sign JWT tokens |
| `JWT_EXPIRE` | `7d` | Token lifetime (7 days) |
| `CLIENT_URL` | `https://your-iqac-frontend.vercel.app` | Vercel domain (or update after Phase 3) |

> **Tip for JWT_SECRET**: You can generate a random key in terminal via:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### Step 2.3: Deploy and Validate Backend
1. Click **Create Web Service**.
2. Monitor the deployment logs in Render. You should see:
   ```
   ✓ Database connection established successfully (SSL: enabled)
   ✓ Database schema synchronized and verified
   ✓ Default institutional users and departments seeded
   ✓ Server running in production mode on port 10000
   ✓ Health check: http://localhost:10000/health
   ```
3. Test your live endpoint by opening in a browser:
   ```
   https://<your-backend-name>.onrender.com/health
   ```
   You should receive:
   ```json
   {
     "success": true,
     "message": "IQAC Backend API is running",
     "timestamp": "2026-..."
   }
   ```
4. **Copy your backend URL**: `https://<your-backend-name>.onrender.com` (without trailing slash).

---

## Phase 3: Deploy Frontend on Vercel

### Step 3.1: Import Project to Vercel
1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Locate your GitHub repository and click **Import**.

### Step 3.2: Configure Build Settings
In the configuration panel:
- **Project Name**: `iqac-platform` (or your choice)
- **Framework Preset**: **Vite** (auto-detected)
- **Root Directory**: `./` (leave default repository root)
- **Build & Output Settings**:
  - Build Command: `npm run build`
  - Output Directory: `dist`
  - Install Command: `npm install`

### Step 3.3: Set Environment Variables
Expand the **Environment Variables** section and add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_URL` | `https://<your-backend-name>.onrender.com` | Live Render backend URL (**NO trailing slash**) |

### Step 3.4: Deploy
1. Click **Deploy**.
2. Vercel will install dependencies, compile the TypeScript bundle with Vite, and output the static assets.
3. Once finished, click **Continue to Dashboard** or **Visit** to see your live URL:
   ```
   https://iqac-platform.vercel.app
   ```

---

## Phase 4: Final Connection & Verification

### Step 4.1: Update Backend CORS
1. Return to the Render Dashboard $\rightarrow$ your `iqac-backend` service $\rightarrow$ **Environment**.
2. Update `CLIENT_URL` to your live Vercel URL:
   ```
   CLIENT_URL=https://iqac-platform.vercel.app
   ```
   *(Note: The backend CORS configuration in `server.js` already permits all `*.vercel.app` domains automatically, but setting `CLIENT_URL` is best practice for custom domains).*
3. Save changes (Render will trigger a quick zero-downtime redeploy).

### Step 4.2: Verify Platform Functionality
Open your live Vercel app in the browser:

1. **Public Website Showcase**: Verify the public homepage loads with all tabs (Rankings, Infrastructure, MoUs, Achievements).
2. **Login with Default Credentials**:
   Click **Login** in the header or footer and log in using any seeded role:

   | Role | Email | Password |
   |---|---|---|
   | **Admin** | `admin@christuniversity.in` | `Admin@123` |
   | **Institutional Authority (Dean)** | `dean@christuniversity.in` | `Authority@123` |
   | **HOD (CSE)** | `hod.cse@christuniversity.in` | `Hod@123` |
   | **Coordinator (CSE)** | `coord.cse@christuniversity.in` | `Coordinator@123` |
   | **Faculty (CSE)** | `faculty.cse@christuniversity.in` | `Faculty@123` |

3. **Check Dashboard Analytics**: Ensure charts (Radar chart, KPI cards, Placement stats) load and reflect data from the backend.
4. **Test Browser Page Refresh**: Navigate to any inner route (e.g. `/faculty-details`, `/patents`, `/strategic-plan`) and refresh the page. The page should reload seamlessly without a 404 error (handled by `vercel.json`).

---

## Troubleshooting & FAQ

### 1. Render Free Tier "Cold Start" (Spin-down)
- **Symptom**: The first API request or login after 15 minutes of inactivity takes 40–50 seconds.
- **Cause**: Render's free tier spins down idle web services to 0 instances.
- **Remedy**:
  - Keep it awake using a free pinging service like [UptimeRobot](https://uptimerobot.com/) or [cron-job.org](https://cron-job.org/) that sends an HTTP GET request to `https://<your-backend>.onrender.com/health` every 10–14 minutes.
  - Or upgrade the Web Service to Render Starter ($7/mo) for persistent uptime.

### 2. Render Free Database 30-Day Expiry
- **Symptom**: Render warning that the database will be deleted after 30 days.
- **Remedy**:
  - For long-term production, upgrade the Render database to the Starter plan ($7/mo).
  - Alternatively, create a free database on [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/) and paste the connection string into Render's `DATABASE_URL`.

### 3. Mixed Content or CORS Errors in Browser Console
- **Symptom**: `Blocked a frame with origin...` or `Network Error` on API calls.
- **Remedy**:
  - Verify that `VITE_API_URL` on Vercel starts with `https://` (not `http://`).
  - Verify there is **no trailing slash** in `VITE_API_URL` (e.g. `https://iqac-backend.onrender.com`, NOT `...onrender.com/`).
  - If you change environment variables in Vercel, you **must trigger a redeploy** for Vite to bake them into the client build.

### 4. Database SSL Handshake Failure
- **Symptom**: `SequelizeConnectionError: self-signed certificate in certificate chain`
- **Remedy**: The project's [database.js](file:///c:/mervin/Academics/christ/projects/IQAC/IQAC-Platform/src/app/backend/config/database.js) is pre-configured with `rejectUnauthorized: false` when `DB_SSL=true` or non-localhost `DATABASE_URL` is detected. Ensure `DB_SSL=true` is set in Render.

# Docker Setup & Local Development Guide

## CHRIST University IQAC Platform

This guide documents how to build, run, test, and troubleshoot the containerized backend for local development and verification.

---

## 1. Prerequisites

1. **Docker Desktop** (version 24.0+ recommended) or **Docker Engine** with Docker Compose v2.
   - Download for Windows/macOS/Linux: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
   - On Windows, ensure the WSL 2 backend is enabled.
2. **Node.js** (v20+ LTS recommended for local frontend development).
3. **PostgreSQL database instance** (local PostgreSQL, Docker PostgreSQL, or dedicated Supabase development project).

---

## 2. Directory & Docker Architecture

The IQAC Platform uses a single-repo structure:
- **Root**: Frontend React/Vite application (`src/app/`)
- **Backend**: Node.js Express API (`src/app/backend/`)
- **Root `Dockerfile`**: Multi-stage build based on official `node:22-alpine`
- **Backend `src/app/backend/Dockerfile`**: Subdirectory build target for Render or direct folder builds
- **Root `docker-compose.yml`**: Local backend container service with health checks

---

## 3. Local Development Workflow

The recommended development workflow containerizes the backend while keeping frontend development fast with Vite HMR:

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│         VITE FRONTEND           │           │     DOCKER BACKEND CONTAINER    │
│     http://localhost:5173       │ ──HTTP───▶│      http://localhost:5000      │
│  (Running natively via npm dev) │  (Proxy)  │  (Node 22 LTS in Docker Compose)│
└─────────────────────────────────┘           └──────────────┬──────────────────┘
                                                             │
                                                        Database URL
                                                             ▼
                                              ┌─────────────────────────────────┐
                                              │      POSTGRESQL / SUPABASE      │
                                              │   (Dedicated Dev Environment)   │
                                              └─────────────────────────────────┘
```

### Step 3.1: Configure Local Environment

Ensure `src/app/backend/.env` exists with your local development database connection:

```bash
# Example local backend .env
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL=postgres://postgres:password@host.docker.internal:5432/iqac_db
DB_SSL=false
JWT_SECRET=dev_secure_jwt_secret_minimum_32_characters_long
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173,http://localhost:3000
ENABLE_AUTO_SEED=false
```

> **Note on `host.docker.internal`**: When connecting from inside a Docker container to a PostgreSQL database running on your host machine (e.g. `localhost:5432`), use `host.docker.internal` instead of `localhost`.

### Step 3.2: Build the Backend Docker Image

From the repository root:

```bash
docker compose build
```

Or using standard Docker CLI:

```bash
docker build -t iqac-backend:dev .
```

### Step 3.3: Start the Backend Container

```bash
docker compose up -d
```

### Step 3.4: Verify Container Health & Status

```bash
# Check container status and health check state
docker compose ps

# Check the health endpoint directly
curl http://localhost:5000/health
```

Expected response:
```json
{
  "success": true,
  "message": "IQAC Backend API is running",
  "timestamp": "2026-11-17T13:45:00.000Z"
}
```

### Step 3.5: View Live Application Logs

```bash
docker compose logs -f backend
```

### Step 3.6: Start the Frontend (Vite)

In a separate terminal window at the repository root:

```bash
npm run dev
```

Open your browser at `http://localhost:5173`. The frontend will communicate with the containerized backend at `http://localhost:5000`.

---

## 4. Running Backend Tests Inside the Container

To execute backend automated tests in the identical containerized environment:

```bash
# Run test suite inside the running container
docker compose exec backend node tests/achievementsAwardsAndEContents.test.js

# Or spin up a one-off test container
docker compose run --rm backend node tests/achievementsAwardsAndEContents.test.js
```

---

## 5. Stopping and Rebuilding

### Stop Containers Cleanly
```bash
docker compose down
```

### Rebuild After Dependency Changes
When packages in `src/app/backend/package.json` change:
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Remove Temporary Resources (Without Touching Data)
```bash
docker compose down --remove-orphans
```

---

## 6. Troubleshooting Common Issues

### Issue 1: `docker` command not recognized
- **Cause**: Docker Desktop is not installed or not added to your system `PATH`.
- **Solution**: Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) and ensure the `C:\Program Files\Docker\Docker\resources\bin` path is added to your environment variables.

### Issue 2: Cannot connect to PostgreSQL from container
- **Symptoms**: `Unable to connect to the database: connect ECONNREFUSED 127.0.0.1:5432`
- **Cause**: Inside a container, `localhost` points to the container itself, not the host machine.
- **Solution**: In `src/app/backend/.env`, set `DATABASE_URL` host to `host.docker.internal`:
  ```
  DATABASE_URL=postgres://postgres:password@host.docker.internal:5432/iqac_db
  ```

### Issue 3: Port 5000 already in use
- **Symptoms**: `Bind for 0.0.0.0:5000 failed: port is already allocated`
- **Cause**: A native Node.js process is already running on port 5000.
- **Solution**: Stop any running `node server.js` processes on the host:
  ```powershell
  Get-Process node | Stop-Process
  ```

### Issue 4: SSL Connection Error with Cloud Database
- **Symptoms**: `self-signed certificate in certificate chain`
- **Cause**: Cloud providers (Supabase, Neon, AWS RDS) use managed SSL.
- **Solution**: Ensure `DB_SSL=true` and `DB_SSL_REJECT_UNAUTHORIZED=false` in your `.env`.

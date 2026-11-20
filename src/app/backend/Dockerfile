# ==============================================================================
# Backend Dockerfile for CHRIST University IQAC Platform (Root Directory: src/app/backend)
# Node.js LTS (22-alpine) - Multi-stage build running as non-root user
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependency resolution with clean lockfile installation
# ------------------------------------------------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies strictly via lockfile
RUN npm ci --omit=dev --no-audit --no-fund --ignore-scripts

# ------------------------------------------------------------------------------
# Stage 2: Production runtime image
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runtime

# Environment defaults for containerized runtime
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

WORKDIR /app

# Ensure application directory is owned by non-root 'node' user
RUN chown -R node:node /app

# Copy production node_modules from dependency stage
COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules

# Copy backend source code into container
COPY --chown=node:node . ./

# Switch to standard non-root user (UID 1000)
USER node

# Expose internal API port
EXPOSE 5000

# Container healthcheck against verified /health endpoint using built-in wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/health || exit 1

# Launch production server
CMD ["node", "server.js"]

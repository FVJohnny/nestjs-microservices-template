# syntax=docker/dockerfile:1

# --- Builder stage: install dev deps and build TS to dist ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copy root workspace files
COPY ./package*.json ./
COPY ./tsconfig.base.json ./tsconfig.base.json
COPY ./tsconfig.base.json ./backend/tsconfig.base.json

# Copy all package manifests for workspaces (enables cached installs)
COPY backend/services/service-1/package*.json ./backend/services/service-1/
COPY backend/libs/common/package*.json ./backend/libs/common/
COPY backend/libs/kafka/package*.json ./backend/libs/kafka/
COPY backend/libs/mongodb/package*.json ./backend/libs/mongodb/
COPY backend/libs/redis/package*.json ./backend/libs/redis/
COPY backend/libs/postgresql/package*.json ./backend/libs/postgresql/

# Install all workspace dependencies (including dev) once
RUN npm ci --include=dev --workspaces

# Copy sources
COPY backend/libs ./backend/libs
COPY backend/services/service-1/nest-cli.json ./backend/services/service-1/
COPY backend/services/service-1/tsconfig*.json ./backend/services/service-1/
COPY backend/services/service-1/src ./backend/services/service-1/src

# Build shared libraries via workspace scripts
RUN npm run -w backend/libs/common build && \
    npm run -w backend/libs/kafka build && \
    npm run -w backend/libs/mongodb build && \
    npm run -w backend/libs/redis build && \
    npm run -w backend/libs/postgresql build

# Build the service (outputs to dist/)
RUN npm run -w backend/services/service-1 build

# --- Prod deps stage: install production dependencies only ---
FROM node:22-alpine AS deps
WORKDIR /app

# Install production dependencies for all workspaces
COPY ./package*.json ./
COPY backend/services/service-1/package*.json ./backend/services/service-1/
COPY backend/libs/common/package*.json ./backend/libs/common/
COPY backend/libs/kafka/package*.json ./backend/libs/kafka/
COPY backend/libs/mongodb/package*.json ./backend/libs/mongodb/
COPY backend/libs/redis/package*.json ./backend/libs/redis/
COPY backend/libs/postgresql/package*.json ./backend/libs/postgresql/
RUN npm ci --omit=dev --workspaces

# --- Runtime stage: minimal image with prod deps and built code ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built shared libraries from builder stage (includes dist/ directories)
COPY --from=builder /app/backend/libs ./backend/libs

# Copy service files and node_modules to the service directory
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/backend/services/service-1/dist ./backend/services/service-1/dist
COPY --from=builder /app/backend/services/service-1/package*.json ./backend/services/service-1/

# Set working directory to service
WORKDIR /app/backend/services/service-1

EXPOSE 3000
# Use node directly for fast startup
CMD ["node", "dist/src/main.js"]

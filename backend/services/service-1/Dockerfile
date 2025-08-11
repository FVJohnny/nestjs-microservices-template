# syntax=docker/dockerfile:1

# --- Builder stage: install dev deps and build TS to dist ---
FROM node:22-alpine AS builder
WORKDIR /app

# Copy shared libraries first (needed for local file dependencies)
COPY libs ./libs

# Copy service package files and install dependencies
COPY services/service-1/package*.json ./services/service-1/
WORKDIR /app/services/service-1
RUN npm ci --include=dev

# Copy service source and configs
COPY services/service-1/nest-cli.json services/service-1/tsconfig*.json ./
COPY services/service-1/src ./src

# Build the application (outputs to dist/)
RUN npm run build

# --- Prod deps stage: install production dependencies only ---
FROM node:22-alpine AS deps
WORKDIR /app

# Copy shared libraries (don't install deps here - use peer deps from service)
COPY libs ./libs

# Copy service package files and install prod dependencies
COPY services/service-1/package*.json ./services/service-1/
WORKDIR /app/services/service-1
RUN npm ci --omit=dev

# --- Runtime stage: minimal image with prod deps and built code ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy shared libraries source code
COPY --from=deps /app/libs ./libs

# Copy service files and node_modules to the service directory
COPY --from=deps /app/services/service-1/node_modules ./services/service-1/node_modules
COPY --from=builder /app/services/service-1/dist ./services/service-1/dist
COPY --from=builder /app/services/service-1/package*.json ./services/service-1/

# Set working directory to service
WORKDIR /app/services/service-1

EXPOSE 3000
# Use node directly for fast startup
CMD ["node", "dist/main.js"]

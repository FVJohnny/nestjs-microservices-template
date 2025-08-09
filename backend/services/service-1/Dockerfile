# syntax=docker/dockerfile:1

# --- Builder stage: install dev deps and build TS to dist ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies (include devDeps for build: Nest CLI, TypeScript, etc.)
COPY package*.json ./
RUN npm ci --include=dev

# Copy source and configs required for build
COPY nest-cli.json tsconfig*.json ./
COPY src ./src

# Build the application (outputs to dist/)
RUN npm run build

# --- Prod deps stage: install production dependencies only ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- Runtime stage: minimal image with prod deps and built code ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy production node_modules and app files
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./

EXPOSE 3000
# Use node directly for fast startup
CMD ["node", "dist/main.js"]

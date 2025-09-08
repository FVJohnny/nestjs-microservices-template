#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting development environment..."

# Go to project root
cd "$(dirname "$0")/../.."

# Check if .env exists, if not copy from .env.example
if [ ! -f infra/docker/.env ]; then
    echo "📋 Creating .env from .env.example..."
    cp infra/docker/.env.example infra/docker/.env
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building libraries and services..."
npm run build

echo "🐳 Starting Docker containers..."
docker compose -f infra/docker/docker-compose.dev.yml up --build -d

echo "✅ Development environment started!"
echo "📝 View logs with: npm run dev-logs"
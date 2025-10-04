#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting development environment..."

# Go to project root
cd "$(dirname "$0")/../.."

# Create .env files for each service if they don't exist
echo "📋 Setting up service environment files..."
for service_dir in backend/services/*; do
    if [ -d "$service_dir" ]; then
        service_name=$(basename "$service_dir")

        # Check if .env exists for this service
        if [ ! -f "$service_dir/.env" ]; then
            echo "  Creating .env for $service_name from infra/.env.example..."
            cp infra/docker/.env.example "$service_dir/.env"
        else
            echo "  .env already exists for $service_name"
        fi
    fi
done

echo "📦 Installing dependencies..."
npm install

echo "🐳 Starting Docker containers..."
docker compose -f infra/docker/docker-compose.dev.yml up --build -d

echo "✅ Development environment started!"
echo "📝 View logs with: npm run dev-logs"
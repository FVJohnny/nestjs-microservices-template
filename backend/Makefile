# Makefile for managing shared libraries across all services
.PHONY: help build-libs update-libs install-all build-all clean-all test-all

# Default target
help:
	@echo "Available commands:"
	@echo "  build-libs     - Build all shared libraries"
	@echo "  update-libs    - Update shared libraries in all services"
	@echo "  install-all    - Install dependencies for all libs and services"
	@echo "  build-all      - Build all libs and services"
	@echo "  clean-all      - Clean all node_modules and dist folders"
	@echo "  test-all       - Run tests for all services"
	@echo ""
	@echo "Library-specific commands:"
	@echo "  build-kafka    - Build only nestjs-kafka library"
	@echo "  build-ddd      - Build only nestjs-ddd library"
	@echo "  build-types    - Build only nestjs-types library"
	@echo ""
	@echo "Service-specific commands:"
	@echo "  build-service1 - Build only service-1"
	@echo "  build-service2 - Build only service-2"

# Build all shared libraries
build-libs: build-kafka build-ddd build-types
	@echo "✅ All shared libraries built successfully"

# Build individual libraries
build-kafka:
	@echo "🔧 Building nestjs-kafka library..."
	cd libs/nestjs/kafka && npm ci && npm run build

build-ddd:
	@echo "🔧 Building nestjs-ddd library..."
	cd libs/nestjs/ddd && npm ci && npm run build

build-types:
	@echo "🔧 Building nestjs-types library..."
	cd libs/nestjs/types && npm ci && npm run build

# Update shared libraries in all services (reinstall dependencies)
update-libs: build-libs
	@echo "🔄 Updating shared libraries in all services..."
	@echo "📦 Updating service-1..."
	cd services/service-1 && npm install
	@echo "📦 Updating service-2..."
	cd services/service-2 && npm install
	@echo "✅ All services updated with latest shared libraries"

# Install dependencies for all projects
install-all:
	@echo "📦 Installing dependencies for all projects..."
	@echo "📦 Installing kafka library dependencies..."
	cd libs/nestjs/kafka && npm ci
	@echo "📦 Installing ddd library dependencies..."
	cd libs/nestjs/ddd && npm ci
	@echo "📦 Installing types library dependencies..."
	cd libs/nestjs/types && npm ci
	@echo "📦 Installing service-1 dependencies..."
	cd services/service-1 && npm ci
	@echo "📦 Installing service-2 dependencies..."
	cd services/service-2 && npm ci
	@echo "📦 Installing service-3 dependencies..."
	cd services/service-3 && pip install -r requirements.txt
	@echo "✅ All dependencies installed"

# Build all projects
build-all: build-libs build-service1 build-service2
	@echo "✅ All projects built successfully"

# Build individual services
build-service1:
	@echo "🔧 Building service-1..."
	cd services/service-1 && npm run build

build-service2:
	@echo "🔧 Building service-2..."
	cd services/service-2 && npm run build

# Clean all node_modules and dist folders
clean-all:
	@echo "🧹 Cleaning all projects..."
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true
	find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ All projects cleaned"

# Run tests for all services
test-all:
	@echo "🧪 Running tests for all services..."
	@echo "🧪 Testing service-1..."
	cd services/service-1 && npm test
	@echo "🧪 Testing service-2..."
	cd services/service-2 && npm test
	@echo "✅ All tests completed"

# Quick development workflow commands
dev-setup: clean-all install-all build-all
	@echo "🚀 Development environment setup complete"

# Update a specific library and propagate to all services
update-kafka: build-kafka
	@echo "🔄 Updating kafka library in all services..."
	cd services/service-1 && npm install
	cd services/service-2 && npm install
	@echo "✅ Kafka library updated in all services"

update-ddd: build-ddd
	@echo "🔄 Updating ddd library in all services..."
	cd services/service-1 && npm install
	cd services/service-2 && npm install
	@echo "✅ DDD library updated in all services"

update-types: build-types
	@echo "🔄 Updating types library in all services..."
	cd services/service-1 && npm install
	cd services/service-2 && npm install
	cd services/service-3 && pip install -r requirements.txt
	@echo "✅ Types library updated in all services"

# Docker-related commands
docker-build-all:
	@echo "🐳 Building Docker images for all services..."
	cd services/service-1 && docker build -t service-1 .
	cd services/service-2 && docker build -t service-2 .
	cd services/service-3 && docker build -t service-3 .
	@echo "✅ All Docker images built"

# Development helpers
watch-libs:
	@echo "👀 Watching shared libraries for changes..."
	@echo "Run this in separate terminals:"
	@echo "  cd libs/nestjs/kafka && npm run dev"
	@echo "  cd libs/nestjs/ddd && npm run dev"
	@echo "  cd libs/nestjs/types && npm run dev"

# Status check
status:
	@echo "📊 Project Status:"
	@echo "Shared Libraries:"
	@ls -la libs/nestjs/*/dist 2>/dev/null || echo "  ❌ Some libraries not built"
	@echo "Services:"
	@ls -la services/*/dist 2>/dev/null || echo "  ❌ Some services not built"
	@echo "Dependencies:"
	@ls -la libs/nestjs/*/node_modules 2>/dev/null && echo "  ✅ Library dependencies installed" || echo "  ❌ Library dependencies missing"
	@ls -la services/*/node_modules 2>/dev/null && echo "  ✅ Service dependencies installed" || echo "  ❌ Service dependencies missing"

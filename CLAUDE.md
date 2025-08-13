# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Copy Signals AI is a multi-service microservices architecture with three services:
- **Service 1** (NestJS/TypeScript) - Template service with full DDD/CQRS pattern, channels management
- **Service 2** (NestJS/TypeScript) - Basic service setup
- **Service 3** (FastAPI/Python) - Event processing service

**Service 1 serves as the architectural template for all new NestJS services** in this monorepo.

The system uses Kafka for inter-service messaging and includes shared NestJS libraries for common functionality.

## Development Commands

### Main Commands (from repo root)
```bash
# Development with hot reload
make dev          # Start all services in development mode
make dev-down     # Stop development environment
make dev-logs     # View logs from all services

# Production builds
make prod         # Start all services in production mode  
make prod-down    # Stop production environment
make prod-logs    # View production logs

# Force rebuild (if needed)
make rebuild-dev  # Rebuild dev images without cache
make rebuild-prod # Rebuild prod images without cache
```

### Shared Library Management
```bash
# Update all shared libraries across services (from backend/)
make update-libs  # Builds all shared libs and updates service dependencies
```

### Service-Level Commands (NestJS services)
```bash
# From service-1/ or service-2/ directories
npm run build        # Build the service
npm run start:dev    # Start with hot reload
npm run start:prod   # Start production build
npm run lint         # Run ESLint
npm run test         # Run Jest unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:cov     # Run tests with coverage
```

### Service 3 (FastAPI)
```bash
# From service-3/ directory
pip install -r requirements.txt
uvicorn main:app --reload  # Development server
```

## Architecture

### Shared Libraries (backend/libs/nestjs/)
- **common** - Heartbeat, Swagger utilities, correlation tracking
- **ddd** - Domain-driven design patterns, messaging interfaces, event handling
- **kafka** - Kafka service integration and configuration
- **types** - Shared TypeScript type definitions

### Service 1 Architecture (Template for New NestJS Services)
Implements full DDD/CQRS pattern that should be followed for all new NestJS services:
- `domain/` - Entities, value objects, domain events, repository interfaces
- `application/` - Command/query handlers, event handlers
- `infrastructure/` - Repository implementations
- `interfaces/` - Controllers and DTOs

Uses correlation middleware for request tracking across services. When creating new NestJS services, copy this structure and patterns from Service 1.

### Environment Setup
Services run in Docker containers with:
- Kafka + Zookeeper for messaging
- Frontend served via nginx
- Development mode includes hot reload for all services

### Key Integration Points
- All services connect to Kafka at `kafka:9092`
- Services expose APIs on ports 3001, 3002, 3003
- Frontend aggregates all services at localhost:3000
- Correlation IDs track requests across service boundaries

## File Structure Notes
- Shared libraries use `file:` references in package.json for local development
- Each service has independent Docker configuration
- Infrastructure defined in `infra/docker/` with separate dev/prod compose files
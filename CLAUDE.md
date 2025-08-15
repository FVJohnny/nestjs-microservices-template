# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Copy Signals AI is an event-driven microservices architecture for trading signals and channel management:
- **Service 1** (NestJS/TypeScript) - Domain service with full DDD/CQRS pattern, channels management. **This is the template for all new NestJS services.**
- **Service 3** (FastAPI/Python) - Event processing service for notifications and analytics
- **Frontend** (Nginx) - API gateway aggregating all services at port 3000

Communication: Kafka for async events, HTTP APIs for sync operations, correlation IDs for distributed tracing.

## Development Commands

### Quick Start (from repo root)
```bash
# Development with hot reload
make dev          # Start all services
make dev-down     # Stop all services
make dev-logs     # View logs

# Production mode
make prod         # Start production build
make prod-down    # Stop production
make prod-logs    # View production logs

# Force rebuild (when Docker cache issues)
make rebuild-dev
make rebuild-prod
```

### Shared Library Management
```bash
# From backend/ directory - rebuilds all libs and updates services
make update-libs
```

### Service-Level Commands

#### NestJS Services (service-1)
```bash
cd backend/services/service-1
npm run build        # Build TypeScript
npm run start:dev    # Hot reload development
npm run start:prod   # Production mode
npm run lint         # ESLint with auto-fix
npm run test         # Unit tests
npm run test:watch   # Test watch mode  
npm run test:cov     # Coverage report
npm run test:e2e     # E2E tests
```

#### FastAPI Service (service-3)
```bash
cd backend/services/service-3
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Architecture Patterns

### DDD/CQRS Structure (Service 1 Template)
```
/ddd/[bounded-context]/
├── domain/           # Core business logic
│   ├── entities/     # Aggregates extending AggregateRoot
│   ├── events/       # Domain events extending DomainEventBase
│   ├── repositories/ # Repository interfaces
│   └── value-objects/# Immutable value objects
├── application/      # Use cases
│   ├── commands/     # Command + CommandHandler pairs
│   ├── queries/      # Query + QueryHandler pairs
│   └── domain-event-handlers/  # Handle domain events
├── infrastructure/   # External concerns
│   └── repositories/ # Redis/MongoDB/InMemory implementations
└── interfaces/       # Entry points
    ├── http/controllers/        # REST endpoints
    └── integration-events/      # Kafka event handlers
```

### Event Flow Pattern
1. **Domain Event**: Entity raises event via `this.apply(new ChannelRegisteredDomainEvent(...))`
2. **Domain Handler**: Transforms to integration event
3. **Kafka Publisher**: Publishes to topic via `MessagePublisher`
4. **Consumer Service**: Processes via Kafka consumer groups

### Repository Pattern
```typescript
// Interface in domain/
export interface ChannelRepository {
  save(channel: Channel): Promise<void>;
  findById(id: string): Promise<Channel | null>;
}

// Swap implementations via DI token:
{ provide: 'ChannelRepository', useClass: RedisChannelRepository }
// or MongoDBChannelRepository, InMemoryChannelRepository
```

## Shared Libraries (backend/libs/nestjs/)

- **common**: Correlation middleware, heartbeat endpoint, Swagger setup
- **ddd**: Base classes for events, repositories, messaging
- **kafka**: Kafka publisher/consumer with SASL support
- **types**: Shared TypeScript types and integration events
- **mongodb**: MongoDB connection and configuration
- **redis**: Redis service integration

Libraries use `file:` references in package.json. Run `make update-libs` after changes.

## Testing

### Unit Tests
- Located next to source files as `*.spec.ts`
- Mock dependencies using Jest
- Run specific test: `npm test -- path/to/file.spec.ts`

### E2E Tests  
- Located in `test/` directory
- Configuration in `test/jest-e2e.json`
- Test full HTTP request/response cycle

## Environment & Infrastructure

### Service Endpoints
- Service 1: `http://localhost:3001` (NestJS)
- Service 3: `http://localhost:3003` (FastAPI)
- Frontend: `http://localhost:3000` (Nginx proxy)

### Data Stores
- MongoDB: `mongodb://admin:admin123@mongodb:27017/[db-name]?authSource=admin`
- Redis: `redis://redis:6379`
- Kafka: `kafka:9092` (dev), cloud endpoints (prod)

### Correlation Tracking
All requests tracked via headers: `x-correlation-id`, `x-request-id`, `x-user-id`

### Docker Setup
- Dev: Volume mounts for hot reload, local services
- Prod: Multi-stage builds, cloud integrations, SASL auth

## Key Architectural Decisions

1. **Service 1 as Template**: Copy its DDD/CQRS structure for new NestJS services
2. **Event-First Communication**: All inter-service communication via Kafka events
3. **Repository Abstraction**: Easy switching between Redis/MongoDB/other persistence
4. **Domain Events vs Integration Events**: Domain events stay internal, integration events cross boundaries
5. **Correlation IDs**: Built-in distributed tracing across all services
6. **Shared Libraries**: Common functionality extracted and versioned independently
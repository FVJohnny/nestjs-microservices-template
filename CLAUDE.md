# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Docker-based development (recommended):**
```bash
# Development with hot reload
make dev                # Start all services in development mode
make dev-d              # Start in detached mode
make dev-down           # Stop development services
make dev-logs           # View logs

# Production deployment
make prod               # Start all services in production mode
make prod-down          # Stop production services
make prod-logs          # View logs

# Rebuild (if needed)
make rebuild-dev        # Rebuild dev images without cache
make rebuild-prod       # Rebuild prod images without cache
```

**NestJS Service Development:**
```bash
cd backend/services/service-1
npm run start:dev       # Development with hot reload
npm run build           # Build the service
npm run test            # Run unit tests
npm run test:e2e        # Run end-to-end tests
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
```

**Library Development:**
```bash
cd backend/libs/nestjs/[library-name]
npm run build           # Build library
npm run dev             # Build with watch mode
```

## Architecture Overview

This is a **microservices architecture** implementing **Domain-Driven Design (DDD)** patterns with event-driven communication.

### Service Structure
- **Service 1** (NestJS/TypeScript): Primary business service with DDD implementation
- **Service 2** (NestJS/TypeScript): Secondary service
- **Service 3** (FastAPI/Python): Python-based service
- **Frontend**: Vanilla JavaScript client

### Key Architectural Patterns

**Domain-Driven Design Implementation:**
- Bounded contexts organized as modules (e.g., `channels`)
- CQRS pattern with command/query handlers
- Domain events for internal communication
- Integration events for cross-service communication
- Repository pattern with multiple implementations (Redis, MongoDB, In-Memory)

**Event-Driven Architecture:**
- Domain events handled within bounded contexts
- Integration events for cross-service communication via Kafka/Redis
- Event handlers in `application/domain-event-handlers/`
- Integration event handlers in `interfaces/integration-events/`

**Shared Libraries (`backend/libs/nestjs/`):**
- `common`: Heartbeat, correlation, Swagger utilities
- `ddd`: DDD patterns, messaging abstractions, event handling
- `kafka`: Kafka integration and event-driven functionality
- `mongodb`: MongoDB configuration and utilities
- `redis`: Redis configuration and utilities with health monitoring
- `postgresql`: PostgreSQL/TypeORM configuration with health monitoring
- `types`: Shared TypeScript types and integration events

### Directory Structure Conventions

**DDD Module Structure (e.g., `channels`):**
```
channels/
├── application/
│   ├── commands/           # Command handlers (write operations)
│   ├── queries/           # Query handlers (read operations)
│   └── domain-event-handlers/  # Internal domain event handlers
├── domain/
│   ├── entities/          # Domain entities
│   ├── events/           # Domain events
│   ├── repositories/     # Repository interfaces
│   └── value-objects/    # Value objects
├── infrastructure/
│   └── repositories/     # Repository implementations
└── interfaces/
    ├── http/             # REST controllers and DTOs
    └── integration-events/  # Cross-service event handlers
```

**Repository Pattern:**
Repository implementations are swappable via dependency injection:
- In-Memory: For testing
- Redis: For caching and simple storage (default)
- MongoDB: For NoSQL document storage
- PostgreSQL: For relational data with TypeORM

## Integration Events

Cross-service communication uses integration events located in `@libs/nestjs-types/integration-events/`. Current events:
- `ChannelCreatedIntegrationEvent`: Notifies when a channel is created
- Base event: `BaseIntegrationEvent`

## Service-1 Detailed Implementation Guide

### Application Bootstrap and Configuration

**Entry Point (`main.ts`):**
- Uses shared `SwaggerUtility` from `@libs/nestjs-common` for consistent API docs
- Supports `PROXY_BASE_PATH` environment variable for reverse proxy setups
- Configurable port via `PORT` environment variable (defaults to 3000)

**App Module Structure:**
- **Infrastructure**: Redis, MongoDB, Kafka modules imported globally
- **Cross-cutting**: Heartbeat, correlation, validation pipes
- **Business Logic**: Channels module as bounded context
- **Event System**: Global `EventsModule` provides messaging infrastructure

### Channels Bounded Context Deep Dive

**Domain Layer Architecture:**

**Entities:**
- `Channel` extends `AggregateRoot` from NestJS CQRS for event sourcing
- Immutable properties with factory method `Channel.create()`
- Business methods like `receiveMessage()` that emit domain events
- UUID generation for aggregate IDs

**Value Objects:**
- `ChannelTypeVO` enforces valid channel types (telegram, discord, whatsapp)
- Immutable with validation in factory method
- Equality comparison and serialization support

**Domain Events:**
- `ChannelRegisteredDomainEvent`: Fired when new channel is created
- `MessageReceivedDomainEvent`: Fired when channel receives a message
- Both extend base `DomainEvent` from DDD library with auto-generated IDs and timestamps

**Application Layer (CQRS Implementation):**

**Command Flow:**
1. `RegisterChannelCommand` → `RegisterChannelCommandHandler`
2. Handler creates `Channel` aggregate using factory method
3. Aggregate emits `ChannelRegisteredDomainEvent` automatically
4. Handler saves aggregate via injected repository
5. Handler publishes uncommitted events via `EventBus`
6. Handler commits events on aggregate

**Query Flow:**
1. `GetChannelsQuery` → `GetChannelsHandler`
2. Direct repository access for read operations
3. Optional userId filtering supported
4. Returns domain entities (converted to DTOs at controller level)

**Event Handling Architecture:**

**Domain Event Handlers:**
- `ChannelRegisteredDomainEventHandler`: Transforms domain events to integration events
- `MessageReceivedDomainEventHandler`: Publishes message events to external systems
- Both use injected `MessagePublisher` from global events module

**Integration Event Handlers:**
- `TradingSignalsIntegrationEventHandler` extends `BaseEventHandler`
- Listens to 'trading-signals' Kafka topic
- Transforms external events into internal commands via CommandBus
- Auto-registration with EventListener during module initialization

**Repository Selection:**
```bash
# Environment variable controls which repository to use
CHANNEL_REPOSITORY=redis      # Default
CHANNEL_REPOSITORY=mongodb
CHANNEL_REPOSITORY=postgresql
CHANNEL_REPOSITORY=memory
```

**Repository Implementations:**

**Redis Implementation (`RedisChannelRepository`):**
- Key patterns: `channel:{id}` for entities, `user_channels:{userId}` for indexing
- JSON serialization with proper date handling
- Multi-get operations for bulk queries
- Safe JSON parsing with error handling
- User indexing via Redis sets for efficient user-based queries

**MongoDB Implementation (`MongoDBChannelRepository`):**
- Soft deletes using `isActive` flag
- Proper error handling with descriptive messages
- Upsert operations (create/update in single method)
- Indexed queries on userId and isActive fields
- Date handling for createdAt/updatedAt timestamps

**In-Memory Implementation (`InMemoryChannelRepository`):**
- Simple Map-based storage for testing
- All operations synchronous but wrapped in Promises for interface compliance

**PostgreSQL Implementation (`PostgreSQLChannelRepository`):**
- TypeORM-based implementation with Entity mapping
- JSONB support for flexible connectionConfig storage
- Indexed columns for efficient queries (userId, channelType, isActive)
- Query builder support for complex filtering
- Soft deletes with isActive flag
- Automatic timestamp tracking (createdAt, updatedAt)

### HTTP Interface Layer

**Controller Design:**
- `/channels` RESTful endpoint with full Swagger documentation
- CQRS pattern: Commands via POST, Queries via GET
- Proper HTTP status codes (201 for creation, 200 for queries)
- DTO transformation layer between domain and API
- Correlation logging for request tracing

**DTO Patterns:**
- Request DTOs with validation decorators (`class-validator`)
- Response DTOs with explicit construction
- Domain-to-DTO mapping in controllers
- Swagger decorations for API documentation

### Dependency Injection and Module Configuration

**Module Composition:**
```typescript
// Current repository binding in channels.module.ts
{
  provide: 'ChannelRepository',
  useClass: RedisChannelRepository, // Change this to switch implementations
}
```

**Event System Configuration:**
- Global `EventsModule` provides `MESSAGE_PUBLISHER_TOKEN` and `EVENT_LISTENER_TOKEN`
- Factory pattern injection with automatic KafkaService dependency
- Token-based injection prevents tight coupling to specific implementations

### Adding New Functionality Guide

**Adding New Domain Events:**
1. Create event class extending `DomainEvent` in `domain/events/`
2. Add event emission in aggregate method
3. Create domain event handler in `application/domain-event-handlers/`
4. Register handler in module providers array

**Adding New Commands:**
1. Create command class implementing `ICommand` in `application/commands/`
2. Create command handler implementing `ICommandHandler`
3. Use `@CommandHandler(YourCommand)` decorator
4. Register in module's `CommandHandlers` array

**Adding New Queries:**
1. Create query class implementing `IQuery` in `application/queries/`
2. Create query handler implementing `IQueryHandler`
3. Use `@QueryHandler(YourQuery)` decorator
4. Register in module's `QueryHandlers` array

**Adding New Integration Events:**
1. Create event in `@libs/nestjs-types/integration-events/`
2. Extend `BaseIntegrationEvent` with proper versioning
3. Add to shared types library exports
4. Create handler extending `BaseEventHandler` in service

**Repository Implementation Switching:**
- Change `useClass` in module provider configuration
- No changes needed in application layer (dependency inversion)
- Add schema files for MongoDB implementation
- Configure connection strings for new databases

### Event Flow Examples

**Channel Registration Flow:**
1. HTTP POST → `ChannelsController.registerChannel()`
2. Creates `RegisterChannelCommand` → CommandBus
3. `RegisterChannelCommandHandler` creates `Channel` aggregate
4. Aggregate emits `ChannelRegisteredDomainEvent`
5. Saved to repository, events published via EventBus
6. `ChannelRegisteredDomainEventHandler` transforms to `ChannelCreatedIntegrationEvent`
7. Published to Kafka 'channels' topic for other services

**External Event Processing:**
1. Kafka message arrives on 'trading-signals' topic
2. `TradingSignalsIntegrationEventHandler.handle()` called
3. Validates payload and creates `RegisterChannelCommand`
4. Executes command via CommandBus (same flow as HTTP)

### Testing Strategies

**Unit Testing:**
- Use `InMemoryChannelRepository` for application layer tests
- Mock `MessagePublisher` for event handler tests
- Test aggregate behavior in isolation

**Integration Testing:**
- TestContainers for Redis/MongoDB repositories
- Test event publishing/consuming end-to-end
- Test HTTP endpoints with real dependencies

### Health & Monitoring Endpoints

Each infrastructure component provides health monitoring endpoints:

**Redis** (`/redis/*`):
- `/redis/health` - Connection health check
- `/redis/stats` - Usage statistics and key counts
- `/redis/keys` - List keys by pattern
- `/redis/key/:key` - Inspect individual key data

**PostgreSQL** (`/postgresql/*`):
- `/postgresql/health` - Database connection status
- `/postgresql/stats` - Database size, connections, table stats
- `/postgresql/tables` - List all tables
- `/postgresql/table/:name` - Table structure and indexes
- `/postgresql/config` - Current configuration (masked)

**MongoDB** (`/mongodb/*`):
- `/mongodb/config` - MongoDB configuration

**Kafka** (`/kafka/*`):
- `/kafka/consumer-stats` - Consumer statistics and metrics
- `/kafka/publish-event` - Test event publishing

### Conditional Database Loading

The system uses smart conditional loading - databases are only initialized if their environment variables are configured:

**Redis Loading**: 
- Loads if `REDIS_HOST` is set OR not explicitly disabled
- Skip with `DISABLE_REDIS=true` or `DISABLE_ALL_DBS=true`

**MongoDB Loading**:
- Loads if `MONGODB_URI` OR `MONGO_HOST` is set
- No environment variables = no MongoDB initialization

**PostgreSQL Loading**:
- Loads if `POSTGRES_HOST` is set
- No `POSTGRES_HOST` = no PostgreSQL initialization

**Repository Fallbacks**:
- If selected repository's database isn't available, falls back to in-memory
- Warns in console when fallback occurs
- `memory` repository always available as ultimate fallback

**Example Configurations**:
```bash
# Minimal setup - only in-memory
CHANNEL_REPOSITORY=memory

# Redis only
REDIS_HOST=localhost
CHANNEL_REPOSITORY=redis

# PostgreSQL only
POSTGRES_HOST=localhost
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret
POSTGRES_DB=myapp
CHANNEL_REPOSITORY=postgresql

# All databases available, use PostgreSQL
REDIS_HOST=localhost
MONGODB_URI=mongodb://localhost:27017/myapp
POSTGRES_HOST=localhost
CHANNEL_REPOSITORY=postgresql
```

### Development Notes

- Services use file-based dependencies to shared libraries (`"@libs/nestjs-[name]": "file:../../libs/nestjs/[name]"`)
- Repository implementation controlled by `CHANNEL_REPOSITORY` environment variable
- Automatic fallback to in-memory if selected database unavailable
- Databases only load if their connection environment variables are configured
- CQRS pattern separates read/write operations with dedicated handlers
- All NestJS services include Swagger documentation at `/docs`
- Services run on ports 3001, 3002, 3003 respectively in development
- Correlation IDs automatically injected via middleware for request tracing
- Global validation pipe enabled for all endpoints
- PostgreSQL uses TypeORM with synchronize option for development (disable in production)
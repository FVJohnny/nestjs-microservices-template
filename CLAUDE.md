# Copy Signals AI - Microservices Template

## Overview
Copy Signals AI is a comprehensive microservices template built with modern technologies, implementing Domain-Driven Design (DDD), CQRS, and Hexagonal Architecture patterns. This template provides a production-ready foundation for developing microservices with pre-configured infrastructure, monitoring, and best practices.

**Service-1** serves as the primary **NestJS microservice template** that can be duplicated and customized to create new microservices. It includes a complete reference implementation with the Channels bounded context, demonstrating proper DDD architecture and integration patterns.

## Project Structure

### Root Level
- `backend/` - All backend services and shared libraries
- `frontend/` - Simple HTML/CSS/JS frontend dashboard
- `infra/` - Infrastructure configuration (Docker, monitoring)
- `docs/` - Documentation and architecture diagrams
- `scripts/` - Utility scripts
- `Makefile` - Development and deployment shortcuts
- `render.yaml` - Render.com deployment configuration

### Backend Architecture

#### Services
- **Service 1** (NestJS/TypeScript) - **Template microservice** for creating new NestJS services on port 3001
- **Service 3** (FastAPI/Python) - Template microservice for creating new FastAPI services on port 3003

#### Shared Libraries (`backend/libs/nestjs/`)
- **common** - Core utilities, DDD base classes, CQRS, metrics, audit, correlation
- **kafka** - Kafka integration and event publishing/listening
- **redis** - Redis integration and event handling
- **mongodb** - MongoDB configuration and utilities
- **postgresql** - PostgreSQL configuration and TypeORM setup
- **events** - Event system configuration and management

## Technologies & Patterns

### Architecture Patterns
- **Domain-Driven Design (DDD)** - Organized by bounded contexts
- **CQRS (Command Query Responsibility Segregation)** - Separate read/write operations
- **Hexagonal Architecture** - Clean separation of concerns
- **Event Sourcing** - Domain events and integration events

### Technologies
- **NestJS** - Node.js framework with TypeScript
- **FastAPI** - Python web framework
- **Kafka** - Event streaming platform
- **Redis** - Caching and message broker
- **MongoDB** - Document database
- **PostgreSQL** - Relational database
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Docker** - Containerization

## Service 1 (NestJS) - Template Architecture

Service-1 serves as a **template for creating new NestJS microservices**. It demonstrates best practices and provides a complete example implementation that can be duplicated and modified for new services.

### Bounded Contexts Template
Located in `backend/services/service-1/src/bounded-contexts/`:

The Channels bounded context serves as a **reference implementation** showing how to structure new bounded contexts:

#### Channels Context
- **Domain Layer**
  - `entities/channel.entity.ts` - Channel aggregate root
  - `value-objects/channel-type.vo.ts` - Channel type value object
  - `events/` - Domain events (ChannelRegistered, MessageReceived)
  - `repositories/channel.repository.ts` - Repository interface
  
- **Application Layer**
  - `commands/` - Command handlers (RegisterChannel)
  - `queries/` - Query handlers (GetChannels, CountUserChannels)
  - `domain-event-handlers/` - Domain event handlers

- **Infrastructure Layer**
  - `repositories/` - Repository implementations (MongoDB, PostgreSQL, Redis, In-Memory)
  - `adapters/` - External service adapters

- **Interface Layer**
  - `http/controllers/` - REST API controllers (use CommandBus/QueryBus directly)
  - `http/dtos/` - Data transfer objects
  - `integration-events/` - External event handlers

### Shared Common Library Features

#### Core DDD Components
- `ddd/domain/` - Base domain classes and interfaces
- Repository base classes and domain event handling
- CQRS command and query patterns

#### Cross-Cutting Concerns
- **Audit Module** - Request/response logging
- **Correlation Module** - Request correlation IDs
- **Metrics Module** - Prometheus metrics collection
- **Error Handling** - Global exception filters
- **Heartbeat Module** - Health check endpoints

#### Integration Events
- Event publisher interfaces
- Base integration event classes
- Event handler decorators and base classes
- Predefined events: ChannelCreated, TradingSignalReceived

## Service 3 (FastAPI) Architecture

Located in `backend/services/service-3/`:

### Core Components
- `main.py` - FastAPI application with lifespan management
- `messaging_service.py` - Message broker abstraction
- `event_counter.py` - Event statistics tracking
- `kafka_service.py` - Kafka client implementation
- `redis_service.py` - Redis client implementation

### API Endpoints
- `/health` - Health check
- `/health/environment` - Environment information
- `/messaging/publish` - Generic message publishing
- `/integration-events/listener/status` - Event listener status
- `/integration-events/listener/stats` - Detailed statistics
- `/integration-events/listener/start` - Start event listener
- `/integration-events/listener/stop` - Stop event listener

## Infrastructure & DevOps

### Development Environment
Run with: `make dev`

**Services:**
- service-1:3001 (NestJS Template)
- service-3:3003 (FastAPI Template)  
- frontend:3000 (Nginx Dashboard)
- kafka:9092 (Message Broker)
- mongodb:27017 (Document Database)
- redis:6379 (Cache/Message Broker)
- postgres:5432 (Relational Database)
- prometheus:9090 (Metrics Collection)
- grafana:4000 (Metrics Visualization)

### Production Environment
Run with: `make prod`
- Multi-stage Docker builds
- Production-optimized configurations
- Persistent data volumes
- Health checks and restart policies

### Monitoring Stack

#### Prometheus Configuration
- Scrapes metrics from service-1:3000/metrics
- 5-second scrape interval
- Located in `infra/monitoring/prometheus/prometheus.yml`

#### Grafana Dashboard
- Pre-configured NestJS HTTP metrics dashboard
- Panels for: requests/sec, p95 latency, status codes, request duration
- Auto-refresh every 10 seconds
- Located in `infra/monitoring/grafana/provisioning/dashboards/nestjs-metrics.json`

### Deployment

#### Render.com Configuration
`render.yaml` defines:
- service-1: NestJS template service in Frankfurt
- service-3: FastAPI template service in Frankfurt  
- frontend: Static web service dashboard
- Environment variables from shared group "Groupito"
- Auto-deployment enabled

When creating new services, duplicate the service configuration and update the service name, dockerfile path, and environment variables.

## Development Commands

### Makefile Commands
- `make dev` - Start development environment
- `make dev-down` - Stop development environment
- `make dev-logs` - View development logs
- `make prod` - Start production environment
- `make update-libs` - Update all shared libraries
- `make dev-restart-service1` - Restart service-1 only

### 🚨 CRITICAL DEVELOPMENT RULE
**ALWAYS run `make update-libs` after modifying ANY file in `backend/libs/`**

When you change any shared library code in `/backend/libs/nestjs/`, you MUST execute:
```bash
make update-libs
```

This command:
1. Rebuilds all shared libraries (`@libs/nestjs-common`, `@libs/nestjs-kafka`, etc.)
2. Updates dependencies in all services (service-1, service-3, etc.)
3. Restarts affected containers to apply changes

**Without this step, your changes will NOT be reflected in the running services!**

### Service 1 Commands
Located in `backend/services/service-1/`:
- `npm run start:dev` - Development with hot reload
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint TypeScript code

## Database Support

### PostgreSQL Integration
- TypeORM configuration
- Schema synchronization
- Connection pooling
- Located in `backend/libs/nestjs/postgresql/`

### MongoDB Integration  
- Mongoose configuration
- Schema definitions
- Connection management
- Located in `backend/libs/nestjs/mongodb/`

### Redis Integration
- Redis client configuration
- Pub/sub messaging
- Caching utilities
- Located in `backend/libs/nestjs/redis/`

## Event-Driven Architecture

### Messaging Backends
Configurable via `MESSAGING_BACKEND` environment variable:
- `kafka` - Apache Kafka (production)
- `redis` - Redis pub/sub (development)

### Event Types
- **Domain Events** - Internal bounded context events
- **Integration Events** - Cross-service communication events

### Event Flow
1. Domain operations trigger domain events
2. Domain event handlers process internal logic
3. Integration events published to message broker
4. Other services consume integration events
5. External handlers process cross-service logic

## Testing Strategy

### Service 1 Testing
- Unit tests with Jest
- Domain entity tests
- Command/query handler tests  
- Repository implementation tests
- End-to-end API tests

### Test Commands
- `npm run test` - Unit tests
- `npm run test:watch` - Watch mode
- `npm run test:cov` - Coverage report
- `npm run test:e2e` - End-to-end tests

## Key Features

### 🏗️ Architecture
- Clean Architecture principles
- DDD with bounded contexts
- CQRS command/query separation
- Event-driven communication
- Hexagonal architecture

### 🚀 Development Experience  
- Hot reload for all services
- Shared library system
- Type-safe APIs
- Comprehensive error handling
- Request correlation tracking

### 📊 Observability
- Prometheus metrics collection
- Grafana visualization dashboards  
- Request/response audit logging
- Health check endpoints
- Performance monitoring

### 🔧 DevOps Ready
- Docker containerization
- Development/production configurations
- Database migrations
- Environment configuration
- Cloud deployment ready

## Environment Variables

### Core Configuration
- `NODE_ENV` - Environment (development/production)
- `MESSAGING_BACKEND` - Message broker (kafka/redis)
- `SERVICE_NAME` - Service identifier

### Database Configuration
- `MONGODB_URI` - MongoDB connection string
- `POSTGRES_HOST/PORT/USER/PASSWORD/DB` - PostgreSQL config
- `REDIS_HOST/PORT/PASSWORD` - Redis configuration

### Kafka Configuration
- `KAFKA_BROKERS` - Kafka broker endpoints
- `KAFKA_USERNAME/PASSWORD` - Authentication
- `KAFKA_SERVICE_ID` - Service identifier

### API Configuration
- `PORT` - Service port
- `CORS_ORIGINS` - Allowed CORS origins
- `PROXY_BASE_PATH` - API base path

## Creating New Microservices

### From Service-1 Template
To create a new NestJS microservice:

1. **Copy the service-1 directory:**
   ```bash
   cp -r backend/services/service-1 backend/services/service-2
   ```

2. **Update package.json:**
   - Change the `name` field
   - Update dependencies if needed

3. **Modify bounded contexts:**
   - Replace the `channels` bounded context with your domain
   - Update entity names, value objects, and business logic
   - Modify repository interfaces and implementations

4. **Update Docker configuration:**
   - Create new Dockerfile if needed
   - Add to docker-compose files with new service name and port

5. **Configure environment:**
   - Add environment variables to docker-compose
   - Update service-specific configuration

6. **Update Makefile:**
   - Add restart commands for the new service
   - Include in update-libs script if using shared libraries

### From Service-3 Template
To create a new FastAPI microservice:

1. **Copy the service-3 directory:**
   ```bash
   cp -r backend/services/service-3 backend/services/service-4
   ```

2. **Update main.py and requirements.txt**
3. **Modify business logic and endpoints**
4. **Update Docker and deployment configuration**

This template provides a complete foundation for building scalable, maintainable microservices with modern architectural patterns and comprehensive tooling.
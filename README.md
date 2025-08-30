# NestJS Microservices Template

A production-ready microservices template implementing **Domain-Driven Design (DDD)**, **CQRS**, and **Hexagonal Architecture** patterns with NestJS and modern infrastructure.

## 🏗️ Architecture

- **Domain-Driven Design** - Organized by bounded contexts
- **CQRS** - Command Query Responsibility Segregation  
- **Hexagonal Architecture** - Clean separation of concerns
- **Event-Driven** - Integration events with Kafka/Redis
- **Shared Libraries** - Reusable components across services

## 🚀 Quick Start

```bash
# Clone the template
git clone <repository-url>
cd microservices-template

# Start development environment
make dev

# View logs
make dev-logs

# Stop services
make dev-down
```

## 📦 Services

- **Service-1** (NestJS Template) - http://localhost:3001
- **Service-3** (FastAPI Template) - http://localhost:3003
- **Frontend Dashboard** - http://localhost:3000
- **Grafana Monitoring** - http://localhost:4000
- **Prometheus Metrics** - http://localhost:9090

## 🛠️ Development Commands

```bash
# Development (hot reload)
make dev                    # Start all services
make dev-down              # Stop all services
make dev-logs              # View logs
make dev-restart-service1  # Restart NestJS service

# Production
make prod                  # Start production build
make prod-down            # Stop production
make prod-logs            # View production logs

# Libraries
make update-libs          # Update shared libraries
```

## 🏛️ Service Template Structure

### NestJS Service (Service-1)
```
src/
├── bounded-contexts/           # DDD Bounded Contexts
│   └── channels/              # Example: Channel Management
│       ├── domain/            # Domain Layer
│       │   ├── entities/      # Aggregates & Entities
│       │   ├── value-objects/ # Value Objects
│       │   ├── events/        # Domain Events
│       │   └── repositories/  # Repository Interfaces
│       ├── application/       # Application Layer
│       │   ├── commands/      # Command Handlers
│       │   ├── queries/       # Query Handlers
│       │   └── use-cases/     # Business Use Cases
│       ├── infrastructure/    # Infrastructure Layer
│       │   ├── repositories/  # Repository Implementations
│       │   └── adapters/      # External Service Adapters
│       └── interfaces/        # Interface Layer
│           ├── http/          # REST Controllers
│           └── integration-events/ # Event Handlers
├── config/                    # Configuration
└── database.module.ts         # Database Configuration
```

### Shared Libraries
- **@libs/nestjs-common** - DDD base classes, CQRS, metrics, audit
- **@libs/nestjs-kafka** - Kafka integration & event publishing
- **@libs/nestjs-redis** - Redis integration & caching
- **@libs/nestjs-mongodb** - MongoDB configuration
- **@libs/nestjs-postgresql** - PostgreSQL & TypeORM setup
- **@libs/nestjs-events** - Event system management

## 🗄️ Infrastructure

### Databases
- **PostgreSQL** - Primary relational database
- **MongoDB** - Document storage
- **Redis** - Caching & message broker

### Message Brokers
- **Kafka** - Production event streaming
- **Redis Pub/Sub** - Development messaging

### Monitoring
- **Prometheus** - Metrics collection
- **Grafana** - Visualization dashboards
- **Built-in Metrics** - HTTP requests, response times, error rates

## 📊 Monitoring & Observability

### Prometheus Metrics
- HTTP request duration and count
- Custom business metrics
- Database connection pools
- Event processing statistics

### Grafana Dashboards
- Pre-configured NestJS metrics dashboard
- Real-time request monitoring
- Performance analytics
- Error tracking

### Request Tracing
- Correlation ID tracking
- Request/response audit logging
- Cross-service tracing

## 🔧 Creating New Services

### 1. Copy Service Template
```bash
# Create new NestJS service
cp -r backend/services/service-1 backend/services/my-new-service

# Create new FastAPI service  
cp -r backend/services/service-3 backend/services/my-python-service
```

### 2. Update Configuration
- Modify `package.json` name and dependencies
- Update Docker configuration
- Add environment variables
- Configure new database if needed

### 3. Replace Domain Logic
- Replace `channels` bounded context with your domain
- Update entities, value objects, and business rules
- Implement repository interfaces
- Create command and query handlers

### 4. Update Infrastructure
- Add service to `docker-compose.dev.yml` and `docker-compose.prod.yml`
- Update Makefile commands
- Configure monitoring and health checks

## 🌐 Environment Configuration

### Development
```env
NODE_ENV=development
```

### Production
```env
NODE_ENV=production
POSTGRES_SYNCHRONIZE=false
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:cov

# E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Docker Production
```bash
make prod
```

### Cloud Deployment
- Render.com configuration included (`render.yaml`)
- Environment variables managed via groups
- Auto-deployment from Git branches

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.12+ (for FastAPI services)

## 🤝 Contributing

1. Follow DDD principles and existing patterns
2. Add tests for new functionality
3. Update documentation
4. Use conventional commits
5. Ensure all services pass health checks

## 📚 Documentation

- `CLAUDE.md` - Comprehensive architectural documentation
- `docs/` - Additional architecture diagrams
- Service READMEs - Service-specific documentation

---

**Ready to build scalable microservices with clean architecture! 🚀**

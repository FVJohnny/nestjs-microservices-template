# Production Deployment Configuration

This document explains how to configure production deployments to connect to either local infrastructure or cloud services.

## Overview

The production Docker Compose configuration (`infra/docker/docker-compose.prod.yml`) supports two deployment modes:

1. **Local Infrastructure** (default): Uses containerized Redis, MongoDB, PostgreSQL, and Kafka
2. **Cloud Infrastructure**: Uses cloud-hosted services via `.env` configuration

## Local Infrastructure (Default)

By default, `make prod` will start all services connecting to local containerized infrastructure:

```bash
make prod
```

This uses:
- Local Kafka (port 9092)
- Local Redis (port 6379) 
- Local MongoDB (port 27017)
- Local PostgreSQL (port 5432)

## Cloud Infrastructure Override

To connect to cloud services, create a `.env` file in the docker compose directory:

```bash
# Copy the example and customize to the docker directory
cp .env.example infra/docker/.env
```

Then edit `infra/docker/.env` with your cloud service credentials:

```bash
# Example cloud configuration
KAFKA_BROKERS=your-kafka-cloud.com:9092
KAFKA_USERNAME=your_username
KAFKA_PASSWORD=your_password

MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
REDIS_HOST=your-redis-cloud.com
REDIS_PASSWORD=your_redis_password

POSTGRES_HOST=your-db.amazonaws.com
POSTGRES_USER=admin
POSTGRES_PASSWORD=secure_password
```

## Environment Variable Priority

Environment variables follow this priority order:

1. **`infra/docker/.env` file** (highest priority - overrides everything)
2. **Docker Compose defaults** (fallback values)

## Available Configuration Variables

### Kafka
- `KAFKA_BROKERS` - Broker endpoints (default: `kafka:9092`)
- `KAFKA_USERNAME` - Authentication username (default: empty)
- `KAFKA_PASSWORD` - Authentication password (default: empty)

### MongoDB
- `MONGODB_URI` - Full connection string (default: local with auth)
- `MONGODB_DB_NAME` - Database name (default: `service-1-db`)

### Redis
- `REDIS_HOST` - Redis server host (default: `redis`)
- `REDIS_PORT` - Redis port (default: `6379`)
- `REDIS_PASSWORD` - Redis password (default: local production password)
- `REDIS_DB` - Redis database number (default: `0`)

### PostgreSQL
- `POSTGRES_HOST` - Database host (default: `postgres`)
- `POSTGRES_PORT` - Database port (default: `5432`)
- `POSTGRES_USER` - Database user (default: `admin`)
- `POSTGRES_PASSWORD` - Database password (default: local production password)
- `POSTGRES_DB` - Database name (default: `service-1-db`)
- `POSTGRES_SYNCHRONIZE` - Auto-sync schema (default: `true`)
- `POSTGRES_LOGGING` - Enable query logging (default: `true`)

### Application
- `CORS_ORIGINS` - Allowed CORS origins (default: copysignals.ai domains)

### Messaging Backend (Service-3 only)
- `MESSAGING_BACKEND` - Choose between `kafka` or `redis` for pub/sub (default: `kafka`)
  - `kafka`: Uses Kafka for event streaming
  - `redis`: Uses Redis pub/sub for messaging

## Security Notes

⚠️ **Important**: 
- The `infra/docker/.env` file is gitignored and will never be committed
- Use strong passwords for production cloud services
- Set `POSTGRES_SYNCHRONIZE=false` for production databases to prevent schema changes
- Consider setting `POSTGRES_LOGGING=false` in production to reduce log volume

## Switching Messaging Backends (Service-3)

Service-3 supports both Kafka and Redis for pub/sub messaging. To switch between them:

### Use Kafka (default)
```bash
# In infra/docker/.env
MESSAGING_BACKEND=kafka
```

### Use Redis
```bash
# In infra/docker/.env  
MESSAGING_BACKEND=redis
```

**Note**: Service-1 (NestJS) uses Redis for messaging. Service-3 (Python) can use either Kafka or Redis based on the `MESSAGING_BACKEND` setting.

## Quick Commands

```bash
# Local infrastructure (default)
make prod

# Stop production services
make prod-down

# View logs
make prod-logs

# Rebuild with latest code
make rebuild-prod
```

## Troubleshooting

1. **Services can't connect to cloud resources**: Verify your `.env` credentials and network accessibility
2. **Database connection errors**: Check connection strings and authentication
3. **Kafka authentication failures**: Verify `KAFKA_USERNAME` and `KAFKA_PASSWORD` are correct
4. **Service startup fails**: Check logs with `make prod-logs` to identify configuration issues
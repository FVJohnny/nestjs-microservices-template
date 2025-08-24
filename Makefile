# Simple shortcuts to run dev and prod from repo root

COMPOSE_DEV=infra/docker/docker-compose.dev.yml
COMPOSE_PROD=infra/docker/docker-compose.prod.yml

.PHONY: dev dev-d dev-down dev-logs prod prod-d prod-down prod-logs rebuild-prod rebuild-dev update-libs dev-restart-service1

## Development (hot reload)
dev:
	@docker compose -f $(COMPOSE_DEV) up --build

dev-d:
	@docker compose -f $(COMPOSE_DEV) up --build -d

dev-down:
	@docker compose -f $(COMPOSE_DEV) down

dev-logs:
	@docker compose -f $(COMPOSE_DEV) logs -f

## Production (multi-stage images)
prod:
	@docker compose -f $(COMPOSE_PROD) up --build

prod-d:
	@docker compose -f $(COMPOSE_PROD) up --build -d

prod-down:
	@docker compose -f $(COMPOSE_PROD) down

prod-logs:
	@docker compose -f $(COMPOSE_PROD) logs -f

## Rebuild images without cache (if needed)
rebuild-prod:
	@docker compose -f $(COMPOSE_PROD) build --no-cache

rebuild-dev:
	@docker compose -f $(COMPOSE_DEV) build --no-cache

## Update shared libraries in all services - does everything you need!
update-libs:
	@echo "🚀 Updating all shared libraries and services..."
	@echo ""
	@echo "🔧 Building nestjs-common library..."
	@cd backend/libs/nestjs/common && npm install && npm run build
	@echo "🔧 Building nestjs-kafka library..."
	@cd backend/libs/nestjs/kafka && npm install && npm run build
	@echo "🔧 Building nestjs-mongodb library..."
	@cd backend/libs/nestjs/mongodb && npm install && npm run build
	@echo "🔧 Building nestjs-redis library..."
	@cd backend/libs/nestjs/redis && npm install && npm run build
	@echo "🔧 Building nestjs-postgresql library..."
	@cd backend/libs/nestjs/postgresql && npm install && npm run build
	@echo "🔧 Building nestjs-events library..."
	@cd backend/libs/nestjs/events && npm install && npm run build
	@echo ""
	@echo "📦 Updating service-1..."
	@cd backend/services/service-1 && npm install
	@echo ""
	@echo "🔄 Restarting service-1 container..."
	@docker compose -f $(COMPOSE_DEV) restart service-1
	@echo ""
	@echo "✅ All shared libraries updated in all services!"
	@echo "🎉 Ready to go!"

## Restart service-1 container in development
dev-restart-service1:
	@echo "🔄 Restarting service-1..."
	@docker compose -f $(COMPOSE_DEV) restart service-1
	@echo "✅ Service-1 restarted!"

prod-restart-service1:
	@echo "🔄 Restarting service-1..."
	@docker compose -f $(COMPOSE_PROD) up --build service-1
	@echo "✅ Service-1 restarted!"
	

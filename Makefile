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
	@docker compose -f $(COMPOSE_DEV) logs -f service-1

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
	@echo "📦 Installing dependencies at workspace root..."
	@npm install --workspaces
	@echo ""
	@echo "🔧 Building shared libraries..."
	@npm run -w backend/libs/common build
	@npm run -w backend/libs/kafka build
	@npm run -w backend/libs/mongodb build
	@npm run -w backend/libs/redis build
	@npm run -w backend/libs/postgresql build
	@echo ""
	@echo "📦 Installing dependencies at service-1..."
	@npm install --workspaces
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
	

# Simple shortcuts to run dev and prod from repo root

COMPOSE_DEV=infra/docker/docker-compose.dev.yml
COMPOSE_PROD=infra/docker/docker-compose.yml

.PHONY: dev dev-d dev-down dev-logs prod prod-d prod-down prod-logs rebuild-prod rebuild-dev

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

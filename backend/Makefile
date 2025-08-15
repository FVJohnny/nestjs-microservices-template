# Simple Makefile for updating shared libraries across all services
.PHONY: update-libs

# Update shared libraries in all services - does everything you need!
update-libs:
	@echo "🚀 Updating all shared libraries and services..."
	@echo ""
	@echo "🔧 Building nestjs-kafka library..."
	@cd libs/nestjs/kafka && npm install && npm run build
	@echo "🔧 Building nestjs-ddd library..."
	@cd libs/nestjs/ddd && npm install && npm run build
	@echo "🔧 Building nestjs-types library..."
	@cd libs/nestjs/types && npm install && npm run build
	@echo "🔧 Building nestjs-common library..."
	@cd libs/nestjs/common && npm install && npm run build
	@echo "🔧 Building nestjs-mongodb library..."
	@cd libs/nestjs/mongodb && npm install && npm run build
	@echo "🔧 Building nestjs-redis library..."
	@cd libs/nestjs/redis && npm install && npm run build
	@echo "🔧 Building nestjs-postgresql library..."
	@cd libs/nestjs/postgresql && npm install && npm run build
	@echo ""
	@echo "📦 Updating service-1..."
	@cd services/service-1 && npm install
	@echo ""
	@echo "✅ All shared libraries updated in all services!"
	@echo "🎉 Ready to go!"

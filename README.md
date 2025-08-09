# 🚀 Copy Signals AI

A modern microservices architecture with Docker support for both development and production environments.

## 🏗️ Architecture

This project consists of three services running in a containerized environment:

- **Service 1** (NestJS) - Port 3001
- **Service 2** (NestJS) - Port 3002  
- **Service 3** (FastAPI/Python) - Port 3003

## 🛠️ Tech Stack

- **Backend Services**: NestJS (TypeScript), FastAPI (Python)
- **Containerization**: Docker & Docker Compose
- **Development**: Hot reload support for all services
- **Production**: Multi-stage Docker builds for optimized images

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Make (optional, for shortcuts)

### Development Mode (Hot Reload)

```bash
# Start all services with hot reload
make dev

# Or without Make
docker compose -f backend/infra/docker/docker-compose.dev.yml up --build
```

### Production Mode

```bash
# Start all services in production mode
make prod

# Or without Make
docker compose -f backend/infra/docker/docker-compose.yml up --build
```

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start development environment with hot reload |
| `make dev-d` | Start development environment in detached mode |
| `make dev-down` | Stop development environment |
| `make dev-logs` | View development logs |
| `make prod` | Start production environment |
| `make prod-d` | Start production environment in detached mode |
| `make prod-down` | Stop production environment |
| `make prod-logs` | View production logs |
| `make rebuild-dev` | Rebuild dev images without cache |
| `make rebuild-prod` | Rebuild prod images without cache |

## 🌐 Service Endpoints

Once running, access the services at:

- **Service 1**: http://localhost:3001
- **Service 2**: http://localhost:3002
- **Service 3**: http://localhost:3003

## 📁 Project Structure

```
copy-signals-ai/
├── backend/
│   ├── services/
│   │   ├── service-1/          # NestJS service
│   │   │   ├── src/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   ├── service-2/          # NestJS service
│   │   │   ├── src/
│   │   │   ├── Dockerfile
│   │   │   └── package.json
│   │   └── service-3/          # FastAPI service
│   │       ├── main.py
│   │       ├── requirements.txt
│   │       └── Dockerfile
│   └── infra/
│       └── docker/
│           ├── docker-compose.yml      # Production
│           └── docker-compose.dev.yml  # Development
├── Makefile                    # Convenience commands
└── README.md
```

## 🔧 Development Features

- **Hot Reload**: All services automatically restart on code changes
- **File Watching**: Optimized for Docker on macOS with polling
- **Bind Mounts**: Source code is mounted for instant updates
- **Isolated Dependencies**: Each service manages its own dependencies

## 🏭 Production Features

- **Multi-stage Builds**: Optimized Docker images with minimal attack surface
- **Production Dependencies**: Only runtime dependencies included
- **Fast Startup**: Pre-built applications with `node dist/main.js` and `uvicorn`
- **Immutable Images**: No bind mounts, reproducible deployments

## 🐛 Troubleshooting

### Services not detecting file changes?
The development setup includes polling environment variables for reliable file watching in Docker:
- `CHOKIDAR_USEPOLLING=1`
- `WATCHPACK_POLLING=true`

### Build issues?
Try rebuilding without cache:
```bash
make rebuild-dev  # or rebuild-prod
```

### Port conflicts?
Check if ports 3001-3003 are available:
```bash
lsof -i :3001
lsof -i :3002
lsof -i :3003
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both `make dev` and `make prod`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Happy coding!** 🎉

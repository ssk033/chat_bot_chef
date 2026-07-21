# Docker — Meal-IT (chat_bot_chef)

Production Docker setup for the existing Next.js app. **No application code is modified** — remove Docker by deleting:

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `docker/` directory

## Prerequisites

1. `.env` at project root with at least:

```env
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DATABASE_URL=          # overridden in compose to use postgres service
GEMINI_API_KEY=
GEMINI_MODEL=
FOOD_AI_SERVICE_URL=   # optional; point to host service if needed
CURSOR_API_KEY=        # optional Chef fallback
```

2. Docker Engine + Docker Compose v2

## Quick start

```bash
docker compose up --build -d
```

| Service    | URL                          |
|------------|------------------------------|
| App        | http://localhost:3000        |
| Prometheus | http://localhost:9090        |
| Grafana    | http://localhost:3001        |

Default Grafana login: `admin` / `admin` (change on first login).

## Architecture

```
app (Next.js)  →  postgres (pgvector/pg16)
     ↑
prometheus scrapes http://app:3000/api/metrics every 5s
     ↑
grafana (auto-provisioned Prometheus datasource)
```

## Notes

- **PostgreSQL image**: Uses `pgvector/pgvector:pg16` because existing Prisma migrations run `CREATE EXTENSION vector` — vanilla `postgres:latest` would fail migrations.
- **Startup**: `docker/start.sh` waits for DB → `prisma migrate deploy` → `npm run start`.
- **Networking**: Inside containers, use service names (`postgres`, `app`, `prometheus`) — never `localhost` for inter-service URLs.

## Commands

```bash
# Validate compose file
docker compose config

# Logs
docker compose logs -f app

# Stop
docker compose down

# Stop and remove volumes
docker compose down -v
```

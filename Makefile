# SVY platform — common docker-compose shortcuts.
# Usage: `make up`, `make db-push`, `make db-seed`, `make logs`, `make down`.

COMPOSE ?= docker compose

.PHONY: up down build db-push db-migrate db-seed logs ps sh restart clean

## Build images and start the full stack (web + postgres + redis) in the background.
up:
	$(COMPOSE) up -d --build

## Stop and remove containers (keeps named volumes / data).
down:
	$(COMPOSE) down

## Build images without starting them.
build:
	$(COMPOSE) build

## Push the Prisma schema to the database (dev: no migration history).
db-push:
	$(COMPOSE) exec web npx prisma db push

## Apply committed migrations (production-style; use instead of db-push for prod).
db-migrate:
	$(COMPOSE) exec web npx prisma migrate deploy

## Seed demo data (3 plans, 3 users, 2 free seminars). Idempotent.
## Requires the "prisma.seed" command in package.json (see DEPLOY.md).
db-seed:
	$(COMPOSE) exec web npx prisma db seed

## Tail logs from all services (Ctrl-C to stop).
logs:
	$(COMPOSE) logs -f

## Show running containers for this project.
ps:
	$(COMPOSE) ps

## Open a shell in the web container.
sh:
	$(COMPOSE) exec web sh

## Restart the web service only.
restart:
	$(COMPOSE) restart web

## Stop everything AND delete the data volumes (full reset — destroys the DB).
clean:
	$(COMPOSE) down -v

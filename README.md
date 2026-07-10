# FF2 — FlawFerret 2

An intent-driven QA automation platform.

## Week 1 milestone

The first worker uses PostgreSQL as a durable queue. It claims one `HELLO_WORLD` job, marks it running, executes it, then stores the result and marks it completed.

## Run locally

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
npm run dev:worker
```

Expected output:

```text
[worker] FF2 worker started
[worker] Claimed ... (HELLO_WORLD)
[worker] Hello from job ...
[worker] Completed ...
```

## Current structure

```text
apps/worker/src/index.ts          Queue worker
packages/db/prisma/schema.prisma  Database model
packages/db/prisma/seed.ts        Creates a test job
docker-compose.yml                Local PostgreSQL
```

## Next step

Add a Fastify endpoint that accepts an intent and creates the first queued job.

# YouTube Agent Platform (Node + TypeScript)

This repository now includes a production-style multi-service architecture for multi-user YouTube optimization SaaS.

Implemented capabilities:

1. API service for user onboarding, channel settings, OAuth connect/disconnect, job creation, approval, audit, usage, and billing profile.
2. Worker service for heavy async processing (metadata generation, thumbnail generation, YouTube updates).
3. Queue with BullMQ + Redis for async/retryable processing.
4. Postgres schema for users, channels, OAuth credentials, jobs, audit logs, usage records, and billing profiles.
5. Object storage integration (S3 or MinIO) for generated thumbnails.
6. Daily scheduler (per channel timezone/hour/minute) to enqueue runs.
7. Encrypted OAuth token storage (AES-256-GCM).
8. Approval mode toggle (AUTO vs REVIEW).
9. Quota controls (daily/monthly caps) and usage tracking.
10. Minimal frontend for channel management and review flow.

## Monorepo Structure

- apps/api: Fastify API + Prisma + scheduler + OAuth
- apps/worker: BullMQ worker for optimization jobs
- apps/web: Vite + React frontend console
- packages/shared: shared queue constants and types
- src/yt_agent: legacy Python CLI prototype (kept for reference)

## Local Infra

Start Postgres, Redis, MinIO:

```bash
docker compose up -d
```

## Setup

1. Copy env template:

```bash
cp .env.node.example .env
```

2. Fill required keys in .env:
- ENCRYPTION_KEY_BASE64
- JWT_SECRET
- YOUTUBE_CLIENT_ID
- YOUTUBE_CLIENT_SECRET
- YOUTUBE_REDIRECT_URI
- OPENAI_API_KEY

3. Install dependencies:

```bash
npm install
```

4. Generate Prisma client and migrate:

```bash
npm run db:generate
npm run db:migrate
```

## Run Services

Start API:

```bash
npm run api:dev
```

Start worker:

```bash
npm run worker:dev
```

Start frontend:

```bash
npm run web:dev
```

Open frontend at http://localhost:5173

## Product Flows Implemented

1. Connect YouTube channel: /auth/youtube/connect/start -> callback stores encrypted tokens.
2. Create optimization job: POST /jobs.
3. Worker researches competitors via YouTube search ordered by viewCount.
4. Worker generates title/description/tags and thumbnail using OpenAI.
5. If channel approval mode is REVIEW, status is AWAITING_APPROVAL.
6. If channel approval mode is AUTO, worker immediately applies metadata + thumbnail.
7. Every change is written to audit logs.
8. Usage records and caps are checked and incremented.
9. Scheduler enqueues one daily scheduled job per channel when local time matches settings.

## Deployment Plan (Recommended)

1. API on Cloud Run/Fly/Render.
2. Worker on separate container service with autoscaling.
3. Redis (managed) and Postgres (managed).
4. Object storage on S3 (or GCS with S3 compatibility layer).
5. Frontend on Vercel/Netlify.
6. Use secret manager for OAuth and OpenAI credentials.

## Notes

- Frontend is intentionally minimal but functional for onboarding and operations.
- Auth currently uses x-user-id header for development. Replace with full login (JWT/session + DB users) before production.
- Legacy Python prototype remains in src/yt_agent and can be removed after migration.

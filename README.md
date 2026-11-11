# Founder OS

Independent platform for founders: ventures, projects, tasks, and (future) AI agents. Built separately from the Titanium Guardian application codebase.

## Stack

| Layer | Technology |
|-------|------------|
| Web | Next.js, TypeScript, Tailwind CSS |
| Mobile | React Native, Expo, Expo Router |
| API | Python, FastAPI |
| Worker | Python (background jobs) |
| Database | Supabase PostgreSQL (`founder_os` schema — shared project with strict isolation) |
| Auth | Supabase Auth (founder allowlist enforced in API) |
| AI | OpenAI API |

## Repository layout

```text
apps/web          Next.js
apps/marketing-ios  Expo (Marketing Command Center)
apps/mobile       Expo
services/api      FastAPI
services/worker   Worker process
packages/contracts  OpenAPI + shared types
packages/ui       Shared UI (web)
infra             Dockerfiles, Cloud Run notes
docs              Architecture & Supabase isolation
```

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (optional, for API/worker images)

## Quick start (local)

### 1. API

```bash
cd services/api
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -r requirements.txt
copy ..\..\.env.example .env
# Set DATABASE_URL to a dev database with founder_os schema applied (see docs)
uvicorn founder_os_api.app_factory:app --reload --host 0.0.0.0 --port 8000
```

### 2. Web

```bash
npm install
cd apps/web
copy ..\..\.env.example .env.local
npm run dev
```

**Founder OS Studio** (local video library + dashboard): [http://localhost:3000/studio](http://localhost:3000/studio) — see [docs/founder-os/STUDIO.md](docs/founder-os/STUDIO.md).

### 3. Marketing Command Center (Expo)

```bash
npm install
cd apps/marketing-ios
npm install
npx expo start
# Then press i for iOS simulator, or scan QR in Expo Go
```

### 4. Mobile (legacy path)

```bash
cd apps/mobile
npm install
npx expo start
```

### Tests

```bash
cd services/api
pytest -v
```

```bash
cd apps/marketing-ios
npm test
```

## Supabase isolation

**Read before any migration:** [docs/SUPABASE_ISOLATION.md](docs/SUPABASE_ISOLATION.md)

- All Founder OS tables live in schema `founder_os`.
- Production DDL requires explicit approval; reference SQL is under `supabase/migrations/` for review only.

## CI

GitHub Actions runs API tests and web lint on push/PR.

## License

Private / all rights reserved unless stated otherwise.

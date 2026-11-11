# Founder OS — implementation status

Last updated: 2026-11-06 (this branch / workspace).

## What was implemented

| Area | Location | Notes |
|------|----------|--------|
| Monorepo | Root `package.json` (workspaces: web, packages) | Mobile is **not** in root workspace — install under `apps/mobile` separately |
| FastAPI API | `services/api/founder_os_api/` | Ventures, projects, tasks, dashboard summary, audit rows, emergency-stop audit |
| Worker stub | `services/worker/founder_os_worker/` | Health poll loop placeholder |
| Next.js web | `apps/web/` | Supabase password sign-in, dashboard metrics, venture/project/task CRUD screens |
| Expo mobile | `apps/mobile/` | Sign-in + dashboard summary (configure env; run `eas init` manually) |
| Shared contracts | `packages/contracts/openapi.json` | Minimal stub |
| Supabase SQL (review only) | `supabase/migrations/*.sql` | **Do not apply to production without approval** |
| CI | `.github/workflows/ci.yml` | API pytest + web lint/typecheck/build |
| Infra | `infra/docker/*.Dockerfile` | API + worker images |

## Automated tests (local)

```text
cd services/api && pytest -v
```

**Result:** 4 passed (health, auth, CRUD flow).

**Web:**

```text
npm install          # repo root
cd apps/web && npm run lint && npm run typecheck && npm run build
```

Build uses `next.config.ts` `eslint.ignoreDuringBuilds: true` because CI runs ESLint separately.

## Supabase isolation

See [SUPABASE_ISOLATION.md](./SUPABASE_ISOLATION.md). The API expects:

- `DATABASE_URL` with a **dedicated** `founder_os_app` role limited to schema `founder_os`.
- `SUPABASE_JWT_SECRET` for JWT validation (from Supabase project settings).
- `FOUNDER_USER_IDS` and/or `FOUNDER_EMAIL_ALLOWLIST` for Founder-only access.

**Not verified in this pass:** live role GRANT tests against Guardian production (manual).

## Vercel / Cloud Run / EAS (manual)

| Platform | Action |
|----------|--------|
| Vercel | New project, root `apps/web`, env vars from `.env.example` |
| Cloud Run | Build `infra/docker/api.Dockerfile`; set secrets from Secret Manager |
| EAS | `cd apps/mobile && npx eas init` (see `apps/mobile/README.md`) |

## Outstanding / manual

1. Apply `supabase/migrations/` on **staging** first; RLS policies in a follow-up migration.
2. Create Postgres role `founder_os_app` with **only** `USAGE` on `founder_os` and table privileges there.
3. Configure Storage bucket `founder-os-prod` (or similar) + policies — not automated here.
4. Resolve **npm audit** warnings (`npm audit`) in CI when convenient.
5. **React Native** dependencies: install with `cd apps/mobile && npm install` (large tree); align Expo SDK if peer warnings appear.

## Next milestone (recommended)

1. Staging Supabase: apply migrations + add RLS (`owner_id = auth.uid()` pattern).
2. Wire Vercel preview → Cloud Run staging with `CORS_ORIGINS`.
3. Agent registry tables + task runner queue (Phase 5 groundwork).

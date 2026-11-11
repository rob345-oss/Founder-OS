# Infrastructure notes

## Cloud Run

- Build API image from repo root: `docker build -f infra/docker/api.Dockerfile .`
- Set `DATABASE_URL` to the **`founder_os_app`** role connection string (not Guardian privileged creds).
- Mount **Secret Manager** secrets as env vars: `SUPABASE_JWT_SECRET`, `OPENAI_API_KEY` (later).
- Set `CORS_ORIGINS` to your Vercel preview/production URLs.

## Vercel

- Root directory: `apps/web`
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`

## Expo / EAS

- Run `eas init` in `apps/mobile` (manual) and configure bundle IDs.

## Shared Supabase

See [../docs/SUPABASE_ISOLATION.md](../docs/SUPABASE_ISOLATION.md). **Do not apply migrations to production without approval.**

# Marketing Command Center — Production Activation

## Architecture (same as staging)

| Layer | Vercel project | Host |
|--------|----------------|------|
| TG shell + rewrites | `senior-cybersecurity-346` | `titaniumguardian.com` |
| Marketing UI + APIs | `founder-os-web` | `founder-os-web-blush.vercel.app` (proxied) |

Staging commit contract: TG `frontend/vercel.json` marketing rewrites on `release/marketing-command-center-production` → `main`.

Founder OS UI source: `Founder-OS` branch `develop` @ deploy alias `founder-os-web-blush.vercel.app`.

## Required `founder-os-web` Production env

Must mirror **production** TG CRM connectivity (not Preview/staging URLs):

- `FOUNDER_OS_ASSET_PREFIX=/founder-os-assets`
- `NEXT_PUBLIC_TG_APP_ENV=production`
- `CRM_DATABASE_URL` — production Postgres with `founder_os.marketing_*` migrations
- `CRM_TG_API_ENV=production` (or `CRM_TG_API_BASE_URL` → production API)
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — production TG values
- `SUPABASE_URL`, `SUPABASE_ANON_KEY` — server mirrors for `/v1/auth/me` guard
- `MARKETING_PUBLISH_ARMED` — **unset** (disarmed)

## Database

Apply additive migrations only (`000006`–`000011` social + marketing) on **production** Postgres:

```bash
cd apps/web
CRM_DATABASE_URL='...production...' npm run crm:apply-migrations
```

## Verification

After TG production deploy:

1. `curl -sI https://titaniumguardian.com/marketing` → `200`, `X-Matched-Path: /marketing`
2. Static assets load from `/founder-os-assets/_next/*`
3. Authenticated super_admin: sidebar routes, calendar, APIs return 200 (not 401/500)
4. Regression: `/`, `/crm`, `/waitlist` unchanged

## Rollback

- TG: revert marketing block in `frontend/vercel.json`, redeploy production (`dpl_6EX6qTMMxcswqHeYDPZU8gsCUKEg` baseline 2026-11-17)
- Founder OS: no apex repoint — disable proxies only
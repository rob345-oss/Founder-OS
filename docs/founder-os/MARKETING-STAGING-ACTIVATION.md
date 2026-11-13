# Marketing Command Center — Staging Activation (Phase 1)

## Application ownership and routing

| Layer | Owner | Staging hostname | Notes |
|--------|--------|------------------|--------|
| Public marketing site | Titanium Guardian (`senior-cybersecurity-346/frontend`, Vercel `frontend`) | `staging.titaniumguardian.com` | Does **not** auto-include Founder OS deploys |
| Founder OS web BFF | Founder-OS `apps/web` | Dedicated Founder OS staging host (e.g. `founder-staging.titaniumguardian.com` or Vercel preview URL) | Hosts `/marketing`, `/crm`, Studio (unchanged) |

**Target URL:** `https://staging.titaniumguardian.com/marketing`

**Recommended routing (Option B — same pattern as CRM):**

1. Deploy Founder-OS `apps/web` from `develop` (after merge) to a Founder OS staging deployment.
2. On the **Titanium Guardian** staging edge (Cloudflare / Vercel rewrites on `frontend` project), proxy:
   - `/marketing` → `https://<founder-os-staging-host>/marketing`
   - `/marketing/:path*` → `https://<founder-os-staging-host>/marketing/:path*`
   - `/api/marketing/:path*` → `https://<founder-os-staging-host>/api/marketing/:path*`

Do **not** repoint the apex domain to Founder OS. Do **not** promote production.

Cross-repo change (TG `frontend/vercel.json` or Cloudflare worker) is documented here only; implement in `senior-cybersecurity-346` after Founder OS staging is live.

## Authorization

Marketing reuses **Titanium Guardian `super_admin`** via bearer token + `GET /v1/auth/me` (see `apps/web/src/lib/crm/guard.ts`). Every `/api/marketing/*` route calls `requireMarketingSuperAdmin` server-side.

## Database

Operational tables: `founder_os.marketing_*` (migration `000006_marketing_command_center.sql` + RLS `000007_marketing_security.sql`).

Staging Postgres only — **never apply to production** without a separate change window.

```bash
# From apps/web (requires CRM_DATABASE_URL or DATABASE_URL with DDL)
npm run crm:apply-migrations
```

On Vercel, set `CRM_DATABASE_URL` (or `MARKETING_DATABASE_URL`) so CRUD uses Postgres, not ephemeral serverless SQLite.

## Environment (staging)

See `apps/web/.env.local.example` — Marketing section. Required for full persistence:

- `CRM_DATABASE_URL`
- `TITANIUM_GUARDIAN_STAGING_API_URL` (or `CRM_TG_API_BASE_URL`)
- Service JWT for waitlist sync: `CRM_TG_SYNC_BEARER_TOKEN` (CRM metrics feed marketing KPIs)

GA4 / Search Console: configuration placeholders only until server integration layer is implemented (`isWebsiteAnalyticsLive()` returns false).

## Live vs unconnected metrics

| Metric | Source when live |
|--------|-------------------|
| Waitlist signups | TG leads via CRM sync |
| Qualified leads / customers | `founder_os.crm_*` aggregates |
| Campaigns / goals / content | `founder_os.marketing_*` |
| Website visitors | **Unconfigured** until GA4 Data API wired |
| Social reach | **Unconfigured** until platform APIs wired |
| Visitor→waitlist rate | Requires live visitors + waitlist |

## Deployment safeguards

- Branch: `feature/marketing-command-center` → PR → `develop`
- No manual production promotion
- Staging migration script is idempotent (`CREATE IF NOT EXISTS`, `ON CONFLICT DO NOTHING` on settings seed)

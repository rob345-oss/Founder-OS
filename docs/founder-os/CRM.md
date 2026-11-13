# Titanium Guardian CRM — Architecture (Founder OS)

**Status:** Staging MVP in `apps/web` (canonical `/crm`, redirect from `/CRM`)  
**Production URL target:** `https://staging.titaniumguardian.com/CRM` after domain alias + migration approval  
**Authorization:** Titanium Guardian backend `super_admin` via `GET /v1/auth/me` (not Founder allowlists alone)

## Phase 0 audit summary

| Layer | Finding |
|-------|---------|
| **TG API** | Staging OpenAPI exposes `POST /v1/analytics/leads`, `GET /v1/analytics/leads`, `GET /v1/admin/waitlist`, `GET /v1/auth/me` with `application_role` + `roles[]`. |
| **Founder-OS web** | Studio + Infrastructure patterns; no prior CRM. Supabase JWT + infrastructure allowlists ≠ `super_admin`. |
| **Waitlist PII** | Authoritative encrypted `leads` table on TG Postgres; public ingest unchanged. |
| **Email (staging)** | **`EMAIL_PROVIDER=twilio_email`** per `senior-cybersecurity-346/infra/staging/cloud-run-deploy-bindings.json`. Code still supports SendGrid/SMTP fallback (`backend/email/service.py`). CRM ingests via `/api/crm/webhooks/email`. |
| **Marketing CC** | Planned at `/marketing`; shares Studio shell patterns and future `founder_os` cloud schema — CRM uses separate `founder_os.crm_*` tables. |

## Design

### Reused components

- `CrmShell` / sidebar — same tokens as `InfrastructureShell` and Studio (`globals.css`).
- BFF pattern — `apps/web/src/app/api/crm/*` with `requireCrmSuperAdmin`.
- TG client — mirrors `staging-diagnostics.ts` bearer forwarding.

### Data model

Reference migration: `supabase/migrations/000003_crm.sql` (`founder_os.crm_*`).

| Table | Purpose |
|-------|---------|
| `crm_contacts` | Unified profile + `tg_lead_id` link + `waitlist_snapshot` JSON |
| `crm_notes` / `crm_note_revisions` | Timestamped notes + edit audit |
| `crm_activities` | Timeline (idempotent via `idempotency_key`) |
| `crm_follow_ups` | Tasks |
| `crm_email_messages` | Provider-agnostic comms log |

**Runtime store:** `CRM_DATABASE_URL` → Postgres (`founder_os` schema). Without URL → local SQLite under `%LOCALAPPDATA%/FounderOS/CRM/crm.db` for dev/tests.

### Waitlist sync

1. Super_admin bearer → paginate `GET /v1/analytics/leads`.
2. Upsert by `tg_lead_id`, then normalized email — never merge on name alone.
3. `joined_waitlist` activity uses `lead:{id}:joined_waitlist` idempotency key.
4. Repeat submissions update snapshot; no duplicate contacts/events.

**Automatic sync:** Vercel Cron `GET /api/crm/cron/sync-waitlist` every 5m (`CRM_CRON_SECRET` + `CRM_TG_SYNC_BEARER_TOKEN`). Manual: **Sync waitlist** or `GET /api/crm/dashboard?sync=1`. Optional future: TG backend push hook (not required for public waitlist).

### AuthZ

1. Supabase JWT valid.
2. Same token to TG `/v1/auth/me` → `super_admin`.
3. **No** `FOUNDER_OS_LOCAL_OWNER_MODE` bypass for CRM APIs.

### Email tracking

- MVP: read `crm_email_messages` (empty until webhook/worker).
- Do not treat SendGrid accept as inbox delivery without event webhooks.

### Security / privacy risks

- Misconfigured domain could expose Founder-OS CRM without TG role check — mitigated by dual verification.
- SQLite on serverless hosts is non-durable — use `CRM_DATABASE_URL` on staging Cloud Run/Vercel with Postgres.
- RLS not yet on `crm_*` — server-only access via service connection; no anon Supabase policies.

## Staging checklist

1. Apply `000003_crm.sql` to staging Supabase (`founder_os`).
2. Set `CRM_DATABASE_URL`, Supabase keys, `TITANIUM_GUARDIAN_STAGING_API_URL`.
3. Sign in as TG `super_admin`; open `/crm`; run waitlist sync.
4. Verify non-admin receives 403 on `/api/crm/session`.

## Production blockers

- Domain routing: `staging.titaniumguardian.com/CRM` must point to deployment hosting this Next app **or** TG frontend with equivalent routes.
- Migration on production Supabase + backup plan.
- SendGrid/Twilio email event ingestion.
- Optional: move CRM BFF into TG monorepo for single-domain consistency.

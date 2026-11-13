# CRM Staging Activation Guide (Phase 12)

## Email provider (verified, staging)

Source: `senior-cybersecurity-346/infra/staging/cloud-run-deploy-bindings.json`

| Setting | Value |
|---------|--------|
| `EMAIL_PROVIDER` | **`twilio_email`** |
| `EMAIL_FROM_ADDRESS` | `staging@em2799.titaniumguardian.com` |
| SendGrid | `SENDGRID_API_KEY` still bound as secret (legacy/fallback in code path) |

Runtime selection: `backend/email/config.py` → `resolve_email_provider()`; waitlist uses `send_transactional_email()` in `backend/leads/email.py`.

**CRM implication:** ingestion should accept:

1. **Twilio Email forwarded events** (HMAC `CRM_EMAIL_WEBHOOK_SECRET`) — configure a small TG Cloud Function or Event Stream sink to POST delivery updates to Founder-OS.
2. **Twilio Email / SendGrid Event Webhook** (ECDSA public key `CRM_SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY`) if event webhooks are enabled on the sending domain.
3. Open/click tracking remains **off** unless `CRM_EMAIL_TRACK_ENGAGEMENT=true`.

Probe locally:

```bash
node apps/web/scripts/probe-tg-email-provider.mjs
```

## Database ownership decision

**Keep `founder_os.crm_*` in Founder-OS Postgres** (overlay):

- TG `leads` remain authoritative for waitlist PII and public ingest.
- CRM stores relationship data (`notes`, `activities`, `follow_ups`, pipeline) keyed by `tg_lead_id` + normalized email.
- Avoid duplicating a second lead store.

Migrations: `000003_crm.sql`, `000004_crm_security.sql` (RLS enabled, `anon`/`authenticated` revoked).

Apply when `CRM_DATABASE_URL` is available:

```bash
node apps/web/scripts/apply-crm-migrations-staging.mjs
```

Rollback: drop `crm_webhook_receipts`, `crm_sync_state`, `crm_sync_runs`; disable RLS only if reverting `000004` in isolation (see migration comments).

## Automatic waitlist sync

| Mechanism | Endpoint | Auth |
|-----------|----------|------|
| Manual (super_admin) | `POST /api/crm/sync/waitlist` | User bearer + `super_admin` |
| Dashboard bootstrap | `GET /api/crm/dashboard?sync=1` | User bearer + `super_admin` |
| **Scheduled** | `GET /api/crm/cron/sync-waitlist` | `CRM_CRON_SECRET` or `CRON_SECRET` (Vercel Cron) |

Server env:

- `CRM_TG_SYNC_BEARER_TOKEN` — TG JWT with permission to `GET /v1/analytics/leads` (not exposed to browser).
- `CRM_CRON_SECRET` — shared with Vercel Cron `Authorization: Bearer ...` header.

Schedule: `apps/web/vercel.json` → every 5 minutes.

Observability: `founder_os.crm_sync_runs`, `crm_sync_state`.

Public waitlist **does not** call CRM; sync failures are logged in `crm_sync_runs` and retried on the next cron tick.

## Hosting recommendation

| Option | Staging now | Long term |
|--------|-------------|-----------|
| **A — CRM inside TG Next.js** | Higher effort | Preferred (`staging.titaniumguardian.com/crm` unified domain) |
| **B — Founder-OS web + reverse proxy** | **Recommended for immediate staging** | Proxy `/crm` on staging TG site → Founder-OS deployment |

Do **not** redirect the entire Titanium Guardian domain to Founder-OS.

Suggested staging path:

1. Deploy Founder-OS `apps/web` to a host reachable at e.g. `founder-staging.titaniumguardian.com` (already in TG staging CORS list).
2. Add Cloudflare/nginx rule on `staging.titaniumguardian.com/crm` → upstream Founder-OS `/crm`.
3. Later port UI + BFF into `senior-cybersecurity-346/frontend` (Option A) when CRM stabilizes.

## Staging env checklist

```env
CRM_DATABASE_URL=postgresql://founder_os_app:***@...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
TITANIUM_GUARDIAN_STAGING_API_URL=https://tg-api-stg-503074405353.europe-southwest1.run.app
CRM_TG_SYNC_BEARER_TOKEN=***   # server only
CRM_CRON_SECRET=***              # server only
CRM_EMAIL_WEBHOOK_SECRET=***     # server only
```

## Webhook URL (staging)

`POST https://<founder-os-host>/api/crm/webhooks/email`

Headers (one of):

- HMAC: `X-CRM-Webhook-Signature: sha256 HMAC hex of raw body`
- SendGrid/Twilio Email Event: `X-Twilio-Email-Event-Webhook-Signature` + timestamp headers + ECDSA key configured server-side

## Phase 13 status (2026-11-13)

| Item | Status |
|------|--------|
| CRM UI + BFF | **Implemented** in `senior-cybersecurity-346/frontend` at `/crm` (branch `feature/crm-staging-activation`, commit `6a01c37`) |
| Staging Postgres `founder_os.crm_*` | **Applied** on Supabase staging (`xvkvpwkvmsxenxjckjhq`) migrations `000003_crm`, `000004_crm_security` |
| Auth `/api/crm/session` | **Fixed** — TG JWT + `/v1/auth/me` `super_admin` (no Supabase `getUser`; unauthenticated → 401) |
| `staging.titaniumguardian.com/crm` | **Not live** until Vercel preview/promotion with CRM env vars (still 404 on current production deploy) |
| Vercel `CRM_*` env | **Missing** on project `frontend` — set `CRM_DATABASE_URL`, `CRM_CRON_SECRET`, `CRM_TG_SYNC_BEARER_TOKEN`, `CRM_EMAIL_WEBHOOK_SECRET` for Preview + Production (staging) |
| Waitlist cron | **Configured** in `frontend/vercel.json` (`*/5 * * * *`); **not verified** until env + deploy |
| Twilio Email → CRM webhook | **Not wired** — point Event Stream or HMAC forwarder at `POST …/api/crm/webhooks/email` |

## Deployment blockers (remaining)

- Promote or alias `feature/crm-staging-activation` Vercel build to `staging.titaniumguardian.com`, or merge after review.
- Add server-only Vercel env vars (see `frontend/.env.example` CRM section).
- Issue a **service** JWT for `CRM_TG_SYNC_BEARER_TOKEN` (or scoped automation) — do not use a personal browser session token in production cron.
- Configure Twilio Email / SendGrid Event Webhook (staging domain) → CRM email ingest URL.

## Production launch checklist (do not run without approval)

- [ ] Apply `000003` + `000004` on production Supabase
- [ ] Set production `CRM_TG_API_BASE_URL` to production TG API
- [ ] Configure production email event forwarding
- [ ] Map `titaniumguardian.com/crm` (Option A or B)
- [ ] Verify RLS + DB role grants for `founder_os_app`
- [ ] Pen-test CRM APIs (401/403/invalid webhook)
- [ ] Document data retention for CRM notes and email logs

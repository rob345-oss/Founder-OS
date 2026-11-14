# Stage 2 — Architecture stabilization report

Branch: `fix/crm-pg-tls-staging` (worktree: `Founder-OS-stage2`)  
Base: `integration/mcc-preview-validation` @ `71c714a`

## Phase A — Baseline

- Preserved prior uncommitted changes via git stash (`stage2-baseline-preserve`).
- Isolated worktree + branch created from integration line.
- Founder OS lacked TG's `pg-connection.ts`, hosted persistence enforcement on SQLite paths, and CRM/Marketing API JSON error envelopes.
- Titanium Guardian reference (`.tg-ref`) contains the audited TLS module with embedded Supabase Root 2021 CA.

## Root causes corrected

1. **TLS:** `pg` clients used raw connection strings; libpq `sslmode` could override Node TLS; no Supabase CA in trust store.
2. **Hosted SQLite fallback:** `assertCrmPersistenceForHost()` existed but was never invoked; `DATABASE_URL` fallback allowed on Vercel.
3. **API errors:** Unhandled repository/DB exceptions produced empty 500 bodies; client `parseJson` failed on empty responses.
4. **Marketing drift:** Separate `withMarketingPgClient` duplicated insecure connection logic.

## Files changed (summary)

| Area | Files |
| --- | --- |
| TLS | `src/lib/crm/server/pg-connection.ts`, `supabase-root-ca-2021.ts`, `pg-client.ts` |
| DB | `src/lib/crm/server/db.ts`, `src/lib/marketing/server/db.ts` |
| Config / persistence | `src/lib/crm/config.ts`, `src/lib/marketing/config.ts` |
| API errors | `src/lib/crm/http-json.ts`, `server/crm-route.ts`, `marketing/server/marketing-route.ts`, `guard.ts`, `client-api.ts` |
| Routes | All `src/app/api/crm/**` data routes + `src/app/api/marketing/**` (except session auth probe) |
| Tests | `__tests__/pg-connection.test.ts`, `config-hosted.test.ts`, `http-json.test.ts`, `crm-route.test.ts` |
| Stage 3 prep | `docs/founder-os/MARKETING-RLS-LEAST-PRIVILEGE-PROPOSAL.md` |

## Serverless CA packaging

The Supabase Root 2021 PEM is **embedded in TypeScript** (`supabase-root-ca-2021.ts`), imported by `pg-connection.ts` and bundled by Next.js with the serverless function graph—no runtime `fs.readFile` dependency on Vercel for default trust.

Post-build verification (local): `rg "MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYw" apps/web/.next/server` — embedded CA PEM present in CRM API server chunks after `next build`.

## Security

- `rejectUnauthorized: true` always for Supabase hosts; `sslmode=no-verify` rejected.
- Client-facing errors sanitized (connection strings, tokens, stack traces).
- Server logs retain raw messages via `console.error` with diagnostic `code`.
- No production env/IAM/data changes in this stage.

## Stage 3 environment requirements

- `CRM_DATABASE_URL` (session pooler URL, `sslmode=require` in dashboard string is fine—stripped at runtime).
- Optional: `MARKETING_DATABASE_URL` if split from CRM.
- `CRM_TG_SYNC_BEARER_TOKEN` / cron secret for waitlist sync.
- Supabase migrations `000003_crm.sql` + marketing schema on `founder_os` schema.
- TG API base via `CRM_TG_API_BASE_URL` or `TITANIUM_GUARDIAN_STAGING_API_URL`.

## Blockers (live validation)

- No live TLS connection test was run without staging credentials in this workspace.
- Preview GO depends on Vercel env + schema apply + super_admin E2E.

## Test and build evidence (local)

| Check | Result |
| --- | --- |
| `npm run typecheck` (apps/web) | Pass |
| `vitest run src/lib/crm src/lib/marketing` | 41/41 pass |
| `npm run build` | Pass (Next 15.5.29) |
| Full `vitest run` | 2 Studio/ffmpeg env failures (pre-existing; not Stage 2 scope) |

## Preview deployment recommendation

**NO-GO** for production promotion until staging credentials and schema are in place.

**Conditional GO** for Founder OS **preview** deploy of branch `fix/crm-pg-tls-staging` when:

1. Vercel project env includes `CRM_DATABASE_URL` (pooler + verified TLS; no `rejectUnauthorized: false`).
2. CRM migrations applied to staging `founder_os` schema.
3. TG `super_admin` session validated against `CRM_TG_API_BASE_URL` / staging Cloud Run.
4. Post-deploy smoke: `/api/crm/session`, `/api/crm/dashboard`, `/api/marketing/overview` return JSON (not empty 500).

Without `CRM_DATABASE_URL`, hosted preview correctly returns `503` + `crm_database_url_missing` (by design).
# Stage 3 — Staging validation report (Stage 3B)

**Date:** 2026-11-14  
**Source branch:** `fix/crm-pg-tls-staging` @ `729979b257ee724873ecb32c9862babcd83bc888`  
**Target branch:** `integration/mcc-preview-validation` @ `71c714a64595789aa95783405a354b14c69f7acb`  
**Stash:** `stage2-baseline-preserve` preserved (`stash@{0}` on `integration/mcc-preview-validation`)

---

## Executive summary

| Gate | Result |
| --- | --- |
| Staging Supabase schema + `founder_os_app` grants | **PASS** |
| Stage 2 CRM/Marketing Postgres TLS code on branch | **PASS** (unit tests) |
| `CRM_DATABASE_URL` on `founder-os-web` Preview | **Configured** (secret present; runtime query path not verified) |
| Authenticated `super_admin` E2E on Preview | **FAIL** (no staging JWT in automation scope) |
| **Integration GO / NO-GO** | **NO-GO** |

---

## 1. Git and pull request

| Item | Status |
| --- | --- |
| Stage 2 committed on source branch | **Yes** — `729979b` |
| Worktree | `Founder-OS-stage2` @ `729979b` |
| `fix/crm-pg-tls-staging` pushed to `origin` | **Yes** (pre-existing) |
| Pull request opened | **No** — `gh auth login` / `GH_TOKEN` not configured |
| Compare URL (manual PR) | https://github.com/rob345-oss/Founder-OS/compare/integration/mcc-preview-validation...fix/crm-pg-tls-staging |

---

## 2. Phase 1 — Environment configuration

**Project:** `founder-os-web` (team `robert-sicora-s-projects`, project id `prj_swpdhKsBiNElxTH2Nm4NtIQD6kiS`)  
**Reference:** `titanium-guardian-staging` Preview already defines `CRM_DATABASE_URL` (id `8CYogHHI28sVkMcK`).

| Variable | `founder-os-web` Preview |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / anon keys | Configured |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Configured (secret) |
| `CRM_TG_API_BASE_URL` / `TITANIUM_GUARDIAN_STAGING_API_URL` | Configured (secret) |
| `NEXT_PUBLIC_API_URL` | Configured |
| **`CRM_DATABASE_URL`** | **Added** (Preview secret; copied from TG staging ciphertext via Vercel API — no plaintext logged) |
| `MARKETING_DATABASE_URL` | Not set (inherits `CRM_DATABASE_URL` in app) |
| Production env | **Not modified** |

**Notes**

- `vercel env pull` cannot materialize secret values locally (`[SENSITIVE]` placeholders only); this is expected.
- An erroneous empty `CRM_DATABASE_URL` from a failed pipe-copy was removed before the ciphertext copy succeeded.
- **Operator confirmation still required:** sign in as staging `super_admin` and hit `GET /api/crm/dashboard` — expect **200** with live metrics if the ciphertext copy decrypted correctly on Vercel. If **503** `crm_database_url_missing` or DB errors, paste the TG staging Preview value manually in the Vercel dashboard (Settings → Environment Variables → Preview).

**TLS / database target (code):** Hosted builds use verified TLS (`rejectUnauthorized: true`, Supabase Root 2021 CA embedded). `sslmode=no-verify` is rejected in `pg-connection.ts`.

---

## 3. Phase 2 — Database access validation (Supabase staging `xvkvpwkvmsxenxjckjhq`)

| Check | Result |
| --- | --- |
| `founder_os` CRM + Marketing tables | **PASS** — 13 tables (`crm_*`, `marketing_*`) |
| Sample row counts | **PASS** — `crm_contacts` = 29; `marketing_settings` = 1 |
| RLS on `founder_os` tables | Enabled on all tables (policies not added; app connects as `founder_os_app`, not PostgREST) |
| `founder_os_app` schema `USAGE` | **PASS** |
| `founder_os_app` table privileges | **PASS** — `SELECT`/`INSERT`/`UPDATE`/`DELETE` on all `founder_os` CRM/Marketing tables (no new grants applied in this session) |
| RLS implementation in this effort | **No** (per restrictions) |
| Live TLS handshake from Founder OS Preview runtime | **Not verified** — blocked until authenticated DB routes succeed |

---

## 4. Phase 3 — Preview redeploy

| Item | Value |
| --- | --- |
| Deploy method | `vercel deploy` from `Founder-OS-stage2` monorepo root |
| Source tree commit | `729979b` (CLI deploy; Git SHA not attached to deployment metadata) |
| Deployment ID | `dpl_7yVZiz9xZFunPKELnVMgUdVnfmXj` |
| Preview URL | https://founder-os-nwyvtwjga-robert-sicora-s-projects.vercel.app |
| Inspector | https://vercel.com/robert-sicora-s-projects/founder-os-web/7yVZiz9xZFunPKELnVMgUdVnfmXj |
| Target | Preview (not production) |
| Protection | Vercel Deployment Protection (`vercel_authentication`) — probes used `vercel curl` |
| Build | **PASS** (Next 15.5.29) |
| Local regression | **PASS** — `npm run typecheck`; `vitest` CRM/Marketing **41/41** |
| Secrets in client bundles | **PASS** — no `postgresql://` / `CRM_DATABASE` strings in local `.next` artifact grep |

---

## 5. Phase 4 — Live E2E matrix

### Unauthenticated (PASS = correct rejection)

| Test | HTTP | Result | Evidence |
| --- | ---: | --- | --- |
| `GET /api/crm/session` | 401 | **PASS** | `{"authorized":false,"error":"unauthorized"}` |
| `GET /api/crm/dashboard` | 401 | **PASS** | Missing bearer token (JSON) |
| `GET /api/marketing/overview` | 401 | **PASS** | Missing bearer token (JSON) |
| `GET /api/crm/contacts?limit=1` | 401 | **PASS** | Missing bearer token (JSON) |

### Auth upstream (invalid bearer)

| Test | HTTP | Result | Evidence |
| --- | ---: | --- | --- |
| `GET /api/crm/dashboard` + invalid JWT | 503 | **FAIL** (availability) | `code: auth_upstream_unavailable`, detail: TG `auth/me` timeout — monitor TG staging API from Vercel region |

### Authenticated `super_admin` (required for GO)

| Test | Result |
| --- | --- |
| `GET /api/crm/session` | **NOT RUN** |
| `GET /api/crm/dashboard` (staging metrics) | **NOT RUN** |
| `GET /api/marketing/overview` | **NOT RUN** |
| `GET /api/crm/contacts` (read) | **NOT RUN** |
| Marketing reads | **NOT RUN** |
| Non-destructive writes | **NOT RUN** |
| Unauthorized role rejection (403) | **NOT RUN** |
| Dashboard shows real counts (e.g. contacts ≈ 29) | **NOT RUN** |

---

## 6. Phase 5 — Repository

| Item | Status |
| --- | --- |
| This report updated | **Yes** |
| `stage2-baseline-preserve` stash | **Preserved** |
| Branch pushed with report commit | See git after Phase 5 commit |
| PR to `integration/mcc-preview-validation` | **Blocked** — GitHub CLI not authenticated |

---

## 7. Remaining tasks (GO path)

1. **Confirm `CRM_DATABASE_URL`** on `founder-os-web` Preview (manual dashboard paste if ciphertext copy did not hydrate).
2. **Obtain staging `super_admin` JWT** (browser sign-in to Titanium Guardian staging); rerun `vercel curl` with `Authorization: Bearer <token>` against Preview URLs above.
3. **Verify** dashboard/overview return **200** with live counts; no TLS/SQLite fallback **503** codes.
4. **Investigate** TG `auth/me` timeout from Preview when bearer present (if persists after valid token).
5. **Open PR** after `gh auth login` or via compare URL.
6. Optional: add `CRM_CRON_SECRET` / sync secrets if waitlist cron must run on `founder-os-web`.

---

## 8. Final decision

**NO-GO** for integration merge until authenticated E2E proves PostgreSQL-backed CRM/Marketing on the new Preview deployment.

**Conditional GO** when: (a) Preview `CRM_DATABASE_URL` confirmed working, (b) `super_admin` session + dashboard/overview **200** with staging metrics, (c) PR reviewed and merged to `integration/mcc-preview-validation`.
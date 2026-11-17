# CRM reliability safeguards

Permanent controls that prevent PostgreSQL TLS regressions and “green deploy / broken CRM” failures across Founder-OS and Titanium Guardian.

## Approved PostgreSQL connection pattern

All CRM and Marketing Postgres access must go through:

- `apps/web/src/lib/crm/server/pg-connection.ts` — TLS / CA / URL normalization
- `apps/web/src/lib/crm/server/pg-runtime-guards.ts` — forbidden bypass detection
- `apps/web/src/lib/crm/server/pg-client.ts` — **only** module allowed to construct `pg.Client`
- `withPgClient` / `withMarketingPgClient` in `db.ts` — application entry points

Titanium Guardian mirrors the same files under `frontend/app/lib/crm/server/`.

## Forbidden TLS bypasses

- `rejectUnauthorized: false` on `pg` SSL options
- `NODE_TLS_REJECT_UNAUTHORIZED=0`
- `CRM_DATABASE_SSL_REJECT_UNAUTHORIZED` / `CRM_PGSSL_REJECT_UNAUTHORIZED` disabling verification
- `sslmode=no-verify` in database URLs

CI: `npm run audit:pg-clients` (Founder-OS `apps/web`).

## Mandatory tests

| Layer | Command / job |
|-------|-----------------|
| Unit (TLS config + guards) | `npm run test:studio` in `apps/web` |
| Rogue client audit | `npm run audit:pg-clients` |
| Contact Profile v2 guard | `npm run verify:crm-profile-v2` |
| Cross-repo contract parity | `npm run verify:crm-pg-parity` (requires sibling `senior-cybersecurity-346`) |
| Live DB (staging secret) | `npm run probe:crm-pg` / CI job `crm-pg-staging-integration` |
| Authenticated CRM E2E | TG `e2e/crm-reliability-staging.spec.ts` |

Negative coverage: `pg-runtime-guards.test.ts`, `pg-client.unit.test.ts`, and `sslmode=no-verify` cases in `pg-connection.test.ts`.

## Deployment gates (Founder-OS CI)

On `push`/`PR` to `main` / `develop`:

1. Lint + typecheck
2. Vitest (includes CRM TLS unit tests)
3. Postgres client audit
4. Contact Profile v2 source guard
5. Production build
6. Contact Profile v2 build artifact guard
7. Optional live Postgres probe when `CRM_DATABASE_URL` GitHub secret is set

Titanium Guardian `PR Checks` adds the same audit, unit tests, optional live probe, and optional staging CRM Playwright job when super-admin secrets exist.

**Vercel Deployment Checks:** configure in the Vercel project to require the GitHub checks above before promoting to production. Gates are not “active” until branch protection and Vercel both reference them.

### GitHub environments (required for release gates)

Create these environments in **both** repositories (Settings → Environments) and attach secrets:

| Environment | Secrets | Used by |
|-------------|---------|---------|
| `crm-staging-release` | `CRM_DATABASE_URL`, `STAGING_SUPER_ADMIN_EMAIL`, `STAGING_SUPER_ADMIN_PASSWORD`, `CRM_HEALTH_TOKEN` | `crm-staging-release-gates.yml` |
| `crm-production-release` | `CRM_DATABASE_URL`, `PRODUCTION_CRM_SUPER_ADMIN_EMAIL`, `PRODUCTION_CRM_SUPER_ADMIN_PASSWORD`, `CRM_HEALTH_TOKEN` | `crm-production-release-gates.yml` |

Require the release-gate workflows (not optional skips) before merging to `main` / promoting Vercel production.

### Vercel env

Set `CRM_HEALTH_TOKEN` on the Titanium Guardian frontend project for **Preview (staging)** and **Production** (same token value as GitHub environment secret).

## Production health

`GET /api/crm/health` (Founder-OS and TG deployments):

- Requires header `X-CRM-Health-Token` matching `CRM_HEALTH_TOKEN`
- Returns driver/TLS configuration snapshot (no credentials)
- `?deep=1` runs rate-limited `SELECT 1` (max once per 120s per instance unless `force=1`)

## Release verification sequence

1. Land coordinated commits in Founder-OS and `senior-cybersecurity-346`
2. CI green (including audits and unit negatives)
3. Staging deploy
4. `probe:crm-pg` against staging `CRM_DATABASE_URL`
5. CRM Playwright on staging (super_admin)
6. Production candidate + required GitHub/Vercel checks
7. Promote + post-deploy: `/api/crm/health?deep=1` and spot-check `/crm` routes

## Rollback

| Failure type | Action |
|--------------|--------|
| Application regression | Vercel instant rollback to previous deployment; confirm `VERCEL_GIT_COMMIT_SHA` on health endpoint |
| TLS / DB connectivity | Roll back app only; **do not** auto-revert Postgres migrations without compatibility review |
| Migration mismatch | Stop promotion; run migration audit scripts; forward-fix with new migration |

Never reassign production/staging domain aliases during rollback.

## Incident response

1. Check `/api/crm/health?deep=1` with monitoring token
2. Review Vercel runtime logs for `CRM database` / `certificate` errors
3. Confirm no `NODE_TLS_REJECT_UNAUTHORIZED=0` in project env
4. Run `npx tsx scripts/crm-pg-integration-probe.ts` locally against staging URL (never paste URL into tickets)
5. If TLS CA rotation: update embedded `supabase-root-ca-2021.ts` in **both** repositories and redeploy

## Remaining limitations

- Live Postgres and staging E2E jobs **skip** when secrets are unset (documented in CI logs) — configure `CRM_DATABASE_URL`, `STAGING_SUPER_ADMIN_*`, and `CRM_HEALTH_TOKEN` to enforce fully.
- Cross-repo parity job in Founder-OS CI is `continue-on-error` until the sibling checkout is available on GitHub runners (use self-hosted or composite checkout to harden).
- E2E does not cover every CRM sub-route; extend `crm-reliability-staging.spec.ts` as features grow.
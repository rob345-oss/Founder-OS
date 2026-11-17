# Founder-OS — Cursor agent instructions

This repository owns **Founder OS**: the CRM, Marketing Command Center, dashboards, CRM API routes, and related product functionality (primarily under `apps/web` and `apps/marketing-ios`).

**Titanium Guardian** (`rob345-oss/senior-cybersecurity-346`) owns the public website, frontend hosting, routing/rewrites, authentication integration with Founder OS features, and deployment infrastructure. Features exposed at `titaniumguardian.com` often require coordinated changes in both repositories.

Nested `AGENTS.md` files (for example `apps/marketing-ios/AGENTS.md`) add stack-specific rules. They do not override the cross-repository policy below when work touches Titanium Guardian integration.

## Cross-Repository Development and Synchronization Policy

### Repositories and ownership

| Repository | Owns |
|------------|------|
| **Founder-OS** (this repo) | CRM, Marketing Command Center, dashboards, `/api/crm/*` and related server logic, Founder OS app code |
| **senior-cybersecurity-346** | Titanium Guardian site, `frontend/` integration, Next.js rewrites, auth wiring, Vercel/staging deployment |

Local checkout for Titanium Guardian is commonly a sibling directory, for example `../senior-cybersecurity-346` next to this workspace. If it is missing, clone `rob345-oss/senior-cybersecurity-346` before completing cross-repo work.

### Objective

Whenever a Founder-OS change affects functionality served through Titanium Guardian, implement and land the matching integration changes in **both** repositories. Avoid shipping Founder-OS-only changes that leave staging or production returning **404**, stale UI, or broken API routes on Titanium Guardian.

### Rule 1 — Identify cross-repository changes

Before marking a Founder-OS feature complete, decide whether it affects any of the following:

- `/crm` or `/crm/*`
- `/marketing` or `/marketing/*`
- Shared authentication or sessions
- API routes consumed from the Titanium Guardian frontend
- Titanium Guardian navigation, feature flags, or public route config
- Shared components or integration code ported between repos
- Deployment configuration, environment variables, or Next.js rewrites

If any apply, inspect integration points in **senior-cybersecurity-346**, especially `frontend/next.config.js`, `frontend/src/app/crm/`, `frontend/src/app/marketing/`, and staging route verification scripts under `frontend/scripts/`.

### Rule 2 — Coordinated commits

When both repositories need changes:

1. Implement the feature in Founder-OS.
2. Implement the corresponding integration changes in senior-cybersecurity-346.
3. Run relevant tests in **both** repositories.
4. Create **separate**, descriptive Git commits in each repository.
5. Push both branches to their respective remotes.
6. Record both commit SHAs in the completion report.

Git cannot atomically commit across two independent repositories. Treat the work as one logical change with two traceable commits.

Do **not** copy the entire Founder-OS codebase into senior-cybersecurity-346 unless the existing architecture explicitly requires it (prefer targeted ports and shared contracts).

### Rule 3 — Route synchronization

Confirm Titanium Guardian resolves all supported Founder-OS routes:

- Nested app routes and deep links
- Authentication redirects and session cookies
- Static assets and `_next` paths
- Client and server API calls
- Hard refresh on integrated paths

A successful `apps/web` build in Founder-OS does **not** prove Titanium Guardian routing works. Run Titanium Guardian builds and staging route checks when integration is involved.

### Rule 4 — Branch synchronization

Use coordinated feature branch names when practical (same suffix or linked issue id). Preserve uncommitted work and existing worktrees.

Do **not** automatically merge into `main` or deploy to production unless the user explicitly requests it. Use `develop` (or the repo’s established integration branch) for staging when that workflow applies.

### Rule 5 — Deployment verification

After coordinated staging integration, verify routes and APIs, including:

- `https://staging.titaniumguardian.com/crm`
- `https://staging.titaniumguardian.com/marketing`

Also exercise affected nested routes and `/api/crm/*` (or other touched endpoints). Confirm deployed artifacts contain the expected changes.

Never report deployment success based only on `git push`.

### Rule 6 — Security and production safeguards

Never:

- Expose backend credentials in frontend code
- Commit secrets or environment files (`.env`, `.env.local`, credentials JSON)
- Modify production databases without explicit user authorization
- Deploy unfinished functionality to production
- Overwrite unrelated changes in either repository
- Bypass required authentication or authorization

### Rule 7 — Completion report

Every cross-repository change must end with a short report containing:

| Field | Required information |
|-------|----------------------|
| Founder-OS | Branch and commit SHA |
| senior-cybersecurity-346 | Branch and commit SHA |
| Synchronization | What changed in each repository |
| Tests | Results for both repositories |
| Staging | Route and API verification performed |
| Production | Explicitly state unchanged, pending, or updated |
| Blockers | Remaining integration issues |

If only one repository needs changes, state **why** the other does not. Do not create empty or ceremonial commits in the unaffected repo.

### CRM PostgreSQL reliability (permanent)

- Route **all** CRM/Marketing Postgres access through `apps/web/src/lib/crm/server/pg-client.ts` (`withVerifiedPgClient` / `createVerifiedPgClient`). Never add raw `pg.Client` / `pg.Pool` elsewhere.
- Forbidden: `rejectUnauthorized: false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, `sslmode=no-verify`, or CRM-specific TLS bypass env vars.
- Keep `pg-connection.ts`, `pg-runtime-guards.ts`, `pg-client.ts`, and `supabase-root-ca-2021.ts` **byte-identical** to `senior-cybersecurity-346/frontend/app/lib/crm/server/` (verify with `npm run verify:crm-pg-parity` in `apps/web`).
- Before claiming a CRM release is safe: `npm run audit:pg-clients`, `npm run test:studio`, optional `npm run probe:crm-pg` on staging, TG CRM Playwright when secrets exist.
- Full procedure: `docs/founder-os/CRM-RELIABILITY-SAFEGUARDS.md`.

### Quick integration checklist (Founder-OS → Titanium Guardian)

- [ ] New or renamed route under `apps/web/src/app/` has a matching route or rewrite in TG `frontend/`
- [ ] New or changed API under `apps/web/src/app/api/` is reachable from TG deployment config
- [ ] Auth/session behavior matches on staging
- [ ] TG `frontend/scripts/verify-staging-app-routes.mjs` (or CI equivalent) passes when CRM/marketing trees are present
- [ ] Staging URLs manually checked for 404 and stale bundles
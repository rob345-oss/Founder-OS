# Marketing tables — least-privilege RLS migration (proposal only)

**Status:** Not applied in Stage 2 (read-only proposal).  
**Scope:** `founder_os.marketing_*` tables on shared Supabase PostgreSQL.

## Current risk

Marketing Command Center and CRM BFF connections today often use a **service role** or **bypass-RLS** Postgres URL (`CRM_DATABASE_URL` / direct pooler). That is acceptable for server-only BFF access but must not be reused in browser-exposed Supabase clients.

## Target model

| Actor | Access | Mechanism |
| --- | --- | --- |
| Founder OS server (CRM/Marketing API) | Full read/write on `founder_os.marketing_*` and `founder_os.crm_*` | Dedicated DB role `founder_os_bff` with `search_path = founder_os, public` |
| Titanium Guardian FastAPI | No direct marketing table access in Stage 3+ | Keep customer data in TG schema only |
| Authenticated super_admin (UI) | No direct Postgres; only via Founder OS APIs | Supabase Auth JWT validated by TG `/auth/me` |

## Proposed migration steps

1. Create role `founder_os_bff` (LOGIN) with password stored in Vercel env `CRM_DATABASE_URL` only.
2. `GRANT USAGE ON SCHEMA founder_os TO founder_os_bff`.
3. `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA founder_os TO founder_os_bff` (narrow to `crm_*` + `marketing_*` if split later).
4. Enable RLS on marketing tables with policy **deny all** for `authenticated` and `anon` roles.
5. Optional: add policy allowing `founder_os_bff` via `auth.jwt() ->> 'role' = 'service_role'` only if using Supabase pooler JWT mode (prefer connection string role instead).
6. Rotate off any legacy `postgres` superuser URL in preview/production.

## User impact

- **Existing TG CRM users:** Unchanged until TG CRM is decommissioned; TG may still use its own DB role.
- **Founder OS preview:** Requires `CRM_DATABASE_URL` using `founder_os_bff` before RLS is enabled; otherwise APIs return `crm_database_url_missing` / `marketing_database_url_missing`.
- **Local dev:** SQLite mode unaffected (RLS applies only on hosted Postgres).

## Rollout order (Stage 3)

1. Provision role + grants on staging Supabase.
2. Update Vercel env for Founder OS preview with new URL.
3. Validate CRM/Marketing E2E with super_admin session.
4. Apply RLS policies on staging; re-run integration tests.
5. Repeat for production after GO from architecture review.
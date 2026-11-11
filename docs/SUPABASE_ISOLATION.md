# Supabase isolation — Founder OS vs Titanium Guardian

Founder OS uses the **same Supabase project** as Titanium Guardian, with **strict logical separation**.

## Objectives

1. All Founder OS **relational data** in schema `founder_os` only.
2. **Dedicated database roles**: runtime (`founder_os_app`) and migrator (`founder_os_migrator`) — never Guardian privileged credentials.
3. **RLS** on every Founder OS table (follow-up migration) so even SQL mistakes cannot read another founder’s rows.
4. **Storage**: dedicated buckets `founder-os-{env}` with policies restricted to Founder OS paths.
5. **Auth**: Supabase Auth is shared at project level; **application authorization** is enforced by JWT validation + **founder allowlist** in the API (`FOUNDER_USER_IDS` / `FOUNDER_EMAIL_ALLOWLIST`). Guardian users are **not** implicitly allowed.

## What must not happen

- Founder OS migrations in `supabase/migrations/` must **never** `DROP`, `ALTER`, or `REVOKE` Guardian objects.
- Do not run migrator SQL against production without: verified backup, staging validation, explicit approval.

## Verification checklist (before production DDL)

- [ ] Latest Supabase backup / PITR verified restorable
- [ ] Staging project or branched DB: apply migrations, run API tests
- [ ] `founder_os_app` cannot `SELECT` from Guardian schemas (explicit test)
- [ ] Guardian app role cannot `SELECT` from `founder_os` without grant (default deny)

## Migration files

- `supabase/migrations/000001_foundations.sql` — schema + role notes
- `supabase/migrations/000002_core_tables.sql` — tables (reference; enum type name may need alignment with SQLAlchemy)

**Note:** SQLAlchemy models use a string enum stored as VARCHAR when `native_enum=False`; for Postgres native enum `founder_os.task_status`, either switch SQLAlchemy to `native_enum=True` or replace DB enum with `TEXT` + check — align before applying `000002`.

## Blockers

Until a live Supabase schema inspection is complete, **enum vs varchar** and **exact Guardian schema names** must be confirmed to avoid migration drift.

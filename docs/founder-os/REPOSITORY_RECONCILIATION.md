# Founder OS — Repository Reconciliation Report

**Date:** 2026-11-06  
**Method:** Local filesystem inspection (Git metadata, directory glob, targeted file reads). No migrations, provisioning, or production changes performed.

---

## Phase 1 — Locate existing development

### 1.1 Cursor Founder-OS workspace (this folder)

| Item | Value |
|------|--------|
| Path | `C:\Users\rober\.cursor\projects\Founder-OS` |
| Git root | Same path |
| Remote | `https://github.com/rob345-oss/Founder-OS.git` |
| Branch | `main` |
| Commits | **None** (`No commits yet on main`) |
| Working tree | Untracked: `docs/` (14 design markdown files) |

**Conclusion:** The Founder OS **design docs were authored in a separate repo** that still has **no initial commit**. This matches the prior note in `README.md` / `SYSTEM_ARCHITECTURE.md` (empty repo at design time).

### 1.2 Titanium Guardian monorepo (located on disk)

The best candidate for **“Titanium Guardian” application code** found on this machine:

| Item | Value |
|------|--------|
| Path | `C:\Users\rober\Cybersecurity-Senior-App` |
| Git remote | `https://github.com/rob345-oss/Cybersecurity-Senior-App.git` |
| Branch | `main` (tracking `origin/main`) |
| Identity | Documentation (`docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`) refers to **Titanium Guardian**; `docker-compose.yml` uses `titanium-guardian-*` service names |

### 1.3 Founder OS implementation paths (requested inventory)

Searched under `C:\Users\rober\Cybersecurity-Senior-App` for:

- `apps/founder-os-web` — **not present**
- `backend/founder_os` — **not present**
- `infra/founder-os` — **not present**
- `docs/founder-os` — **not present** (Guardian `docs/` contains `API.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `PRIVACY.md`, `RUN.md` only)

**Conclusion:** There is **no existing Founder OS code tree** in the Guardian repo path inspected. The only Founder OS artifacts in scope are the **design documents** in the separate `Founder-OS` workspace (`docs/founder-os/*.md`).

---

## Phase 2 — Validate infrastructure (evidence-based classification)

Legend: **VERIFIED REUSABLE** | **REQUIRES MODIFICATION** | **MUST BE ISOLATED** | **NOT VERIFIED**

| Component | Classification | Evidence / notes |
|-----------|----------------|------------------|
| **Next.js frontend architecture** | **NOT VERIFIED** (in Guardian repo) | Guardian frontend is **Flutter** (`frontend/`), not Next.js. Founder OS docs assume Next.js — **stack mismatch** until another repo is identified or the product standard is updated (e.g. Flutter Web / admin SPA). |
| **FastAPI backend architecture** | **VERIFIED REUSABLE** (patterns) | `backend/main.py` FastAPI app, routers, CORS, lifespan, `slowapi` rate limits. **New** Founder OS routes/packages should be additive with clear boundaries. |
| **PostgreSQL database** | **VERIFIED REUSABLE** (technology) | SQLAlchemy async + PostgreSQL via `DATABASE_URL` (`backend/database/connection.py`). Compose DB `titanium_guardian`. |
| **Supabase databases + Auth + RLS** | **NOT VERIFIED** | No Supabase client or migrations found; auth described as JWT + Postgres in `AUTH_SETUP.md`. Founder OS Supabase + RLS design is **greenfield** relative to this codebase. |
| **Founder OS schema / migrations** | **NOT VERIFIED** | No Founder OS tables or migration plans in repo. |
| **GCP Cloud Run + Secret Manager** | **NOT VERIFIED** | `docs/DEPLOYMENT.md` discusses multiple deployment options; `.github/workflows/deploy.yml` uses **placeholder** deploy steps (e.g. commented `kubectl`/`ecs`). No Secret Manager usage found in code scan. |
| **Vercel environments** | **NOT VERIFIED** | No `vercel.json` or Vercel-specific config found in quick inventory. |
| **CI/CD workflows** | **VERIFIED REUSABLE** (skeleton) | `.github/workflows/` includes `deploy.yml`, `pr-checks.yml`, `build-frontend.yml`, `deploy.yml` — patterns reusable; Founder OS would need **new jobs** and secrets. |
| **Existing AI integrations** | **VERIFIED REUSABLE** (with strong caveats) | `requirements.txt` includes `openai`, `langchain-openai`; `backend/risk_engine/callguard.py` uses LangChain `ChatOpenAI`. **Reuse for Founder OS** should be **isolated module** with separate keys, quotas, and policy — **do not** merge with senior-risk product logic without review. |
| **Security / audit patterns** | **REQUIRES MODIFICATION** | JWT auth, bcrypt, Fernet PII encryption, rate limits — **patterns** useful; Founder OS needs **venture RLS**, **approval service**, and **audit** not evidenced as a unified platform here. |

### Isolation stance (unchanged, now grounded)

- **MUST BE ISOLATED:** Founder OS **production** data plane (DB secrets, JWT signing keys, integration tokens) from Guardian production. Prefer **separate Postgres instance or Supabase project**, separate buckets, separate service accounts — as already recommended in design docs.
- **Do not** share one DB schema between “consumer Guardian” workloads and “Founder OS” without RLS design + backup review (per your requirements).

---

## Phase 3 — Reconcile documentation vs implementation

### Contradictions

| Design doc assumption | Observed reality | Suggested revision |
|----------------------|------------------|-------------------|
| Next.js as primary web shell (`SYSTEM_ARCHITECTURE.md`, `README.md` proposed tree) | Guardian monorepo uses **Flutter** for client | **Either** point docs at Flutter Web (or a new Next app in monorepo) **or** keep Next.js as a **new** `apps/*` app with no claim of reuse from current Guardian UI. |
| Supabase + RLS as current stack | **Plain Postgres + SQLAlchemy** in Guardian | Clarify: Supabase is a **target** for Founder OS, not “existing Guardian DB.” Migration path is net-new or parallel. |
| Cloud Run / Secret Manager as established patterns | **Not evidenced** in repo | Mark as **target infra**; add ADR to pick host (Cloud Run vs other) after org standards confirmed. |

### Duplicate components

- No Founder OS code duplication found (no second implementation).
- **Conceptual overlap:** Guardian already has **LLM-assisted** risk modules; Founder OS “agent runtime” must not be implemented as a fork of `callguard.py` without separation — risk of entangled prompts and permissions.

### Missing requirements (relative to design docs)

- No existing **approval service**, **agent registry**, **task state machine**, or **venture RBAC** in Guardian repo inventory.
- No **audit event stream** productized beyond logs.

### Unnecessary complexity (optional simplifications for cost)

- **Dual web stacks** (Flutter Guardian + Next Founder OS) increases tooling cost; smallest path may be **one** web stack for Founder OS MVP (Next **or** Flutter) — decision needed.
- **Temporal-scale workflow engine** — design already prefers DB + queue for MVP; keep that until proven insufficient.

---

## Phase 4 — Infrastructure boundaries (cost-conscious)

**Recommended development architecture**

1. **New** Supabase (or Postgres) **project** for Founder OS dev/staging — **no** shared credentials with Guardian consumer prod.
2. **Separate** object storage bucket/prefix for PDFs (`venture_id/` prefix).
3. **Secrets:** per-environment Secret Manager (or Supabase vault) — **rotate** independently of Guardian.
4. **CI:** extend existing GitHub Actions pattern with **Founder OS–only** jobs; no deploy to Guardian prod from Founder OS pipelines without explicit gate.
5. **Before any shared staging DB change:** verified backups + restore drill + written rollback (your requirement — procedural, not automated here).

---

## Phase 5 — Actionable report (summary)

### 5.1 Exact identities

- **Founder OS docs workspace:** `C:\Users\rober\.cursor\projects\Founder-OS`, remote `rob345-oss/Founder-OS`, **no commits yet**.
- **Titanium Guardian codebase reviewed:** `C:\Users\rober\Cybersecurity-Senior-App`, remote `rob345-oss/Cybersecurity-Senior-App`.

### 5.2 Inventory of Founder OS source code

- **None** under the requested paths; **none** in Guardian repo root inspection.

### 5.3 Existing infrastructure reusable

- **FastAPI** structure, Dockerfile/compose patterns, pytest layout.
- **PostgreSQL** + SQLAlchemy async (as generic persistence layer; **not** as substitute for Supabase RLS without new design).
- **GitHub Actions** workflow skeleton.
- **OpenAI + LangChain** dependency presence (isolated reuse only).

### 5.4 Architecture documentation needing revision

| Document | Change |
|----------|--------|
| `SYSTEM_ARCHITECTURE.md` | Replace implicit “Guardian is Next.js” with **verified** client stack or explicitly “Founder OS UI = new app (TBD).” |
| `ARCHITECTURE_DECISIONS.md` | Record **ADR: Web stack** (Next vs Flutter vs hybrid). |
| `README.md` (proposed monorepo tree) | Align `apps/` name with actual repo (`frontend/` Flutter today). |
| `MVP_ROADMAP.md` | Add prerequisite: “Confirm canonical Guardian monorepo(s)” if a different repo exists on GitHub. |

### 5.5 Gaps between architecture and implementation

Large: entire Founder OS platform layer (tasks, approvals, agents, knowledge) is **design-only**.

### 5.6 Revised smallest practical first milestone

**Milestone 0 — Reconciliation & repo decision (before coding)**

- Confirm whether `Cybersecurity-Senior-App` is the **only** Guardian monorepo or if a **Next.js + Supabase** repo exists elsewhere; point Cursor at it if so.
- Choose Founder OS **host repo**: stay in `Founder-OS` vs folder inside Guardian monorepo vs new repo — document in ADR.

**Milestone 1 — Foundation (smallest vertical slice)**

- Empty **FastAPI** `founder_os` package (or separate service repo) + **one** health + **one** authenticated “ping” using founder-only allowlist.
- **Supabase project** (or isolated Postgres) with **minimal** `venture` + `project` + `task` tables + RLS stubs; **no** Guardian prod coupling.
- **Queue** optional until first long-running job; can stub task state in DB with a single worker process later.

This is smaller than “Research Agent end-to-end” but validates isolation and auth — mandatory before research scope.

### 5.7 Cost and operational complexity

| Choice | Cost driver | Complexity |
|--------|-------------|------------|
| Separate Supabase project | Extra monthly project | Low security coupling (good) |
| Second Cloud Run service + worker | Idle + CPU for PDF | Medium |
| Next.js + Flutter in org | Two UI pipelines | Higher |
| Single-region, single env MVP | Lowest | Acceptable for solo founder |

### 5.8 Recommended next steps (no implementation started here)

1. **Confirm repo completeness:** Is there another “production” Guardian repo with Next/Supabase? If yes, add to workspace and re-run reconciliation.
2. **ADR:** Web stack + repo layout + database (Supabase new vs Postgres only).
3. **Initial commit** in `Founder-OS` with design docs + this reconciliation (optional hygiene).
4. **Scaffold** Milestone 1 only after (1)–(2).

---

## Appendix — Commands / checks used

- `git rev-parse`, `git remote -v`, `git status -sb`, `git log` in both repos
- Directory existence checks for `apps/founder-os-web`, `backend/founder_os`, `infra/founder-os`, `docs/founder-os`
- Read samples: `docker-compose.yml`, `backend/main.py`, `backend/database/connection.py`, `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`, `.github/workflows/deploy.yml`, `requirements.txt`

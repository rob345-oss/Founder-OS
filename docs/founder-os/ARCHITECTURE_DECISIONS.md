# Architecture Decisions & Open Questions — Titanium Founder OS

## ADR-001 — Repository strategy

| Option | Pros | Cons |
|--------|------|------|
| A. Same monorepo, isolated app + packages | Shared CI, types, UI kit | Risk of accidental coupling |
| B. Separate repo | Clearest boundary | Duplicate CI, version drift |
| **Decision (recommended):** | **A** with strict package boundaries: `apps/founder-os-web`, `services/founder-os-api`, `packages/contracts`. | |

**Status:** **Proposed** — cannot confirm against Guardian repo from this empty workspace.

---

## ADR-002 — Supabase isolation

| Option | Pros | Cons |
|--------|------|------|
| Separate Supabase project | Strong prod isolation | Second billing/admin |
| Shared project, separate Postgres schema | Lower ops surface | Risk of policy mistakes |

**Decision (recommended):** **Separate Supabase project** for Founder OS production; **separate service role keys**.

**Status:** Proposed.

---

## ADR-003 — Workflow engine complexity

| Option | Pros | Cons |
|--------|------|------|
| DB + queue only | MVP simplicity | Manual DAG ergonomics |
| Temporal | Durable workflows | Ops burden |
| Cloud Tasks + DB | Managed, simple | Less expressive |

**Decision (recommended):** Start **DB state machine + queue**; introduce Temporal/Inngest if DAG/interrupt complexity grows.

**Status:** Proposed.

---

## ADR-004 — Model provider abstraction

**Decision:** Provider interface in runtime (`complete`, `embed`, `stream`) with OpenAI first implementation; config per `agent_version`.

**Status:** Proposed.

---

## ADR-005 — Knowledge retrieval

**Decision:** Postgres FTS in MVP; optional `pgvector` later under same RLS.

**Status:** Proposed.

---

## Open questions (require verification)

1. **Guardian codebase** actual layout (Next.js app paths, FastAPI routers, Supabase migrations).
2. **Legal** constraints on storing scraped abstracts vs API-only content.
3. **Scholarly API keys** availability (Unpaywall, Crossref Plus, NCBI key policy).
4. **Hosting** preference for web (Vercel vs Cloud Run) relative to existing org.
5. **PDF engine** for server-side text extraction licensing and sandbox.

## Related documents

- `SYSTEM_ARCHITECTURE.md`
- `SECURITY_THREAT_MODEL.md`

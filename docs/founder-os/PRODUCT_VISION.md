# Titanium Founder OS — Product Vision

## Purpose

Titanium Founder OS is a **private, extensible AI-powered operating system** for one founder (initially) to manage multiple ventures, delegate bounded work to specialized agents, and retain clear ownership of strategy and risk.

The product is **not** a generic chat interface. It is organized around outcomes and accountability:

**Ventures → Projects → Objectives → Workflows → Agents → Deliverables → Decisions**

## Target users

| Phase | Primary user | Notes |
|-------|----------------|-------|
| MVP | Single founder | Titanium Guardian is the first venture, not the permanent product boundary |
| Later | Small trusted team | Out of MVP scope; design for future isolation patterns |

## Principles

1. **Supervised autonomy by default** — Agents may research, analyze, draft, and organize within authorization; consequential actions require human approval enforced **by policy and infrastructure**, not prompts alone.
2. **Traceability** — Every material agent action links to a task, scope (venture/project), policy decision, and auditable outcome.
3. **Venture isolation** — Data, permissions, integrations, and knowledge default to strict boundaries; cross-venture sharing is explicit and logged.
4. **Least privilege** — Tool and integration credentials are scoped; agents cannot expand their own permissions.
5. **Provenance over vibes** — Distinguish verified sources, human-confirmed facts, drafts, and model speculation.
6. **Evolvability** — New agent types should plug into a **shared platform** (registry, runtime, approvals, knowledge, audit) without redesign.

## Scope (product)

**In scope (directional):**

- Multi-venture hierarchy and project workspaces.
- Agent definitions, versions, budgets, and tooling boundaries.
- Task and workflow execution with durable state, cancellation, and recovery.
- Central approval service for external and high-impact actions.
- Knowledge hub with search, citations, and scoped libraries.
- First operational **Academic Research Agent** (full pipeline spec in `RESEARCH_AGENT_SPEC.md`).

**Explicitly out of scope for MVP:**

- Public marketplace, unrestricted browser/computer control, autonomous production deploys, enterprise multi-tenant collaboration, heavy knowledge graphs, and “swarm” multi-agent autonomy without delegation rules.

## Success metrics (MVP)

| Category | Metric | Intent |
|----------|--------|--------|
| Attention | Time to see “what needs action” on home | Seconds, not minutes |
| Control | % of consequential actions with policy-recorded approval | Target high; exceptions only for drills |
| Reliability | Task completion vs failed/cancelled (by class) | Baseline + trend |
| Cost | Spend per venture/agent/run | Caps and alerts respected |
| Knowledge | Retrieval with citation to stored artifact | No “anonymous” answers for research |
| Extensibility | Second agent added without platform redesign | Acceptance test in `MVP_ROADMAP.md` |

## Repository note (audit)

The workspace at design time contained **no application source** (empty repository with no commits). Claims about reuse of Next.js, FastAPI, Supabase, Cloud Run, etc. are **architectural recommendations and reuse hypotheses** until verified against the actual Titanium Guardian / platform repositories.

## Related documents

- `PRODUCT_REQUIREMENTS.md` — Functional and nonfunctional requirements.
- `ARCHITECTURE_DECISIONS.md` — Decisions, trade-offs, open questions.

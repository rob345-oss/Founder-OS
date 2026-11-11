# MVP and Release Roadmap — Titanium Founder OS

## Assumptions (no calendar or cost without basis)

- **Team size, weekly cadence, and infra baseline unknown** until tied to Guardian repos.
- Estimates should be produced after: repository merge strategy, Supabase org, and GCP project boundaries are fixed.

## MVP definition (aligned with prompt)

**Required:**

- Founder-only dashboard
- Venture / project / objective / task organization
- Agent registry and configuration (versioned definitions)
- One operational **Research Agent** (stages in `RESEARCH_AGENT_SPEC.md`)
- Discovery + screening + reading queue + PDF annotations
- Research library in Knowledge Hub
- Durable task execution (queue + leases + recovery)
- Approval infrastructure for scope and external-class ops (simulated if no integration yet)
- Permissions (RLS + tool allowlists)
- Audit logging
- Basic API cost monitoring (LLM + scholarly APIs)
- Export (venture ZIP)

**Deferred:** swarms, marketplace, multi-user enterprise, autonomous prod deploys, unrestricted browser, heavy graph DB, full video infra.

## Second-agent extensibility acceptance test (concrete)

1. Add `Marketing Draft Agent` (or stub) with **distinct** `agent_def` and **narrower** tool grants.
2. Create project task assigned to it; run produces **artifact** with schema validation.
3. Trigger **mock external publish** → generates `approval_request`; execution **blocked** until approved; idempotent replay verified.
4. Confirm **no migrations** to core tables beyond nullable fields already planned (definitions JSON).
5. Roll back default `agent_version` and confirm new tasks pick rollback target.

**Pass:** accomplished without breaking Research Agent flows or redesigning task/approval tables.

---

## Release 1 — Core Foundation

**Dependencies:** Supabase project; Cloud Run services; Secret Manager; queue provider choice.

| Workstream | Tasks |
|------------|-------|
| Identity | Founder-only auth; server RLS patterns |
| Org model | Ventures/projects/objectives/tasks API/UI |
| Agents | Registry + immutable versions |
| Execution | Task state machine, workers, retries, cancellation |
| Policy | Permission Engine v1 + Approval Service v1 |
| Observability | Traces + usage records |
| Audit | Append-only audit pipeline |

**Technical risks:** Incorrect RLS scope; queue lease bugs; approval/token replay holes.

**Acceptance criteria:**

- E2E: create venture → task → run progresses through states on worker restart.
- Approval path blocks external op in automated test harness.

**Tests:**

- Policy unit tests (table-driven).
- Integration tests for RLS as different JWT claims (simulate).
- Worker chaos test: kill mid-run → resumes safely.

**Exit criteria:** Research Agent can be built only atop this foundation without special casing security.

---

## Release 2 — Research Studio

**Dependencies:** Release 1; at least one scholarly provider (OpenAlex) verified; object storage.

| Workstream | Tasks |
|------------|-------|
| Providers | Adapters + rate limits + provenance logs |
| Screening | Dedupe + explain log |
| Reading | PDF pipeline + reader UI |
| Evidence | Evidence cards + citations |
| Knowledge | FTS index + library UX |

**Technical risks:** PDF exploit surface; provider API changes; ambiguous dedupe.

**Acceptance criteria:**

- Full funnel with founder scope approval and human read confirmation.
- Evidence card links to exact page offset.

**Tests:**

- Golden-file tests for metadata normalization.
- Parser fuzz samples in CI (bounded).

**Exit criteria:** Founder can run a non-trivial literature review entirely inside Founder OS.

---

## Release 3 — Extensible Agent Studio

**Dependencies:** Release 2 stable.

| Workstream | Tasks |
|------------|-------|
| Templates | Agent templates library |
| Sandbox | Controlled test queue |
| Policies | Fine-grained approval routing |
| Second agent | Per acceptance test |

**Technical risks:** Policy combinatorial explosion; version migration errors.

**Acceptance criteria:** Second agent live with independent tool policy.

**Exit criteria:** Agent Studio gains are horizontal (help any future agent).

---

## Release 4 — Founder Automation

**Dependencies:** Releases 1–3.

| Workstream | Tasks |
|------------|-------|
| Recurrence | Scheduled workflows |
| Delegation | Child tasks with narrowed authority |
| Integrations | Additional connectors |
| Monitoring agents | Read-only first; L3 ops gated |

**Technical risks:** Long-running schedules; integration drift; alert storms.

**Acceptance criteria:** Recurring workflow with pause/resume and spend caps.

**Exit criteria:** Founder can automate recurring checks without 24/7 babysitting.

---

## Implementation priority (first when coding authorized)

1. Repo boundary decision + empty app skeleton (Next.js + FastAPI) wired to CI.
2. Supabase schema + RLS + Founder-only allowlist.
3. Task queue + worker + state machine parity tests.
4. Approval Service minimal viable path.
5. Research Agent Stage 1–4 with OpenAlex/Crossref.
6. PDF upload + reader + annotations.
7. Evidence cards + export.

## Related documents

- `PRODUCT_REQUIREMENTS.md` — Requirement IDs.
- `ARCHITECTURE_DECISIONS.md` — Options and decisions.

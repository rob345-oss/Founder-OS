# Product Requirements — Titanium Founder OS

Requirements are labeled **MVP**, **Phase 2+**, or **Deferred**. “Must” implies MVP unless marked otherwise.

## Functional requirements

### Organization and work management

| ID | Requirement | Priority |
|----|-------------|----------|
| F-ORG-1 | Support hierarchy: **Venture → Project → Objective → Task** with ownership and activity history | MVP |
| F-ORG-2 | Tasks may belong to workflows; workflow runs are observable and cancellable | MVP |
| F-ORG-3 | Deliverables and decisions are first-class records linked to tasks and projects | MVP |
| F-ORG-4 | Cross-venture knowledge sharing requires explicit grant and audit | MVP |

### Agents

| ID | Requirement | Priority |
|----|-------------|----------|
| F-AGT-1 | Agent **definition** (config, tools, policies, budgets) is separate from **execution** (runs) | MVP |
| F-AGT-2 | Agent lifecycle: Draft → Test → Review → Activate → Monitor → Update / Pause / Retire | MVP (full automation Phase 2+) |
| F-AGT-3 | **Immutable versions** once activated; material changes create new version | MVP |
| F-AGT-4 | Categories: Knowledge, Execution, Monitoring — **interfaces** supported; not all categories built in MVP | MVP (interfaces) |
| F-AGT-5 | Second agent can be added using same registry, runtime, approvals — **acceptance test** in roadmap | MVP |

### Execution and orchestration

| ID | Requirement | Priority |
|----|-------------|----------|
| F-EXE-1 | Persistent task state machine (see `AGENT_PLATFORM.md`) | MVP |
| F-EXE-2 | Reliable cancellation, retries with backoff, execution deadlines | MVP |
| F-EXE-3 | Recovery after worker/process crash (at-least-once delivery; idempotent side effects) | MVP |
| F-EXE-4 | One accountable agent per task initially; delegated subtasks **reduce or inherit** authority, never expand | Phase 2+ |

### Approvals and policy

| ID | Requirement | Priority |
|----|-------------|----------|
| F-APR-1 | Four authority levels (Observe → Prepare → External → High-impact); defaults in `SUPERVISED_AUTONOMY.md` | MVP |
| F-APR-2 | Approval applies to **exact operation + material parameters**; deterministic policy outside model | MVP |
| F-APR-3 | States: pending, approved, rejected, expired, revoked; modified proposal requires new approval | MVP |
| F-APR-4 | Emergency stop: halt agent and optionally running workflows | MVP |

### Knowledge

| ID | Requirement | Priority |
|----|-------------|----------|
| F-KNO-1 | Typed knowledge: raw docs, sources, verified facts, interpretations, notes, hypotheses, decisions, deliverables | MVP |
| F-KNO-2 | Full-text search; optional semantic retrieval with explicit “interpretation” labeling | MVP (semantic Phase 2 optional) |
| F-KNO-3 | Citations and provenance on research artifacts | MVP |
| F-KNO-4 | Export/portability of venture-scoped libraries | MVP (basic) |

### Research Agent (first operational agent)

| ID | Requirement | Priority |
|----|-------------|----------|
| F-RES-1 | Stages 1–8 per `RESEARCH_AGENT_SPEC.md` | MVP |
| F-RES-2 | Founder approval of research scope before discovery | MVP |
| F-RES-3 | No paywall bypass; manual PDF import for legal full text | MVP |
| F-RES-4 | PDF reader: navigation, search, highlights, notes, bookmarks; **AI must not auto-mark “read”** | MVP |

### Integrations

| ID | Requirement | Priority |
|----|-------------|----------|
| F-INT-1 | Integration connections stored with scoped credentials (Secret Manager or equivalent) | MVP |
| F-INT-2 | Tool gateway invokes only allowlisted operations per agent/version | MVP |

### Governance

| ID | Requirement | Priority |
|----|-------------|----------|
| F-GOV-1 | Founder-only authentication for MVP | MVP |
| F-GOV-2 | Audit log of approvals, policy changes, agent activation, integration access | MVP |
| F-GOV-3 | Spending limits and usage records per venture/agent | MVP |

## Nonfunctional requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NF-SEC-1 | Server-side authorization; venture/project isolation enforced in data layer | MVP |
| NF-SEC-2 | No unrestricted bridge from Founder OS to Titanium Guardian production without explicit network/policy isolation | MVP |
| NF-REL-1 | Durability: no acknowledged task state loss on single worker failure | MVP |
| NF-PERF-1 | Dashboard and task list responsive for single-user scale | MVP |
| NF-OBS-1 | Structured execution traces and cost attribution | MVP |
| NF-PRIV-1 | Private document storage; safe parsing pipeline (malware, PII handling policy) | MVP |

## Acceptance criteria (MVP bundle)

1. Founder can create ventures, projects, objectives, and tasks; link an agent run to a task.
2. Research workflow runs end-to-end with scope approval, deduplicated discovery, screening log, reading queue, evidence cards, and library storage.
3. Any simulated “send/publish/deploy/financial” action creates an approval request; execution is **blocked** until approved policy outcome.
4. Agent version v1 activated; v2 created with changed tools; rollback behavior documented and tested.
5. Audit log contains approval decisions and key agent actions with venture/project context.
6. Second agent (minimal stub) registered and executed through **same** task and approval paths without schema redesign.

## Deferred (see `MVP_ROADMAP.md`)

- Multi-user RBAC beyond founder.
- Unrestricted delegating multi-agent graphs.
- Advanced visual workflow canvas.
- Full video production or unrestricted custom tool execution.

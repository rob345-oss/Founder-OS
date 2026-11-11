# Information Architecture — Titanium Founder OS

## Navigation tree

```text
Founder OS
├── Home / Founder Command Center
├── Ventures
│   └── [Venture]
│       ├── Overview
│       ├── Projects
│       │   └── [Project]
│       │       ├── Overview
│       │       ├── Objectives
│       │       ├── Tasks
│       │       ├── Workflows
│       │       ├── Agents (assigned)
│       │       ├── Documents & Knowledge
│       │       ├── Deliverables
│       │       ├── Decisions
│       │       └── Activity
│       ├── Knowledge (venture-scoped)
│       └── Settings (venture-scoped permissions view)
├── My Work
│   ├── Tasks (all ventures)
│   ├── Agent runs
│   ├── Scheduled workflows
│   ├── Waiting (input / external)
│   ├── Approvals (inbox)
│   ├── Failed
│   └── Completed deliverables
├── Agent Studio
│   ├── Agents list
│   ├── [Agent] — Definition & versions
│   ├── Test / sandbox (controlled)
│   └── Policies (budget, tools, approval routing)
├── Research Studio (Research Agent workspace)
│   ├── Active studies
│   ├── Screening queue
│   ├── Reading queue
│   └── Evidence & synthesis drafts
├── Knowledge Hub
│   ├── Library (search)
│   ├── Sources & citations
│   ├── Evidence cards
│   └── Notes & hypotheses
├── Insights & Analytics
│   ├── Reliability & completion
│   ├── Costs by venture / agent
│   ├── Approval bottlenecks
│   └── Research productivity (MVP: basic counts)
└── Governance & Settings
    ├── Profile & security
    ├── Integrations
    ├── Secrets (references, not plaintext)
    ├── Approval policies
    ├── Spending limits
    ├── Models
    └── Audit & security alerts
```

## Screen inventory (MVP emphasis)

| Area | Screen | Primary purpose |
|------|--------|-----------------|
| Home | Command Center | Attention: approvals, failures, spend, deadlines, active agent work |
| Ventures | Venture list / create | Switch context; see health per venture |
| Venture | Overview | Mission, key metrics, pinned objectives |
| Project | Workspace shell | Single place for objectives through activity |
| My Work | Unified queue | Cross-venture task and approval triage |
| Agent Studio | Agent list / detail | Configure agents; version; pause |
| Research | Study detail | Scope → discovery → screening → reading → evidence |
| Knowledge | Hub search | Find documents, cards, decisions with filters |
| Governance | Approvals policies | Configure levels and thresholds |
| Settings | Integrations | Connect OpenAlex, etc.; scope per venture |

## User journeys

### 1. Morning triage (daily)

1. Land on **Command Center**.
2. Scan: pending approvals → failed tasks → budget warnings → due objectives.
3. Open **Approval inbox**; approve/reject with parameter inspection.
4. Return to prioritized **My Work** list.

**Empty state:** guided setup (create venture → project → first task).  
**Loading:** skeleton blocks per widget; no blocking spinners on full page.  
**Error:** inline banner + retry; failed widgets degrade independently.

### 2. Spin up Research Agent study

1. From **Research Studio** or **Project → Workflows**, create “Research study” task.
2. **Stage 1:** Agent proposes scope; founder **approves** scope (mandatory gate).
3. Stages 2–4 run under “Prepare” authority; screening log visible.
4. **Reading:** documents appear in reading queue; founder uses PDF reader.
5. **Evidence cards** promoted to **Knowledge Hub** (project library).
6. Optional: “hypotheses / business implications” stored as **draft** with explicit non-verified labeling.

**Error:** API rate limit / provider failure → task `failed` with retry policy; no silent skip.

### 3. Configure new agent (second agent path)

1. **Agent Studio → New agent** from template.
2. Attach venture/project scope; tool allowlist; budget; approval policy.
3. **Draft → Test** (sandbox queue) → **Review** → **Activate v1**.
4. Run task from project; verify trace, cost, audit.

**Blocked:** missing integration or policy conflict surfaces before activation.

### 4. Emergency stop

1. **Governance → Agents** or agent detail → **Stop**.
2. In-flight runs go to `cancelled` or `paused` per policy; new schedules blocked.

## Cross-cutting UX patterns

- **Context chip:** current Venture / Project visible in shell header; switching clears ambiguous global state.
- **Provenance pill:** on every AI-heavy artifact: source type (verified / draft / model interpretation).
- **Separation of “proposed” vs “done”:** tabs or lanes; color-neutral, not alarm-heavy.

## Related documents

- `UX_DESIGN_SPEC.md` — Per-screen detail.
- `SYSTEM_ARCHITECTURE.md` — Technical mapping to routes/APIs.

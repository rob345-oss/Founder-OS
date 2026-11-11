# Titanium Founder OS — Design Documentation

Design-only artifacts for **Titanium Founder OS**. Implementation, migrations, and deployment are out of scope until explicitly authorized.

## Repository audit note

The **Founder-OS** workspace used for this design pass contained **no commits and no source files** (empty repository). Sections describing reuse of Next.js, FastAPI, Supabase, Cloud Run, and Guardian integrations are **target architecture and hypotheses** to validate against the real Titanium Guardian / platform repositories.

## Document index

| Document | Description |
|----------|-------------|
| [REPOSITORY_RECONCILIATION.md](./REPOSITORY_RECONCILIATION.md) | Guardian repo vs design docs — inventory, gaps, revised milestones |
| [../SUPABASE_ISOLATION.md](../SUPABASE_ISOLATION.md) | Shared Supabase project — schema, roles, migration safety |
| [../IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md) | What is implemented, tests run, manual steps |
| [PRODUCT_VISION.md](./PRODUCT_VISION.md) | Vision, principles, success metrics |
| [PRODUCT_REQUIREMENTS.md](./PRODUCT_REQUIREMENTS.md) | Functional / NFR, priorities, acceptance |
| [INFORMATION_ARCHITECTURE.md](./INFORMATION_ARCHITECTURE.md) | Navigation, screens, journeys |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Services, infrastructure, diagrams |
| [AGENT_PLATFORM.md](./AGENT_PLATFORM.md) | Agent contracts, lifecycle, orchestration |
| [SUPERVISED_AUTONOMY.md](./SUPERVISED_AUTONOMY.md) | Permission levels, approvals, policy |
| [KNOWLEDGE_ARCHITECTURE.md](./KNOWLEDGE_ARCHITECTURE.md) | Provenance, storage, retrieval |
| [RESEARCH_AGENT_SPEC.md](./RESEARCH_AGENT_SPEC.md) | Academic research pipeline |
| [DATA_MODEL.md](./DATA_MODEL.md) | Logical schema, MVP scope |
| [SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md) | Threats, mitigations, trust boundaries |
| [UX_DESIGN_SPEC.md](./UX_DESIGN_SPEC.md) | Views, states, interactions |
| [MVP_ROADMAP.md](./MVP_ROADMAP.md) | Phased delivery, tests, risks |
| [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) | ADRs and open questions |

## Proposed repository layout (when implementation starts)

```text
Founder-OS/
├── apps/
│   └── founder-web/           # Next.js (Founder OS shell)
├── services/
│   └── founder-api/           # FastAPI — control plane + gateway to workers
├── workers/
│   └── founder-worker/        # Cloud Run worker / job
├── packages/
│   ├── contracts/             # JSON Schema, OpenAPI, shared types
│   ├── policy/                # Permission / approval evaluation (shared lib)
│   └── db/                    # SQL helpers, migration naming only (no migrations until authorized)
├── docs/
│   └── founder-os/            # This design set
└── infra/                     # IaC (Terraform/Pulumi) — separate envs
```

## Terminology

Terms are used consistently across documents: **Venture**, **Project**, **Objective**, **Task**, **Workflow**, **Agent definition/version**, **Agent run**, **Artifact**, **Approval request**, **Knowledge item**, **Evidence card**.

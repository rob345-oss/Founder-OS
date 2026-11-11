# UX Design Specification — Titanium Founder OS

**Note:** Conceptual only — no production UI code in this phase.

## Design principles

1. **Hierarchy first** — One primary action per view where possible.
2. **Calm density** — Cards and tables breathe; use progressive disclosure.
3. **Transparency** — Runs, costs, and model/tool traces visible on demand.
4. **Honest status** — Clear separation of drafts vs verified vs decisions.
5. **Responsive** — Desktop-first with usable mobile for approvals and reading.

## Global shell

- **Left nav** (collapsible): Home, My Work, Ventures, Agent Studio, Research, Knowledge, Insights, Governance.
- **Header:** Venture + Project chips; global search; avatar; spend meter (daily/monthly toggle).
- **Command palette (later):** optional Phase 2.

---

### 1. Founder dashboard (Home)

| Data | Actions |
|------|---------|
| Pending approvals (count, oldest first) | Open inbox |
| Failed tasks | Retry / fix / delegate |
| Active agent runs | Inspect trace |
| Spend vs budget | Adjust caps / pause agent |
| Upcoming deadlines | Jump to project |
| Recent deliverables | Open artifact |

**Empty:** “Create your first venture” checklist.  
**Loading:** Skeleton cards per section.  
**Error:** Banner + partial render of healthy widgets.

---

### 2. Venture overview

| Data | Actions |
|------|---------|
| Mission, active projects, risk flags | Create project |
| Key objectives summary | Drill in |
| Knowledge stats | Open hub filtered |

**Empty:** “Add first project.”

---

### 3. Project workspace (tabbed)

Tabs: Overview, Objectives, Tasks, Workflows, Agents, Documents, Deliverables, Decisions, Activity.

| Data | Actions |
|------|---------|
| Objectives with status | Add/edit objective |
| Task list with filters | Create task; assign agent |
| Agent assignments | Configure scope |

**Loading:** Tab bar static; tab content skeleton.  
**Error:** Inline tab error with retry.

---

### 4. Agent Studio (list)

| Data | Actions |
|------|---------|
| Agents with version, status, spend | New agent; pause/resume |
| Health indicators | Inspect |

---

### 5. Agent detail

| Data | Actions |
|------|---------|
| Mission, tools, budgets, policies | Edit **new draft version** |
| Version history | Activate / rollback default |
| Recent runs | Open traces |

**Guard:** Warn on unsaved draft policy changes.

---

### 6. Task execution detail

| Data | Actions |
|------|---------|
| Timeline of states | Cancel / pause (if allowed) |
| Linked approval | Jump |
| Tool calls with redacted params | — |
| Artifacts | Download |
| Cost line | — |

**Failed:** Expand error taxonomy; suggest next step.

---

### 7. Approval inbox

| Data | Actions |
|------|---------|
| Risk, operation, expiry countdown | Approve / reject |
| Parameter diff view | Request modification (spawns new task/state) |

**Expired:** Show “request new approval” CTA on related task.

---

### 8. Research Studio

| Data | Actions |
|------|---------|
| Studies with stage progress | Continue |
| Screening stats | Review excluded |
| Reading queue depth | Open reader |

---

### 9. PDF reading interface

| Data | Actions |
|------|---------|
| Page thumbnails optional | Next/prev; go to page |
| Search within PDF | Highlight |
| Notes and annotations | Save |
| Progress | **Manual** complete |

**Empty queue:** “Add papers from screening or upload PDF.”

---

### 10. Knowledge Hub

| Data | Actions |
|------|---------|
| Faceted search | Open evidence card |
| Provenance tags | Filter by verified vs draft |

---

### 11. Integration settings

| Data | Actions |
|------|---------|
| Connected services | Connect/disconnect |
| Scopes | Narrow grant |
| Last error | Re-auth |

**Secrets:** Show **mask** + rotation only.

---

### 12. Agent performance (Insights subset)

| Data | Actions |
|------|---------|
| Success rate, latency, cost per task | Tune budgets |
| Approval bottleneck stats | Adjust policies |

## Accessibility

- WCAG-oriented contrast; focus rings; keyboard shortcuts for reader (Phase 2 checklist).

## Related documents

- `INFORMATION_ARCHITECTURE.md` — Navigation.

"use client";

import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchCrmPipeline, moveCrmPipelineStage } from "@/lib/crm/client-api";
import { CRM_PIPELINE_STAGES, type CrmContactListItem, type CrmPipelineStage } from "@/lib/crm/types";

const STAGE_LABELS: Record<CrmPipelineStage, string> = {
  new_lead: "New lead",
  contacted: "Contacted",
  interested: "Interested",
  qualified: "Qualified",
  pilot_candidate: "Pilot candidate",
  pilot_active: "Pilot active",
  converted: "Converted",
  closed: "Closed",
};

export default function CrmPipelinePage() {
  const { token } = useCrmSession();
  const [items, setItems] = useState<CrmContactListItem[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await fetchCrmPipeline(token);
    setItems(data.items);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onDrop(stage: CrmPipelineStage) {
    if (!token || !dragId) return;
    await moveCrmPipelineStage(token, dragId, stage);
    setDragId(null);
    await load();
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--studio-text-primary)]">Pipeline</h1>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {CRM_PIPELINE_STAGES.map((stage) => {
          const column = items.filter((i) => i.pipelineStage === stage);
          return (
            <section
              key={stage}
              className="flex w-[260px] shrink-0 flex-col rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => void onDrop(stage)}
            >
              <header className="border-b border-[var(--studio-border)] px-3 py-3">
                <h2 className="text-xs font-semibold text-[var(--studio-text-primary)]">{STAGE_LABELS[stage]}</h2>
                <p className="text-[10px] text-[var(--studio-text-tertiary)]">{column.length} contacts</p>
              </header>
              <ul className="space-y-2 p-2">
                {column.map((c) => (
                  <li
                    key={c.id}
                    draggable
                    onDragStart={() => setDragId(c.id)}
                    className="cursor-grab rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-2 text-xs active:cursor-grabbing"
                  >
                    <p className="font-medium text-[var(--studio-text-primary)]">{c.fullName || c.primaryEmail}</p>
                    <p className="text-[10px] text-[var(--studio-text-tertiary)]">{c.primaryEmail}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

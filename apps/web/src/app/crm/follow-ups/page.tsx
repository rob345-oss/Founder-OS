"use client";

import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { completeCrmFollowUp, fetchCrmFollowUps } from "@/lib/crm/client-api";
import type { CrmFollowUp } from "@/lib/crm/types";

export default function CrmFollowUpsPage() {
  const { token } = useCrmSession();
  const [items, setItems] = useState<CrmFollowUp[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setItems(await fetchCrmFollowUps(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-[var(--studio-text-primary)]">Follow-ups</h1>
      <ul className="space-y-3">
        {items.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4">
            <div>
              <p className="font-medium text-[var(--studio-text-primary)]">{f.title}</p>
              <p className="text-xs text-[var(--studio-text-tertiary)]">
                Due {new Date(f.dueAt).toLocaleString()} · {f.priority} · {f.status}
              </p>
            </div>
            {f.status === "pending" && (
              <button
                type="button"
                className="rounded-md border border-[var(--studio-border)] px-3 py-1 text-xs"
                onClick={() => void completeCrmFollowUp(token!, f.id).then(load)}
              >
                Complete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

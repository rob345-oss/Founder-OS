"use client";

import { useCallback, useEffect, useState } from "react";

import { crmBtnPrimary } from "@/components/crm/crmUi";
import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchEmailSegments, saveEmailSegmentApi } from "@/lib/crm/email-client-api";
import type { AudienceFilter, CrmEmailSegment } from "@/lib/crm/email/types";

export default function EmailAudiencePage() {
  const { token } = useCrmSession();
  const [segments, setSegments] = useState<CrmEmailSegment[]>([]);
  const [name, setName] = useState("");
  const [mode, setMode] = useState<AudienceFilter["mode"]>("waitlist");

  const load = useCallback(async () => {
    if (!token) return;
    setSegments(await fetchEmailSegments(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
        <h2 className="text-sm font-semibold">Saved segments</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {segments.map((s) => (
            <li key={s.id} className="rounded-md border border-[var(--studio-border)] px-3 py-2">
              <p className="font-medium">{s.name}</p>
              <p className="text-xs text-[var(--studio-text-tertiary)]">{s.filter.mode ?? "custom"}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-5">
        <h2 className="text-sm font-semibold">Create segment</h2>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Segment name" className="mt-3 w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2 text-sm" />
        <select value={mode} onChange={(e) => setMode(e.target.value as AudienceFilter["mode"])} className="mt-2 w-full rounded-md border border-[var(--studio-border)] bg-transparent px-3 py-2 text-sm">
          <option value="waitlist">Waitlist leads</option>
          <option value="all_eligible">All eligible contacts</option>
          <option value="tags">Tagged contacts</option>
        </select>
        <button
          type="button"
          className={`mt-4 ${crmBtnPrimary}`}
          onClick={() => {
            if (!token || !name.trim()) return;
            void saveEmailSegmentApi(token, { name, filter: { mode, requireMarketingConsent: true } }).then(load);
          }}
        >
          Save segment
        </button>
      </section>
    </div>
  );
}
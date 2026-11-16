"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchEmailLabels, fetchEmailTemplates } from "@/lib/crm/email-client-api";
import type { CrmEmailLabel, CrmEmailTemplate } from "@/lib/crm/email/types";

export default function EmailTemplatesPage() {
  const { token } = useCrmSession();
  const [templates, setTemplates] = useState<CrmEmailTemplate[]>([]);
  const [labels, setLabels] = useState<CrmEmailLabel[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setTemplates(await fetchEmailTemplates(token));
    setLabels(await fetchEmailLabels(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const labelMap = Object.fromEntries(labels.map((l) => [l.id, l]));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/crm/email/templates/new" className="rounded-md bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white">
          New template
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <Link
            key={t.id}
            href={`/crm/email/templates/${t.id}`}
            className="rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4 transition-colors hover:border-[var(--studio-accent)]"
          >
            <h3 className="font-semibold text-[var(--studio-text-primary)]">{t.name}</h3>
            <p className="mt-1 text-sm text-[var(--studio-text-secondary)]">{t.subjectDefault || "—"}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              <span className="rounded-full border border-[var(--studio-border)] px-2 py-0.5 text-[10px] uppercase">{t.locale}</span>
              {t.labelIds.map((id) => (
                <span key={id} className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: `${labelMap[id]?.color ?? "#888"}22` }}>
                  {labelMap[id]?.name ?? id}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
      {!templates.length && <p className="text-sm text-[var(--studio-text-tertiary)]">Create your first branded template to reuse across campaigns.</p>}
    </div>
  );
}
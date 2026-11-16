"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { useCrmSession } from "@/components/crm/useCrmSession";
import { fetchEmailCampaigns } from "@/lib/crm/email-client-api";
import type { CrmEmailCampaign } from "@/lib/crm/email/types";

export default function EmailCampaignsPage() {
  const { token } = useCrmSession();
  const [items, setItems] = useState<CrmEmailCampaign[]>([]);

  const load = useCallback(async () => {
    if (!token) return;
    setItems(await fetchEmailCampaigns(token));
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Link href="/crm/email/campaigns/new" className="rounded-md bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white">
          New campaign
        </Link>
      </div>
      <div className="overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--studio-bg-2)] text-[11px] uppercase text-[var(--studio-text-tertiary)]">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Recipients</th>
              <th className="px-4 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-[var(--studio-border)]">
                <td className="px-4 py-2">
                  <Link href={`/crm/email/campaigns/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 capitalize">{c.status.replaceAll("_", " ")}</td>
                <td className="px-4 py-2 text-[var(--studio-text-secondary)]">{c.estimatedRecipients ?? "—"}</td>
                <td className="px-4 py-2 text-[var(--studio-text-tertiary)]">{new Date(c.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
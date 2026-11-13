"use client";

import { useCallback, useEffect, useState } from "react";

import { MarketingModuleScaffold } from "@/components/marketing/MarketingModuleScaffold";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import { createMarketingContent, fetchMarketingContent } from "@/lib/marketing/client-api";
import type { MarketingContentItem } from "@/lib/marketing/types";

const STATUSES = ["idea", "script", "ready_to_film", "filmed", "editing", "scheduled", "published"] as const;

export default function MarketingContentPage() {
  const { token } = useMarketingSession();
  const [items, setItems] = useState<MarketingContentItem[]>([]);
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("linkedin");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setItems(await fetchMarketingContent(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
  try {
      await createMarketingContent(token, { title: title.trim(), platform, status: "idea" });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <MarketingModuleScaffold
      eyebrow="Social & content"
      title="Content studio"
      description="Idea → published workflow for Titanium Guardian marketing assets. Founder OS Studio pipeline remains available for local video production."
    >
      {error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

      <form onSubmit={(e) => void onCreate(e)} className="mb-8 grid gap-3 rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-4 md:grid-cols-[1fr,160px,auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Content title"
          className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm text-[var(--studio-text-primary)]"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
        >
          <option value="instagram">Instagram</option>
          <option value="linkedin">LinkedIn</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
          <option value="facebook">Facebook</option>
        </select>
        <button type="submit" className="rounded-lg bg-[var(--studio-accent-muted)] px-4 py-2 text-sm font-medium text-[var(--studio-text-primary)]">
          Add content
        </button>
      </form>

      <div className="overflow-x-auto rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-[var(--studio-bg-2)] text-[10px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Platform</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Publish date</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-[var(--studio-border)] text-[var(--studio-text-secondary)]">
                <td className="px-3 py-2 font-medium text-[var(--studio-text-primary)]">{c.title}</td>
                <td className="px-3 py-2">{c.platform ?? "—"}</td>
                <td className="px-3 py-2">{c.status}</td>
                <td className="px-3 py-2">{c.publishDate ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? <p className="p-4 text-sm text-[var(--studio-text-tertiary)]">No content items yet.</p> : null}
      </div>
      <p className="mt-4 text-xs text-[var(--studio-text-tertiary)]">
        Valid statuses: {STATUSES.join(" → ")}
      </p>
    </MarketingModuleScaffold>
  );
}

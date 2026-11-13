import Link from "next/link";

import type { ContentPreviewRow } from "@/lib/marketing/types";

import { MarketingEmptyState } from "./MarketingEmptyState";

export function MarketingTopContent({ rows }: { rows: ContentPreviewRow[] }) {
  return (
    <section className="studio-panel p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">Top performing content</h2>
        <Link href="/marketing/social" className="text-xs font-medium text-[var(--studio-accent)] hover:underline">
          View all content analytics
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <MarketingEmptyState
            title="No published content tracked yet"
            description="Add items in Content Studio or connect social platforms to surface reach and engagement."
            action={
              <Link
                href="/marketing/content"
                className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2 text-sm text-[var(--studio-text-primary)]"
              >
                Open Content Studio
              </Link>
            }
          />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--studio-border)] text-[10px] uppercase tracking-wide text-[var(--studio-text-tertiary)]">
                <th className="py-2 pr-3 font-medium">Title</th>
                <th className="py-2 pr-3 font-medium">Platform</th>
                <th className="py-2 pr-3 font-medium">Format</th>
                <th className="py-2 pr-3 font-medium">Published</th>
                <th className="py-2 pr-3 font-medium">Reach</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[var(--studio-border)]/60 text-[var(--studio-text-secondary)]">
                  <td className="py-2.5 pr-3 font-medium text-[var(--studio-text-primary)]">{r.title}</td>
                  <td className="py-2.5 pr-3">{r.platform}</td>
                  <td className="py-2.5 pr-3">{r.format}</td>
                  <td className="py-2.5 pr-3">{r.publishedAt ?? "—"}</td>
                  <td className="py-2.5 pr-3">{r.reach ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

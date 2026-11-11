"use client";

import { STUDIO_CATEGORY_LABELS, STUDIO_CONTENT_CATEGORIES, type StudioContentCategory } from "@founder-os/studio";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { patchMedia, mediaStreamUrl } from "@/lib/studio/client-api";
import { formatDuration, formatFileSize, formatRelativeTime } from "@/lib/studio/format";

import { CategoryBadge } from "./CategoryBadge";
import { VideoPreview } from "./VideoPreview";

export function MediaInspector({
  item,
  onPatched,
}: {
  item: StudioMediaPublic | null;
  onPatched?: (item: StudioMediaPublic) => void;
}) {
  if (!item) {
    return (
      <aside className="flex h-full w-[var(--studio-inspector-width)] shrink-0 flex-col border-l border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-6">
        <p className="text-sm text-[var(--studio-text-tertiary)]">Select a clip to inspect metadata and preview.</p>
      </aside>
    );
  }

  const mediaId = item.id;

  async function setCategory(category: StudioContentCategory) {
    const { item: updated } = await patchMedia(mediaId, { category });
    onPatched?.(updated);
  }

  return (
    <aside className="flex h-full w-[var(--studio-inspector-width)] shrink-0 flex-col border-l border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
      <div className="border-b border-[var(--studio-border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Inspector</h2>
        <p className="mt-1 truncate text-xs text-[var(--studio-text-tertiary)]">{item.fileName}</p>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <VideoPreview src={mediaStreamUrl(item.id)} aspectClassName="aspect-video" />
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Metadata
          </h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Duration" value={formatDuration(item.durationSeconds)} />
            <Row label="Resolution" value={item.width && item.height ? `${item.width}×${item.height}` : "—"} />
            <Row label="Aspect" value={item.aspectRatio ?? "—"} />
            <Row label="Size" value={formatFileSize(item.fileSizeBytes)} />
            <Row label="Modified" value={formatRelativeTime(item.dateModified)} />
            <Row label="Source" value={item.sourceHint} />
          </dl>
        </section>
        <section>
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Content category
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {STUDIO_CONTENT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => void setCategory(c)}
                className={[
                  "rounded-md border px-2 py-1 text-[11px] transition-colors",
                  item.category === c
                    ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)] text-[var(--studio-text-primary)]"
                    : "border-[var(--studio-border)] text-[var(--studio-text-tertiary)] hover:border-[var(--studio-border-strong)]",
                ].join(" ")}
              >
                {STUDIO_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <CategoryBadge category={item.category} />
          </div>
        </section>
        <section className="rounded-[var(--studio-radius-md)] border border-dashed border-[var(--studio-border)] p-3">
          <h3 className="text-xs font-medium text-[var(--studio-text-secondary)]">AI insights</h3>
          <p className="mt-2 text-xs leading-relaxed text-[var(--studio-text-tertiary)]">
            Transcript, speaker, and engagement signals will appear here after the intelligence pipeline ships.
          </p>
        </section>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="w-full rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] px-3 py-2 text-sm text-[var(--studio-text-tertiary)] opacity-60"
        >
          Add to project — coming soon
        </button>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--studio-text-tertiary)]">{label}</dt>
      <dd className="text-right text-[var(--studio-text-secondary)]">{value}</dd>
    </div>
  );
}

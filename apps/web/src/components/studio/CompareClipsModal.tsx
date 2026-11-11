"use client";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { formatDuration } from "@/lib/studio/format";
import { mediaStreamUrl, mediaThumbnailUrl } from "@/lib/studio/client-api";

import { StudioVideoPlayer } from "./StudioVideoPlayer";

export function CompareClipsModal({
  items,
  onClose,
  onMarkSelected,
}: {
  items: StudioMediaPublic[];
  onClose: () => void;
  onMarkSelected: (id: string) => void;
}) {
  const pair = items.slice(0, 2);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="studio-panel max-h-[90vh] w-full max-w-5xl overflow-y-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Compare takes ({items.length})</h2>
          <button type="button" onClick={onClose} className="text-sm text-[var(--studio-text-tertiary)]">
            Esc to close
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {pair.map((item) => (
            <div key={item.id} className="space-y-3">
              <StudioVideoPlayer
                src={mediaStreamUrl(item.id)}
                poster={item.thumbnailKey ? mediaThumbnailUrl(item.id) : null}
                kind={item.kind}
              />
              <CompareMeta item={item} onMarkSelected={onMarkSelected} />
            </div>
          ))}
        </div>
        {items.length > 2 ? (
          <p className="mt-4 text-xs text-[var(--studio-text-tertiary)]">
            Showing first 2 of {items.length} selected. Refine selection to compare different pairs.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CompareMeta({
  item,
  onMarkSelected,
}: {
  item: StudioMediaPublic;
  onMarkSelected: (id: string) => void;
}) {
  return (
    <div className="rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] p-3 text-xs">
      <p className="font-medium text-[var(--studio-text-primary)]">{item.fileName}</p>
      <p className="mt-1 text-[var(--studio-text-tertiary)]">
        {formatDuration(item.durationSeconds)} · rating {item.rating ?? "—"} · {item.reviewStatus}
      </p>
      {item.notes ? <p className="mt-2 text-[var(--studio-text-secondary)]">{item.notes}</p> : null}
      <button
        type="button"
        className="mt-3 rounded-md bg-[var(--studio-accent-muted)] px-2 py-1 text-[var(--studio-accent)]"
        onClick={() => onMarkSelected(item.id)}
      >
        Mark as selected take
      </button>
    </div>
  );
}

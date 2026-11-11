"use client";

import { STUDIO_CATEGORY_LABELS, STUDIO_CONTENT_CATEGORIES, STUDIO_REVIEW_LABELS, STUDIO_REVIEW_STATUSES } from "@founder-os/studio";

export function BulkActionBar({
  count,
  onClear,
  onCategory,
  onReview,
  onFavorite,
  onAddCollection,
  onEditor,
}: {
  count: number;
  onClear: () => void;
  onCategory: (category: (typeof STUDIO_CONTENT_CATEGORIES)[number]) => void;
  onReview: (status: (typeof STUDIO_REVIEW_STATUSES)[number]) => void;
  onFavorite: (value: boolean) => void;
  onAddCollection: () => void;
  onEditor: () => void;
}) {
  if (count < 2) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-full border border-[var(--studio-border-strong)] bg-[var(--studio-bg-elevated)] px-4 py-2 shadow-2xl">
        <span className="text-xs font-medium text-[var(--studio-text-primary)]">{count} selected</span>
        <select
          className="rounded-full border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-2 py-1 text-[11px]"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) onCategory(v as (typeof STUDIO_CONTENT_CATEGORIES)[number]);
            e.target.value = "";
          }}
        >
          <option value="">Category…</option>
          {STUDIO_CONTENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {STUDIO_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <select
          className="rounded-full border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-2 py-1 text-[11px]"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (v) onReview(v as (typeof STUDIO_REVIEW_STATUSES)[number]);
            e.target.value = "";
          }}
        >
          <option value="">Review…</option>
          {STUDIO_REVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STUDIO_REVIEW_LABELS[s]}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => onFavorite(true)} className="text-[11px] text-[var(--studio-accent)]">
          Favorite
        </button>
        <button type="button" onClick={onAddCollection} className="text-[11px]">
          Collection
        </button>
        <button
          type="button"
          onClick={onEditor}
          className="rounded-full bg-[var(--studio-accent)] px-3 py-1 text-[11px] font-medium text-white"
        >
          Add to Video Editor
        </button>
        <button type="button" onClick={onClear} className="text-[11px] text-[var(--studio-text-tertiary)]">
          Clear
        </button>
      </div>
    </div>
  );
}

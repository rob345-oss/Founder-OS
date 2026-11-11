"use client";

import { useState } from "react";
import { ExternalLink, FolderOpen, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  STUDIO_CATEGORY_LABELS,
  STUDIO_CONTENT_CATEGORIES,
  STUDIO_DEFAULT_TAGS,
  STUDIO_REVIEW_LABELS,
  STUDIO_REVIEW_STATUSES,
  type StudioContentCategory,
  type StudioReviewStatus,
} from "@founder-os/studio";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import {
  createProject,
  mediaStreamUrl,
  mediaThumbnailUrl,
  patchMedia,
  persistEditorQueue,
  revealMediaInExplorer,
} from "@/lib/studio/client-api";
import { formatDuration, formatFileSize, formatRelativeTime } from "@/lib/studio/format";

import { CategoryBadge } from "./CategoryBadge";
import { StudioVideoPlayer } from "./StudioVideoPlayer";

export function MediaInspector({
  item,
  collapsed,
  onToggleCollapse,
  onPatched,
  onPrev,
  onNext,
}: {
  item: StudioMediaPublic | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPatched?: (item: StudioMediaPublic) => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const router = useRouter();
  const [tagInput, setTagInput] = useState("");
  const width = collapsed ? "w-10" : "w-[min(380px,34vw)]";

  if (collapsed) {
    return (
      <aside className={`flex h-full ${width} shrink-0 flex-col border-l border-[var(--studio-border)] bg-[var(--studio-bg-1)]`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="m-2 rounded p-2 text-xs text-[var(--studio-text-tertiary)] hover:bg-[var(--studio-bg-hover)]"
        >
          ◀
        </button>
      </aside>
    );
  }

  if (!item) {
    return (
      <aside className={`flex h-full ${width} shrink-0 flex-col border-l border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-6`}>
        <p className="text-sm text-[var(--studio-text-tertiary)]">Select a clip to inspect metadata and preview.</p>
      </aside>
    );
  }

  async function update(patch: Parameters<typeof patchMedia>[1]) {
    const { item: updated } = await patchMedia(item!.id, patch);
    onPatched?.(updated);
  }

  async function addToEditor() {
    persistEditorQueue([item!.id]);
    const { project } = await createProject(`Edit — ${item!.fileName}`, [item!.id]);
    router.push(`/studio/editor?projectId=${project.id}`);
  }

  return (
    <aside className={`flex h-full ${width} shrink-0 flex-col border-l border-[var(--studio-border)] bg-[var(--studio-bg-1)]`}>
      <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Inspector</h2>
          <p className="truncate text-[11px] text-[var(--studio-text-tertiary)]">{item.fileName}</p>
        </div>
        <button type="button" onClick={onToggleCollapse} className="text-xs text-[var(--studio-text-tertiary)]">
          ▶
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <StudioVideoPlayer
          src={item.missing ? null : mediaStreamUrl(item.id)}
          poster={item.thumbnailKey ? mediaThumbnailUrl(item.id) : null}
          kind={item.kind}
          onPrev={onPrev}
          onNext={onNext}
        />

        {item.missing ? (
          <p className="rounded-md border border-[var(--studio-danger)]/40 bg-[var(--studio-danger)]/10 px-3 py-2 text-xs text-[var(--studio-danger)]">
            Source file missing — reconnect the drive or rescan after moving files.
          </p>
        ) : null}

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Metadata
          </h3>
          <dl className="mt-2 space-y-1.5 text-xs">
            <Row label="Duration" value={formatDuration(item.durationSeconds)} />
            <Row label="Resolution" value={item.width && item.height ? `${item.width}×${item.height}` : "—"} />
            <Row label="Frame rate" value={item.frameRate ? `${item.frameRate} fps` : "—"} />
            <Row label="Codec" value={item.codec ?? "—"} />
            <Row label="Size" value={formatFileSize(item.fileSizeBytes)} />
            <Row label="Imported" value={formatRelativeTime(item.dateIndexed)} />
            <Row label="Modified" value={formatRelativeTime(item.dateModified)} />
            <Row label="Source" value={item.sourceHint} />
          </dl>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Category
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STUDIO_CONTENT_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => void update({ category: c as StudioContentCategory })}
                className={[
                  "rounded-md border px-2 py-1 text-[10px]",
                  item.category === c
                    ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)]"
                    : "border-[var(--studio-border)] text-[var(--studio-text-tertiary)]",
                ].join(" ")}
              >
                {STUDIO_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <CategoryBadge category={item.category} />
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Best take
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STUDIO_REVIEW_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void update({ reviewStatus: s as StudioReviewStatus })}
                className={[
                  "rounded-md border px-2 py-1 text-[10px]",
                  item.reviewStatus === s
                    ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)]"
                    : "border-[var(--studio-border)]",
                ].join(" ")}
              >
                {STUDIO_REVIEW_LABELS[s]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => void update({ rating: item.rating === n ? null : n })}
                className="rounded p-1 hover:bg-[var(--studio-bg-hover)]"
                aria-label={`Rate ${n}`}
              >
                <Star
                  className={`h-4 w-4 ${(item.rating ?? 0) >= n ? "fill-[var(--studio-warning)] text-[var(--studio-warning)]" : "text-[var(--studio-text-tertiary)]"}`}
                />
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Tags
          </h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags.map((t) => (
              <span key={t} className="rounded-full border border-[var(--studio-border)] px-2 py-0.5 text-[10px]">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <input
              list="studio-tag-suggestions"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag"
              className="min-w-0 flex-1 rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1 text-xs"
            />
            <datalist id="studio-tag-suggestions">
              {STUDIO_DEFAULT_TAGS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <button
              type="button"
              className="rounded-md border border-[var(--studio-border)] px-2 text-xs"
              onClick={() => {
                if (!tagInput.trim()) return;
                void update({ tags: [...new Set([...item.tags, tagInput.trim()])] });
                setTagInput("");
              }}
            >
              Add
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Notes
          </h3>
          <textarea
            defaultValue={item.notes}
            onBlur={(e) => {
              if (e.target.value !== item.notes) void update({ notes: e.target.value });
            }}
            rows={3}
            className="mt-2 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1.5 text-xs"
          />
        </section>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void update({ favorite: !item.favorite })}
            className="w-full rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] px-3 py-2 text-sm"
          >
            {item.favorite ? "Unfavorite" : "Favorite"}
          </button>
          <button
            type="button"
            onClick={() => void addToEditor()}
            className="w-full rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-3 py-2 text-sm font-medium text-white"
          >
            Add to Video Editor
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={item.missing}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-[var(--studio-border)] px-2 py-2 text-[11px] disabled:opacity-40"
              onClick={() => {
                void fetch(`/api/studio/media/${item.id}/stream`).then(() => window.open(mediaStreamUrl(item.id), "_blank"));
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </button>
            <button
              type="button"
              disabled={item.missing}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-[var(--studio-border)] px-2 py-2 text-[11px] disabled:opacity-40"
              title="Reveal in Explorer (local file only)"
              onClick={() => void revealMediaInExplorer(item.id)}
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Reveal
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[var(--studio-text-tertiary)]">{label}</dt>
      <dd className="text-right text-[var(--studio-text-secondary)]">{value}</dd>
    </div>
  );
}

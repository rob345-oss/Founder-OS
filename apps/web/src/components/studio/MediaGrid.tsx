"use client";

import { useMemo, useRef } from "react";
import Image from "next/image";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Heart, Star } from "lucide-react";

import { STUDIO_REVIEW_LABELS } from "@founder-os/studio";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { formatDuration } from "@/lib/studio/format";
import { mediaThumbnailUrl } from "@/lib/studio/client-api";

import { CategoryBadge } from "./CategoryBadge";

const COLS_BY_SIZE = { sm: 6, md: 5, lg: 4, xl: 3 } as const;

export function MediaGrid({
  items,
  selectedId,
  selectedIds,
  thumbSize = "md",
  onSelect,
  onToggleSelect,
  onOpen,
}: {
  items: StudioMediaPublic[];
  selectedId?: string | null;
  selectedIds?: Set<string>;
  thumbSize?: keyof typeof COLS_BY_SIZE;
  onSelect?: (item: StudioMediaPublic) => void;
  onToggleSelect?: (item: StudioMediaPublic, additive: boolean) => void;
  onOpen?: (item: StudioMediaPublic) => void;
}) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const cols = COLS_BY_SIZE[thumbSize];
  const rowCount = Math.ceil(items.length / cols);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (thumbSize === "sm" ? 148 : thumbSize === "lg" ? 220 : 188),
    overscan: 3,
  });

  const rows = useMemo(() => virtualizer.getVirtualItems(), [virtualizer, items.length, cols]);

  return (
    <div ref={parentRef} className="h-full min-h-[320px] overflow-y-auto pr-1">
      <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
        {rows.map((row) => {
          const start = row.index * cols;
          const slice = items.slice(start, start + cols);
          return (
            <div
              key={row.key}
              className="absolute left-0 top-0 grid w-full gap-3 px-0.5"
              style={{
                transform: `translateY(${row.start}px)`,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              }}
            >
              {slice.map((item) => (
                <MediaGridCard
                  key={item.id}
                  item={item}
                  selected={selectedId === item.id}
                  checked={selectedIds?.has(item.id)}
                  onSelect={() => onSelect?.(item)}
                  onToggleSelect={(additive) => onToggleSelect?.(item, additive)}
                  onDoubleOpen={() => onOpen?.(item)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MediaGridCard({
  item,
  selected,
  checked,
  onSelect,
  onToggleSelect,
  onDoubleOpen,
}: {
  item: StudioMediaPublic;
  selected: boolean;
  checked?: boolean;
  onSelect: () => void;
  onToggleSelect: (additive: boolean) => void;
  onDoubleOpen: () => void;
}) {
  const thumb = item.thumbnailKey ? mediaThumbnailUrl(item.id) : null;

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-[var(--studio-radius-lg)] border text-left transition-[border-color,box-shadow]",
        selected
          ? "border-[var(--studio-accent)] shadow-[0_0_0_1px_var(--studio-accent)]"
          : "border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]",
        item.missing ? "opacity-60" : "",
      ].join(" ")}
    >
      <button type="button" className="block w-full text-left" onClick={onSelect} onDoubleClick={onDoubleOpen}>
        <div className="relative aspect-[16/10] bg-black">
          {thumb ? (
            <Image src={thumb} alt="" fill unoptimized className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--studio-bg-3)] to-black" />
          )}
          {item.missing ? (
            <span className="absolute left-2 top-2 rounded bg-[var(--studio-danger)]/90 px-1.5 py-0.5 text-[9px] font-medium text-white">
              Missing
            </span>
          ) : null}
          {item.durationSeconds != null ? (
            <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-medium text-white">
              {formatDuration(item.durationSeconds)}
            </span>
          ) : null}
          {item.favorite ? (
            <Heart className="absolute left-2 top-2 h-3.5 w-3.5 fill-[var(--studio-danger)] text-[var(--studio-danger)]" />
          ) : null}
        </div>
        <div className="space-y-1.5 bg-[var(--studio-bg-2)] p-2.5">
          <p className="truncate text-xs font-medium text-[var(--studio-text-primary)]">{item.fileName}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={item.category} />
            {item.reviewStatus !== "unreviewed" ? (
              <span className="text-[9px] text-[var(--studio-text-tertiary)]">
                {STUDIO_REVIEW_LABELS[item.reviewStatus]}
              </span>
            ) : null}
            {item.rating ? (
              <span className="inline-flex items-center gap-0.5 text-[9px] text-[var(--studio-warning)]">
                <Star className="h-3 w-3 fill-current" />
                {item.rating}
              </span>
            ) : null}
          </div>
        </div>
      </button>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => {
          e.stopPropagation();
          onToggleSelect((e.nativeEvent as MouseEvent).shiftKey);
        }}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-2 top-2 h-4 w-4 rounded border-[var(--studio-border)] accent-[var(--studio-accent)] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ opacity: checked ? 1 : undefined }}
        aria-label={`Select ${item.fileName}`}
      />
    </article>
  );
}

export function MediaGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]"
        >
          <div className="aspect-[16/10] bg-[var(--studio-bg-3)]" />
          <div className="h-14 bg-[var(--studio-bg-2)]" />
        </div>
      ))}
    </div>
  );
}

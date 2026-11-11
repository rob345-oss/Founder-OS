"use client";

import { useState } from "react";
import Image from "next/image";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { formatDuration } from "@/lib/studio/format";
import { mediaStreamUrl, mediaThumbnailUrl } from "@/lib/studio/client-api";

import { CategoryBadge } from "./CategoryBadge";

export function MediaGrid({
  items,
  selectedId,
  onSelect,
}: {
  items: StudioMediaPublic[];
  selectedId?: string | null;
  onSelect?: (item: StudioMediaPublic) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((item) => (
        <MediaGridCard
          key={item.id}
          item={item}
          selected={selectedId === item.id}
          onSelect={() => onSelect?.(item)}
        />
      ))}
    </div>
  );
}

function MediaGridCard({
  item,
  selected,
  onSelect,
}: {
  item: StudioMediaPublic;
  selected: boolean;
  onSelect: () => void;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumb = item.thumbnailKey ? mediaThumbnailUrl(item.id) : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "group overflow-hidden rounded-[var(--studio-radius-lg)] border text-left transition-[border-color,box-shadow]",
        selected
          ? "border-[var(--studio-accent)] shadow-[0_0_0_1px_var(--studio-accent)]"
          : "border-[var(--studio-border)] hover:border-[var(--studio-border-strong)]",
      ].join(" ")}
    >
      <div className="relative aspect-[16/10] bg-black">
        {thumb && !thumbFailed ? (
          <Image
            src={thumb}
            alt=""
            fill
            unoptimized
            className="object-cover opacity-90 transition-opacity group-hover:opacity-100"
            onError={() => setThumbFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--studio-bg-3)] to-black" />
        )}
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {formatDuration(item.durationSeconds)}
        </span>
        <video
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity group-hover:opacity-100"
          muted
          playsInline
          preload="none"
          src={mediaStreamUrl(item.id)}
        />
      </div>
      <div className="space-y-2 bg-[var(--studio-bg-2)] p-3">
        <p className="truncate text-sm font-medium text-[var(--studio-text-primary)]">{item.fileName}</p>
        <div className="flex flex-wrap items-center gap-2">
          <CategoryBadge category={item.category} />
          <span className="text-[10px] text-[var(--studio-text-tertiary)]">
            {item.width && item.height ? `${item.width}×${item.height}` : "Unknown res"}
          </span>
        </div>
      </div>
    </button>
  );
}

export function MediaGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)]"
        >
          <div className="aspect-[16/10] bg-[var(--studio-bg-3)]" />
          <div className="h-16 bg-[var(--studio-bg-2)]" />
        </div>
      ))}
    </div>
  );
}

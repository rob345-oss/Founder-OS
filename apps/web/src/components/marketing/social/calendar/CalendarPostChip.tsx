"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { dateKeyFromIso, displayEventInstant, isPostDraggable, minutesFromMidnight } from "@/lib/marketing/social-calendar";
import type { SocialPostWithMetrics } from "@/lib/marketing/social-types";

import { PlatformMark, StatusPill, postScheduleLabel, postTitle } from "./calendar-shared";

type Props = {
  post: SocialPostWithMetrics;
  timeZone: string;
  selected: boolean;
  compact?: boolean;
  onSelect: (post: SocialPostWithMetrics) => void;
};

export function CalendarPostChip({ post, timeZone, selected, compact, onSelect }: Props) {
  const draggable = isPostDraggable(post.status);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: post.id,
    data: { post },
    disabled: !draggable,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.85 : 1, zIndex: isDragging ? 20 : undefined }
    : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(post);
      }}
      className={[
        "group w-full rounded-lg border px-2 py-1.5 text-left transition",
        selected ? "border-[var(--studio-accent)] bg-[var(--studio-bg-1)]" : "border-transparent bg-white/5 hover:border-[var(--studio-border)] hover:bg-[var(--studio-bg-1)]",
        draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        compact ? "py-1" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-1.5">
        <PlatformMark platform={post.platform} />
        <span className="text-[10px] tabular-nums text-[var(--studio-text-tertiary)]">{postScheduleLabel(post, timeZone)}</span>
      </div>
      <p className={["mt-0.5 font-medium text-[var(--studio-text-primary)]", compact ? "line-clamp-1 text-[11px]" : "line-clamp-2 text-xs"].join(" ")}>
        {postTitle(post)}
      </p>
      {!compact ? (
        <div className="mt-1">
          <StatusPill status={post.status} />
        </div>
      ) : null}
    </button>
  );
}

export function postDragMinutes(post: SocialPostWithMetrics, timeZone: string): number {
  const instant = displayEventInstant(post);
  if (!instant) return 9 * 60;
  return minutesFromMidnight(instant, timeZone);
}

export function postDragDateKey(post: SocialPostWithMetrics, timeZone: string): string | null {
  const instant = displayEventInstant(post);
  if (!instant) return null;
  return dateKeyFromIso(instant, timeZone);
}
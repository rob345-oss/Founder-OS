"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import type { SocialPostStatus, SocialPostWithMetrics } from "@/lib/marketing/social-types";
import { isPostDraggable } from "@/lib/marketing/social-calendar";

import { PlatformMark, STATUS_LABELS, postTitle } from "./calendar-shared";

const PIPELINE: SocialPostStatus[] = ["idea", "draft", "in_review", "approved", "scheduled", "published"];

function PipelineCard({ post, onSelect }: { post: SocialPostWithMetrics; onSelect: (p: SocialPostWithMetrics) => void }) {
  const canDrag = isPostDraggable(post.status) && !post.scheduledAt;
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pipeline:${post.id}`,
    data: { post, fromPipeline: true },
    disabled: !canDrag,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.8 : 1 } : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      onClick={() => onSelect(post)}
      className="w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-2 text-left hover:border-[var(--studio-accent)]/40"
    >
      <div className="flex items-center gap-1.5">
        <PlatformMark platform={post.platform} />
        <span className="line-clamp-1 text-xs font-medium text-[var(--studio-text-primary)]">{postTitle(post)}</span>
      </div>
    </button>
  );
}

export function CalendarPipeline({
  open,
  onToggle,
  unscheduled,
  onSelect,
}: {
  open: boolean;
  onToggle: () => void;
  unscheduled: SocialPostWithMetrics[];
  onSelect: (p: SocialPostWithMetrics) => void;
}) {
  const byStatus = new Map<SocialPostStatus, SocialPostWithMetrics[]>();
  for (const s of PIPELINE) byStatus.set(s, []);
  for (const p of unscheduled) {
    const list = byStatus.get(p.status) ?? [];
    list.push(p);
    byStatus.set(p.status, list);
  }

  return (
    <section className="rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--studio-text-primary)]"
      >
        Content pipeline
        <span className="text-xs text-[var(--studio-text-tertiary)]">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="grid gap-3 border-t border-[var(--studio-border)] p-4 md:grid-cols-3 lg:grid-cols-6">
          {PIPELINE.map((status) => (
            <div key={status}>
              <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--studio-text-tertiary)]">
                {STATUS_LABELS[status]}
              </h4>
              <div className="space-y-2">
                {(byStatus.get(status) ?? []).slice(0, 8).map((p) => (
                  <PipelineCard key={p.id} post={p} onSelect={onSelect} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {open && unscheduled.length === 0 ? (
        <p className="border-t border-[var(--studio-border)] px-4 py-3 text-xs text-[var(--studio-text-tertiary)]">
          Unscheduled drafts will appear here — drag them onto a calendar day.
        </p>
      ) : null}
    </section>
  );
}
"use client";

import { useDroppable } from "@dnd-kit/core";

import { buildMonthGrid } from "@/lib/marketing/social-calendar";
import { dateKeyFromIso, displayEventInstant } from "@/lib/marketing/social-calendar";
import type { SocialPostWithMetrics } from "@/lib/marketing/social-types";

import { CalendarPostChip } from "./CalendarPostChip";
import { WEEKDAY_LABELS } from "./calendar-shared";

const MAX_VISIBLE = 3;

function DayCell({
  dateKey,
  inMonth,
  isToday,
  posts,
  timeZone,
  selectedId,
  onSelect,
  onCreate,
}: {
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  posts: SocialPostWithMetrics[];
  timeZone: string;
  selectedId: string | null;
  onSelect: (p: SocialPostWithMetrics) => void;
  onCreate: (dateKey: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `day:${dateKey}`, data: { dateKey, kind: "day" as const } });
  const sorted = [...posts].sort((a, b) => (displayEventInstant(a) ?? "").localeCompare(displayEventInstant(b) ?? ""));
  const visible = sorted.slice(0, MAX_VISIBLE);
  const more = sorted.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      onClick={() => onCreate(dateKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onCreate(dateKey);
        }
      }}
      className={[
        "min-h-[112px] border-b border-r border-[var(--studio-border)] p-2 transition",
        inMonth ? "bg-[var(--studio-bg-2)]" : "bg-[var(--studio-bg-1)]/60",
        isToday ? "ring-1 ring-inset ring-[var(--studio-accent)]/60" : "",
        isOver ? "bg-[var(--studio-accent)]/10" : "",
      ].join(" ")}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={[
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
            isToday ? "bg-[var(--studio-accent)] text-white" : "text-[var(--studio-text-secondary)]",
          ].join(" ")}
        >
          {Number(dateKey.split("-")[2])}
        </span>
      </div>
      <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
        {visible.map((p) => (
          <CalendarPostChip
            key={p.id}
            post={p}
            timeZone={timeZone}
            selected={selectedId === p.id}
            compact
            onSelect={onSelect}
          />
        ))}
        {more > 0 ? (
          <button
            type="button"
            className="w-full rounded-md px-1 py-0.5 text-left text-[10px] text-[var(--studio-text-tertiary)] hover:bg-[var(--studio-bg-1)]"
            onClick={() => onSelect(sorted[MAX_VISIBLE]!)}
          >
            +{more} more
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function CalendarMonthView({
  anchor,
  timeZone,
  posts,
  selectedId,
  onSelect,
  onCreate,
}: {
  anchor: Date;
  timeZone: string;
  posts: SocialPostWithMetrics[];
  selectedId: string | null;
  onSelect: (p: SocialPostWithMetrics) => void;
  onCreate: (dateKey: string) => void;
}) {
  const grid = buildMonthGrid(anchor, timeZone);
  const byDay = new Map<string, SocialPostWithMetrics[]>();
  for (const p of posts) {
    const instant = displayEventInstant(p);
    if (!instant) continue;
    const key = dateKeyFromIso(instant, timeZone);
    const list = byDay.get(key) ?? [];
    list.push(p);
    byDay.set(key, list);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-sm">
      <div className="grid grid-cols-7 border-b border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-[var(--studio-text-tertiary)]">
            {d}
          </div>
        ))}
      </div>
      {grid.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7">
          {row.map((cell) => (
            <DayCell
              key={cell.dateKey}
              dateKey={cell.dateKey}
              inMonth={cell.inCurrentMonth}
              isToday={cell.isToday}
              posts={byDay.get(cell.dateKey) ?? []}
              timeZone={timeZone}
              selectedId={selectedId}
              onSelect={onSelect}
              onCreate={onCreate}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
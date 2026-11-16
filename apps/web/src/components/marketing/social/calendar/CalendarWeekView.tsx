"use client";

import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";

import {
  dateKeyFromIso,
  displayEventInstant,
  minutesFromMidnight,
  weekDayKeys,
} from "@/lib/marketing/social-calendar";
import type { SocialPostWithMetrics } from "@/lib/marketing/social-types";

import { CalendarPostChip } from "./CalendarPostChip";
import { WEEKDAY_LABELS } from "./calendar-shared";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_PX = 48;

function HourSlot({
  dateKey,
  hour,
  children,
}: {
  dateKey: string;
  hour: number;
  children: ReactNode;
}) {
  const minute = hour * 60;
  const { isOver, setNodeRef } = useDroppable({
    id: `slot:${dateKey}:${minute}`,
    data: { dateKey, kind: "slot" as const, minutes: minute },
  });
  return (
    <div
      ref={setNodeRef}
      className={["border-b border-[var(--studio-border)]/40", isOver ? "bg-[var(--studio-accent)]/10" : ""].join(" ")}
      style={{ height: HOUR_PX }}
    >
      {children}
    </div>
  );
}

export function CalendarWeekView({
  weekStartKey,
  timeZone,
  posts,
  selectedId,
  onSelect,
  onCreate,
  now,
}: {
  weekStartKey: string;
  timeZone: string;
  posts: SocialPostWithMetrics[];
  selectedId: string | null;
  onSelect: (p: SocialPostWithMetrics) => void;
  onCreate: (dateKey: string, minutes?: number) => void;
  now: Date;
}) {
  const days = weekDayKeys(weekStartKey);
  const todayKey = dateKeyFromIso(now.toISOString(), timeZone);
  const nowMin = minutesFromMidnight(now.toISOString(), timeZone);

  const byDayHour = new Map<string, SocialPostWithMetrics[]>();
  for (const p of posts) {
    const instant = displayEventInstant(p);
    if (!instant) continue;
    const dk = dateKeyFromIso(instant, timeZone);
    const hour = Math.floor(minutesFromMidnight(instant, timeZone) / 60);
    const key = `${dk}:${hour}`;
    const list = byDayHour.get(key) ?? [];
    list.push(p);
    byDayHour.set(key, list);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)]">
      <div className="grid min-w-[800px] grid-cols-[4rem_repeat(7,minmax(0,1fr))] border-b border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
        <div />
        {days.map((dk, i) => (
          <button
            key={dk}
            type="button"
            onClick={() => onCreate(dk, 9 * 60)}
            className={[
              "border-l border-[var(--studio-border)] px-2 py-2 text-center hover:bg-[var(--studio-bg-2)]",
              dk === todayKey ? "bg-[var(--studio-accent)]/10" : "",
            ].join(" ")}
          >
            <p className="text-[10px] uppercase text-[var(--studio-text-tertiary)]">{WEEKDAY_LABELS[i]}</p>
            <p className="text-sm font-semibold text-[var(--studio-text-primary)]">{Number(dk.split("-")[2])}</p>
          </button>
        ))}
      </div>
      <div className="grid min-w-[800px] grid-cols-[4rem_repeat(7,minmax(0,1fr))]">
        <div className="border-r border-[var(--studio-border)]">
          {HOURS.map((h) => (
            <div
              key={h}
              className="border-b border-[var(--studio-border)]/40 pr-2 text-right text-[10px] text-[var(--studio-text-tertiary)]"
              style={{ height: HOUR_PX, lineHeight: `${HOUR_PX}px` }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        {days.map((dk) => (
          <div key={dk} className="relative border-r border-[var(--studio-border)]">
            {HOURS.map((h) => (
              <HourSlot key={h} dateKey={dk} hour={h}>
                <div className="space-y-0.5 px-1 pt-0.5">
                  {(byDayHour.get(`${dk}:${h}`) ?? []).map((p) => (
                    <CalendarPostChip
                      key={p.id}
                      post={p}
                      timeZone={timeZone}
                      selected={selectedId === p.id}
                      compact
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </HourSlot>
            ))}
            {dk === todayKey ? (
              <div
                className="pointer-events-none absolute left-0 right-0 z-10 border-t-2 border-red-400/90"
                style={{ top: (nowMin / 60) * HOUR_PX }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
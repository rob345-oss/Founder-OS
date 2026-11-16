"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { SocialPublishBanner } from "@/components/marketing/social/SocialPublishBanner";
import { useMarketingSession } from "@/components/marketing/useMarketingSession";
import {
  fetchMarketingCampaigns,
  fetchSocialOverview,
  fetchSocialPosts,
  updateSocialPostApi,
} from "@/lib/marketing/client-api";
import {
  DEFAULT_SOCIAL_CALENDAR_TZ,
  addDaysToDateKey,
  addMonthsToAnchor,
  dateKeyFromIso,
  displayEventInstant,
  formatMonthYear,
  formatWeekRange,
  minutesFromMidnight,
  rangeForMonthView,
  rangeForWeekView,
  rescheduleKeepingLocalTime,
  todayDateKey,
  type CalendarViewMode,
  weekStartKeyForDateKey,
  zonedLocalToUtc,
} from "@/lib/marketing/social-calendar";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS, SOCIAL_POST_STATUSES, type SocialPostWithMetrics } from "@/lib/marketing/social-types";
import type { MarketingCampaign } from "@/lib/marketing/types";

import { CalendarCreateSheet } from "./CalendarCreateSheet";
import { CalendarInspector } from "./CalendarInspector";
import { CalendarListView } from "./CalendarListView";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarPipeline } from "./CalendarPipeline";
import { CalendarWeekView } from "./CalendarWeekView";
import { PlatformMark, postTitle } from "./calendar-shared";

export function ContentCalendarWorkspace() {
  const { token } = useMarketingSession();
  const [timeZone] = useState(DEFAULT_SOCIAL_CALENDAR_TZ);
  const [view, setView] = useState<CalendarViewMode>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [posts, setPosts] = useState<SocialPostWithMetrics[]>([]);
  const [unscheduled, setUnscheduled] = useState<SocialPostWithMetrics[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [selected, setSelected] = useState<SocialPostWithMetrics | null>(null);
  const [platform, setPlatform] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [publishArmed, setPublishArmed] = useState(false);
  const [pipelineOpen, setPipelineOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(todayDateKey(timeZone));
  const [createTime, setCreateTime] = useState("09:00");
  const [dragPost, setDragPost] = useState<SocialPostWithMetrics | null>(null);
  const [now, setNow] = useState(() => new Date());

  const weekStartKey = useMemo(
    () => weekStartKeyForDateKey(dateKeyFromIso(anchor.toISOString(), timeZone), timeZone),
    [anchor, timeZone],
  );

  const range = useMemo(() => {
    if (view === "week") return rangeForWeekView(weekStartKey, timeZone);
    return rangeForMonthView(anchor, timeZone);
  }, [anchor, timeZone, view, weekStartKey]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rangeItems, tray, camps, overview] = await Promise.all([
        fetchSocialPosts(token, {
          rangeFrom: range.from,
          rangeTo: range.to,
          platform: platform || undefined,
          campaignId: campaignId || undefined,
          status: statusFilter || undefined,
          q: search.trim() || undefined,
          limit: 300,
        }),
        fetchSocialPosts(token, { unscheduled: true, limit: 120 }),
        fetchMarketingCampaigns(token),
        fetchSocialOverview(token, { preset: "30d" }),
      ]);
      setPosts(rangeItems);
      setUnscheduled(tray);
      setCampaigns(camps);
      setPublishArmed(overview.publishArmed);
      setSelected((sel) => {
        if (!sel) return sel;
        return [...rangeItems, ...tray].find((p) => p.id === sel.id) ?? sel;
      });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [token, range.from, range.to, platform, campaignId, statusFilter, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "m") setView("month");
      if (e.key === "w") setView("week");
      if (e.key === "l") setView("list");
      if (e.key === "t") setAnchor(new Date());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3200);
  }

  function mergePost(updated: SocialPostWithMetrics) {
    setPosts((prev) => {
      const i = prev.findIndex((p) => p.id === updated.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = updated;
        return next;
      }
      return prev;
    });
    setUnscheduled((prev) => {
      const i = prev.findIndex((p) => p.id === updated.id);
      if (updated.scheduledAt) return prev.filter((p) => p.id !== updated.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = updated;
        return next;
      }
      return [...prev, updated];
    });
    setSelected(updated);
  }

  async function reschedule(post: SocialPostWithMetrics, dateKey: string, minutes?: number) {
    if (!token) return;
    const prev = [...posts];
    const instant = displayEventInstant(post);
    const iso = instant
      ? rescheduleKeepingLocalTime(instant, dateKey, timeZone, minutes)
      : zonedLocalToUtc(`${dateKey}T${String(Math.floor((minutes ?? 9 * 60) / 60)).padStart(2, "0")}:${String((minutes ?? 9 * 60) % 60).padStart(2, "0")}`, timeZone).toISOString();
    setPosts((p) => p.map((x) => (x.id === post.id ? { ...x, scheduledAt: iso, status: "scheduled" } : x)));
    try {
      const updated = await updateSocialPostApi(token, post.id, {
        scheduledAt: iso,
        status: "scheduled",
        expectedUpdatedAt: post.updatedAt,
      });
      mergePost(updated);
      showToast("Rescheduled");
      void load();
    } catch (e) {
      setPosts(prev);
      showToast(e instanceof Error ? e.message : "Reschedule failed");
    }
  }

  function onDragStart(ev: DragStartEvent) {
    const post = ev.active.data.current?.post as SocialPostWithMetrics | undefined;
    if (post) setDragPost(post);
  }

  async function onDragEnd(ev: DragEndEvent) {
    setDragPost(null);
    const post = ev.active.data.current?.post as SocialPostWithMetrics | undefined;
    const over = ev.over?.data.current as { dateKey?: string; minutes?: number; kind?: string } | undefined;
    if (!post || !over?.dateKey) return;
    const mins = over.minutes ?? (post.scheduledAt ? minutesFromMidnight(displayEventInstant(post)!, timeZone) : 9 * 60);
    await reschedule(post, over.dateKey, mins);
  }

  function openCreate(dateKey: string, minutes = 9 * 60) {
    setCreateDate(dateKey);
    setCreateTime(`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`);
    setCreateOpen(true);
  }

  const headerTitle = view === "week" ? formatWeekRange(weekStartKey, timeZone) : formatMonthYear(anchor, timeZone);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={(e) => void onDragEnd(e)}>
      <div className="space-y-4">
        <SocialPublishBanner armed={publishArmed} />
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--studio-text-tertiary)]">Content calendar</p>
            <h2 className="text-lg font-semibold text-[var(--studio-text-primary)]">{headerTitle}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (view === "week") {
                  const prev = addDaysToDateKey(weekStartKey, -7);
                  setAnchor(zonedLocalToUtc(`${prev}T12:00`, timeZone));
                } else {
                  setAnchor((d) => addMonthsToAnchor(d, -1));
                }
              }}
              className="rounded-lg border border-[var(--studio-border)] px-2 py-1.5 text-xs"
            >
              Prev
            </button>
            <button type="button" onClick={() => setAnchor(new Date())} className="rounded-lg border border-[var(--studio-border)] px-2 py-1.5 text-xs">
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                if (view === "week") {
                  const next = addDaysToDateKey(weekStartKey, 7);
                  setAnchor(zonedLocalToUtc(`${next}T12:00`, timeZone));
                } else {
                  setAnchor((d) => addMonthsToAnchor(d, 1));
                }
              }}
              className="rounded-lg border border-[var(--studio-border)] px-2 py-1.5 text-xs"
            >
              Next
            </button>
            <ViewModeToggle view={view} setView={setView} />
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-1.5 text-xs">
              <option value="">All platforms</option>
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {SOCIAL_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="max-w-[140px] rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-1.5 text-xs">
              <option value="">All campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-1.5 text-xs">
              <option value="">All statuses</option>
              {SOCIAL_POST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search"
              className="w-28 rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => openCreate(todayDateKey(timeZone))}
              className="rounded-lg bg-[var(--studio-accent)] px-3 py-1.5 text-xs font-medium text-white"
            >
              Create post
            </button>
            <Link href="/marketing/social/create" className="rounded-lg border border-[var(--studio-border)] px-3 py-1.5 text-xs">
              Full editor
            </Link>
          </div>
        </div>

        <CalendarPipeline open={pipelineOpen} onToggle={() => setPipelineOpen((v) => !v)} unscheduled={unscheduled} onSelect={setSelected} />

        <div className="flex min-h-[520px] gap-0 overflow-hidden rounded-xl border border-[var(--studio-border)]">
          <div className="min-w-0 flex-1 p-3 md:p-4">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-64 rounded-lg bg-[var(--studio-bg-1)]" />
              </div>
            ) : view === "month" ? (
              <CalendarMonthView
                anchor={anchor}
                timeZone={timeZone}
                posts={posts}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
                onCreate={openCreate}
              />
            ) : view === "week" ? (
              <CalendarWeekView
                weekStartKey={weekStartKey}
                timeZone={timeZone}
                posts={posts}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
                onCreate={openCreate}
                now={now}
              />
            ) : (
              <CalendarListView
                posts={posts}
                campaigns={campaigns}
                timeZone={timeZone}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
              />
            )}
            {!loading && posts.length === 0 && view !== "list" ? (
              <p className="mt-4 text-center text-sm text-[var(--studio-text-tertiary)]">Your content calendar starts here.</p>
            ) : null}
          </div>
          {selected ? (
            <CalendarInspector
              token={token}
              post={selected}
              campaigns={campaigns}
              timeZone={timeZone}
              onClose={() => setSelected(null)}
              onUpdated={mergePost}
              onDeleted={(id) => {
                setPosts((p) => p.filter((x) => x.id !== id));
                setUnscheduled((p) => p.filter((x) => x.id !== id));
                setSelected(null);
              }}
              onDuplicated={(p) => {
                mergePost(p);
                showToast("Duplicated");
              }}
            />
          ) : null}
        </div>
      </div>

      <CalendarCreateSheet
        token={token}
        open={createOpen}
        dateKey={createDate}
        timeHm={createTime}
        timeZone={timeZone}
        campaigns={campaigns}
        onClose={() => setCreateOpen(false)}
        onCreated={(p) => {
          mergePost(p);
          showToast("Post created");
          void load();
        }}
      />

      <DragOverlay>
        {dragPost ? (
          <div className="w-48 rounded-lg border border-[var(--studio-accent)] bg-[var(--studio-bg-2)] p-2 shadow-lg">
            <PlatformMark platform={dragPost.platform} />
            <p className="mt-1 text-xs font-medium">{postTitle(dragPost)}</p>
          </div>
        ) : null}
      </DragOverlay>

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2 text-sm shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </DndContext>
  );
}

function ViewModeToggle({ view, setView }: { view: CalendarViewMode; setView: (v: CalendarViewMode) => void }) {
  return (
    <div className="flex rounded-lg border border-[var(--studio-border)] p-0.5">
      {(["month", "week", "list"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => setView(v)}
          className={[
            "rounded-md px-2.5 py-1 text-xs capitalize",
            view === v ? "bg-[var(--studio-bg-1)] text-[var(--studio-text-primary)]" : "text-[var(--studio-text-tertiary)]",
          ].join(" ")}
        >
          {v}
        </button>
      ))}
    </div>
  );
}
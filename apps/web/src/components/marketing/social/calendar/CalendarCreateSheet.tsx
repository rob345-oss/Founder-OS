"use client";

import Link from "next/link";
import { useState } from "react";

import { createSocialPost } from "@/lib/marketing/client-api";
import { zonedLocalToUtc } from "@/lib/marketing/social-calendar";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABELS, type SocialPostWithMetrics } from "@/lib/marketing/social-types";
import type { MarketingCampaign } from "@/lib/marketing/types";

type Props = {
  token: string | null;
  open: boolean;
  dateKey: string;
  timeHm: string;
  timeZone: string;
  campaigns: MarketingCampaign[];
  onClose: () => void;
  onCreated: (post: SocialPostWithMetrics) => void;
};

export function CalendarCreateSheet({
  token,
  open,
  dateKey,
  timeHm,
  timeZone,
  campaigns,
  onClose,
  onCreated,
}: Props) {
  const [platform, setPlatform] = useState<(typeof SOCIAL_PLATFORMS)[number]>("linkedin");
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [scheduleTime, setScheduleTime] = useState(timeHm);
  const [scheduleDate, setScheduleDate] = useState(dateKey);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  if (!open) return null;

  async function submit(mode: "draft" | "scheduled") {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const scheduledAt =
        mode === "scheduled"
          ? zonedLocalToUtc(`${scheduleDate}T${scheduleTime}`, timeZone).toISOString()
          : null;
      const post = await createSocialPost(token, {
        platform,
        internalLabel: label || null,
        bodyText: body,
        campaignId: campaignId || null,
        status: mode === "scheduled" ? "scheduled" : "draft",
        scheduledAt,
      });
      setLastId(post.id);
      onCreated(post);
      if (mode === "draft") onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center" role="dialog" aria-modal>
      <article className="w-full max-w-lg rounded-2xl border border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-2xl">
        <header className="flex items-center justify-between border-b border-[var(--studio-border)] px-5 py-4">
          <h2 className="text-base font-semibold text-[var(--studio-text-primary)]">New post</h2>
          <button type="button" onClick={onClose} className="text-xs text-[var(--studio-text-tertiary)]">
            Close
          </button>
        </header>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Platform
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as (typeof SOCIAL_PLATFORMS)[number])}
              className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {SOCIAL_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Title
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Caption
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-[var(--studio-text-tertiary)]">
            Campaign
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
            >
              <option value="">No campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-[var(--studio-text-tertiary)]">
              Date
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-[var(--studio-text-tertiary)]">
              Time ({timeZone})
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm"
              />
            </label>
          </div>
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </div>
        <footer className="flex flex-wrap gap-2 border-t border-[var(--studio-border)] px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit("draft")}
            className="rounded-lg border border-[var(--studio-border)] px-3 py-2 text-xs"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit("scheduled")}
            className="rounded-lg bg-[var(--studio-accent)] px-3 py-2 text-xs font-medium text-white"
          >
            Add to calendar
          </button>
          {lastId ? (
            <Link href={`/marketing/social/posts/${lastId}`} className="rounded-lg px-3 py-2 text-xs text-[var(--studio-accent)]">
              Open full editor
            </Link>
          ) : null}
        </footer>
      </article>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  deleteSocialPostApi,
  duplicateSocialPostApi,
  updateSocialPostApi,
} from "@/lib/marketing/client-api";
import { DEFAULT_SOCIAL_CALENDAR_TZ, utcToZonedLocalFields } from "@/lib/marketing/social-calendar";
import { SOCIAL_PLATFORM_LABELS, type SocialPostWithMetrics } from "@/lib/marketing/social-types";
import type { MarketingCampaign } from "@/lib/marketing/types";

import { PlatformMark, StatusPill, postTitle } from "./calendar-shared";

type Props = {
  token: string | null;
  post: SocialPostWithMetrics;
  campaigns: MarketingCampaign[];
  timeZone: string;
  onClose: () => void;
  onUpdated: (post: SocialPostWithMetrics) => void;
  onDeleted: (id: string) => void;
  onDuplicated: (post: SocialPostWithMetrics) => void;
};

export function CalendarInspector({
  token,
  post,
  campaigns,
  timeZone,
  onClose,
  onUpdated,
  onDeleted,
  onDuplicated,
}: Props) {
  const [label, setLabel] = useState(post.internalLabel ?? "");
  const [body, setBody] = useState(post.bodyText);
  const [campaignId, setCampaignId] = useState(post.campaignId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLabel(post.internalLabel ?? "");
    setBody(post.bodyText);
    setCampaignId(post.campaignId ?? "");
    setMessage(null);
  }, [post]);

  const zoned = post.scheduledAt ? utcToZonedLocalFields(post.scheduledAt, timeZone) : null;

  async function saveInline() {
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      const updated = await updateSocialPostApi(token, post.id, {
        internalLabel: label || null,
        bodyText: body,
        campaignId: campaignId || null,
        expectedUpdatedAt: post.updatedAt,
      });
      onUpdated(updated);
      setMessage("Saved");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function toDraft() {
    if (!token) return;
    setBusy(true);
    try {
      const updated = await updateSocialPostApi(token, post.id, {
        status: "draft",
        scheduledAt: null,
        expectedUpdatedAt: post.updatedAt,
      });
      onUpdated(updated);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!token) return;
    setBusy(true);
    try {
      const updated = await updateSocialPostApi(token, post.id, {
        status: "approved",
        expectedUpdatedAt: post.updatedAt,
      });
      onUpdated(updated);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDuplicate() {
    if (!token) return;
    setBusy(true);
    try {
      const dup = await duplicateSocialPostApi(token, post.id);
      onDuplicated(dup);
      setMessage("Duplicated");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Duplicate failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!token) return;
    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteSocialPostApi(token, post.id);
      onDeleted(post.id);
      onClose();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside
      className="flex h-full w-full max-w-md flex-col border-l border-[var(--studio-border)] bg-[var(--studio-bg-2)] shadow-[-8px_0_32px_rgba(0,0,0,0.12)]"
      role="dialog"
      aria-label="Post details"
    >
      <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--studio-text-primary)]">Post details</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-[var(--studio-text-tertiary)] hover:bg-[var(--studio-bg-1)]"
        >
          Close
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="flex items-center gap-2">
          <PlatformMark platform={post.platform} />
          <span className="text-xs text-[var(--studio-text-secondary)]">{SOCIAL_PLATFORM_LABELS[post.platform]}</span>
          <StatusPill status={post.status} />
        </div>
        <label className="block text-xs text-[var(--studio-text-tertiary)]">
          Title
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => void saveInline()}
            className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm text-[var(--studio-text-primary)]"
          />
        </label>
        <label className="block text-xs text-[var(--studio-text-tertiary)]">
          Caption
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={() => void saveInline()}
            rows={6}
            className="mt-1 w-full rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] px-3 py-2 text-sm leading-relaxed text-[var(--studio-text-primary)]"
          />
        </label>
        <label className="block text-xs text-[var(--studio-text-tertiary)]">
          Campaign
          <select
            value={campaignId}
            onChange={(e) => {
              setCampaignId(e.target.value);
              void (async () => {
                if (!token) return;
                try {
                  const updated = await updateSocialPostApi(token, post.id, {
                    campaignId: e.target.value || null,
                    expectedUpdatedAt: post.updatedAt,
                  });
                  onUpdated(updated);
                } catch {
                  /* noop */
                }
              })();
            }}
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
        <dl className="grid gap-2 text-xs text-[var(--studio-text-secondary)]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--studio-text-tertiary)]">Scheduled</dt>
            <dd>{zoned ? `${zoned.dateKey} · ${zoned.time}` : "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--studio-text-tertiary)]">Timezone</dt>
            <dd>{timeZone}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--studio-text-tertiary)]">External publish</dt>
            <dd className="text-right">{post.externalPublishState.replaceAll("_", " ")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--studio-text-tertiary)]">Last edited</dt>
            <dd>{new Date(post.updatedAt).toLocaleString()}</dd>
          </div>
        </dl>
        <div className="rounded-lg border border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-3 text-sm text-[var(--studio-text-secondary)]">
          <p className="font-medium text-[var(--studio-text-primary)]">{postTitle(post)}</p>
          <p className="mt-2 line-clamp-6 whitespace-pre-wrap text-xs leading-relaxed">{post.bodyText || "No caption yet."}</p>
        </div>
        {message ? <p className="text-xs text-[var(--studio-text-tertiary)]">{message}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-[var(--studio-border)] p-4">
        <Link
          href={`/marketing/social/posts/${post.id}`}
          className="rounded-lg bg-[var(--studio-accent)] px-3 py-2 text-xs font-medium text-white hover:opacity-90"
        >
          Open full editor
        </Link>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onDuplicate()}
          className="rounded-lg border border-[var(--studio-border)] px-3 py-2 text-xs"
        >
          Duplicate
        </button>
        {post.status === "in_review" ? (
          <button type="button" disabled={busy} onClick={() => void approve()} className="rounded-lg border border-[var(--studio-border)] px-3 py-2 text-xs">
            Approve
          </button>
        ) : null}
        {post.status !== "draft" && post.status !== "published" ? (
          <button type="button" disabled={busy} onClick={() => void toDraft()} className="rounded-lg border border-[var(--studio-border)] px-3 py-2 text-xs">
            Move to drafts
          </button>
        ) : null}
        {["idea", "draft", "in_review", "approved", "failed", "canceled"].includes(post.status) ? (
          <button type="button" disabled={busy} onClick={() => void onDelete()} className="rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-950/30">
            Delete draft
          </button>
        ) : null}
      </div>
    </aside>
  );
}

export { DEFAULT_SOCIAL_CALENDAR_TZ };
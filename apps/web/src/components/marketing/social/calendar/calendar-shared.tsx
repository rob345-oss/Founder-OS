"use client";

import type { SocialPlatformId, SocialPostStatus, SocialPostWithMetrics } from "@/lib/marketing/social-types";
import { SOCIAL_PLATFORM_LABELS } from "@/lib/marketing/social-types";
import { displayEventInstant, formatTimeHm } from "@/lib/marketing/social-calendar";

export const STATUS_LABELS: Record<SocialPostStatus, string> = {
  idea: "Idea",
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  canceled: "Canceled",
};

export function postTitle(post: SocialPostWithMetrics): string {
  return post.internalLabel?.trim() || post.bodyText.trim().slice(0, 80) || "Untitled post";
}

export function postScheduleLabel(post: SocialPostWithMetrics, timeZone: string): string {
  const instant = displayEventInstant(post);
  if (!instant) return "Unscheduled";
  return formatTimeHm(instant, timeZone);
}

const PLATFORM_DOT: Record<SocialPlatformId, string> = {
  linkedin: "bg-[#0A66C2]",
  instagram: "bg-gradient-to-br from-[#F58529] to-[#DD2A7B]",
  facebook: "bg-[#1877F2]",
  youtube: "bg-[#FF0000]",
  tiktok: "bg-[#010101]",
  x: "bg-[#14171A]",
};

export function PlatformMark({ platform, className = "" }: { platform: SocialPlatformId; className?: string }) {
  return (
    <span
      className={["inline-block h-2 w-2 shrink-0 rounded-full", PLATFORM_DOT[platform], className].join(" ")}
      title={SOCIAL_PLATFORM_LABELS[platform]}
      aria-hidden
    />
  );
}

export function StatusPill({ status }: { status: SocialPostStatus }) {
  const tone =
    status === "published"
      ? "bg-emerald-500/15 text-emerald-200"
      : status === "scheduled"
        ? "bg-sky-500/15 text-sky-200"
        : status === "approved"
          ? "bg-violet-500/15 text-violet-200"
          : status === "in_review"
            ? "bg-amber-500/15 text-amber-100"
            : "bg-[var(--studio-bg-1)] text-[var(--studio-text-tertiary)]";
  return (
    <span className={["rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", tone].join(" ")}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
import Link from "next/link";

import type { StudioProject } from "@founder-os/studio";

import { formatRelativeTime } from "@/lib/studio/format";

const PLATFORM_LABEL: Record<StudioProject["targetPlatform"], string> = {
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  youtube_shorts: "YouTube Shorts",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  custom: "Custom",
};

const STATUS_LABEL: Record<StudioProject["status"], string> = {
  draft: "Draft",
  editing: "Editing",
  review: "Review",
  ready: "Ready",
  exported: "Exported",
};

export function ProjectCard({ project }: { project: StudioProject }) {
  return (
    <Link
      href="/studio/editor"
      className="group block overflow-hidden rounded-[var(--studio-radius-lg)] border border-[var(--studio-border)] bg-[var(--studio-bg-2)] transition-[border-color,transform,box-shadow] hover:-translate-y-0.5 hover:border-[var(--studio-border-strong)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
    >
      <div className="relative aspect-video bg-[var(--studio-bg-0)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--studio-accent-muted)] via-transparent to-black/60" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white/90 backdrop-blur">
            {project.aspectRatio}
          </span>
          <span className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
            {STATUS_LABEL[project.status]}
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="truncate text-sm font-medium text-[var(--studio-text-primary)] group-hover:text-white">
          {project.title}
        </h3>
        <p className="mt-1 text-xs text-[var(--studio-text-tertiary)]">
          {PLATFORM_LABEL[project.targetPlatform]} · Edited {formatRelativeTime(project.lastEditedAt)}
        </p>
      </div>
    </Link>
  );
}

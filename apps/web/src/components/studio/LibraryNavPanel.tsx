"use client";

import type { ReactNode } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  FolderOpen,
  Heart,
  Layers,
  MessageSquare,
  MonitorPlay,
  Sparkles,
  Star,
  Video,
} from "lucide-react";

import { STUDIO_CATEGORY_LABELS, STUDIO_CONTENT_CATEGORIES, type StudioCollection } from "@founder-os/studio";

export type LibraryNavSelection =
  | { type: "all" }
  | { type: "recent" }
  | { type: "favorites" }
  | { type: "unreviewed" }
  | { type: "category"; category: (typeof STUDIO_CONTENT_CATEGORIES)[number] }
  | { type: "collection"; collectionId: string };

export function LibraryNavPanel({
  collapsed,
  onToggleCollapse,
  selection,
  onSelect,
  collections,
  counts,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  selection: LibraryNavSelection;
  onSelect: (sel: LibraryNavSelection) => void;
  collections: StudioCollection[];
  counts: {
    all: number;
    favorites: number;
    unreviewed: number;
    byCategory: Partial<Record<(typeof STUDIO_CONTENT_CATEGORIES)[number], number>>;
  };
}) {
  return (
    <aside
      className={[
        "flex shrink-0 flex-col border-r border-[var(--studio-border)] bg-[var(--studio-bg-1)] transition-[width]",
        collapsed ? "w-12" : "w-52",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-2 py-2">
        {!collapsed ? (
          <span className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--studio-text-tertiary)]">
            Library
          </span>
        ) : null}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="rounded p-1.5 text-[var(--studio-text-tertiary)] hover:bg-[var(--studio-bg-hover)]"
          aria-label={collapsed ? "Expand library panel" : "Collapse library panel"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        <NavItem
          collapsed={collapsed}
          icon={<Layers className="h-4 w-4" />}
          label="All Media"
          count={counts.all}
          active={selection.type === "all"}
          onClick={() => onSelect({ type: "all" })}
        />
        <NavItem
          collapsed={collapsed}
          icon={<Sparkles className="h-4 w-4" />}
          label="Recently Imported"
          active={selection.type === "recent"}
          onClick={() => onSelect({ type: "recent" })}
        />
        <NavItem
          collapsed={collapsed}
          icon={<Heart className="h-4 w-4" />}
          label="Favorites"
          count={counts.favorites}
          active={selection.type === "favorites"}
          onClick={() => onSelect({ type: "favorites" })}
        />
        <NavItem
          collapsed={collapsed}
          icon={<Star className="h-4 w-4" />}
          label="Unreviewed"
          count={counts.unreviewed}
          active={selection.type === "unreviewed"}
          onClick={() => onSelect({ type: "unreviewed" })}
        />
        {!collapsed ? (
          <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Categories
          </p>
        ) : null}
        {STUDIO_CONTENT_CATEGORIES.filter((c) =>
          ["hook", "body", "cta", "broll", "testimonial", "screen_recording", "finished_video"].includes(c),
        ).map((c) => (
          <NavItem
            key={c}
            collapsed={collapsed}
            icon={categoryIcon(c)}
            label={STUDIO_CATEGORY_LABELS[c]}
            count={counts.byCategory[c]}
            active={selection.type === "category" && selection.category === c}
            onClick={() => onSelect({ type: "category", category: c })}
          />
        ))}
        <NavItem
          collapsed={collapsed}
          icon={<Archive className="h-4 w-4" />}
          label="Other"
          count={counts.byCategory.other}
          active={selection.type === "category" && selection.category === "other"}
          onClick={() => onSelect({ type: "category", category: "other" })}
        />
        {!collapsed && collections.length ? (
          <>
            <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
              Collections
            </p>
            {collections.map((c) => (
              <NavItem
                key={c.id}
                collapsed={collapsed}
                icon={<FolderOpen className="h-4 w-4" />}
                label={c.name}
                active={selection.type === "collection" && selection.collectionId === c.id}
                onClick={() => onSelect({ type: "collection", collectionId: c.id })}
              />
            ))}
          </>
        ) : null}
      </nav>
    </aside>
  );
}

function categoryIcon(c: string) {
  if (c === "hook") return <Sparkles className="h-4 w-4" />;
  if (c === "body") return <Video className="h-4 w-4" />;
  if (c === "cta") return <MessageSquare className="h-4 w-4" />;
  if (c === "broll") return <Clapperboard className="h-4 w-4" />;
  if (c === "testimonial") return <MessageSquare className="h-4 w-4" />;
  if (c === "screen_recording") return <MonitorPlay className="h-4 w-4" />;
  if (c === "finished_video") return <Video className="h-4 w-4" />;
  return <Archive className="h-4 w-4" />;
}

function NavItem({
  collapsed,
  icon,
  label,
  count,
  active,
  onClick,
}: {
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 rounded-[var(--studio-radius-md)] px-2 py-2 text-left text-xs transition-colors",
        active
          ? "bg-[var(--studio-accent-muted)] text-[var(--studio-text-primary)]"
          : "text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)]",
      ].join(" ")}
    >
      <span className="shrink-0 text-[var(--studio-text-tertiary)]">{icon}</span>
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{label}</span> : null}
      {!collapsed && count != null ? (
        <span className="text-[10px] tabular-nums text-[var(--studio-text-tertiary)]">{count}</span>
      ) : null}
    </button>
  );
}

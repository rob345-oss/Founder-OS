"use client";

import { useCallback, useEffect, useState } from "react";
import { Grid2x2, List, RefreshCw } from "lucide-react";

import { STUDIO_CATEGORY_LABELS, STUDIO_CONTENT_CATEGORIES, type StudioContentCategory } from "@founder-os/studio";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { fetchStudioMedia, listDirectories, scanMedia } from "@/lib/studio/client-api";
import type { StudioDirectoryPublic } from "@/lib/studio/client-api";

import { DirectoryManager } from "./DirectoryManager";
import { EmptyState } from "./EmptyState";
import { MediaGrid, MediaGridSkeleton } from "./MediaGrid";
import { MediaInspector } from "./MediaInspector";
import { MediaTable } from "./MediaTable";
import { StudioHeader } from "./StudioHeader";

export function MediaLibraryView() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [items, setItems] = useState<StudioMediaPublic[]>([]);
  const [selected, setSelected] = useState<StudioMediaPublic | null>(null);
  const [category, setCategory] = useState<StudioContentCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [directories, setDirectories] = useState<StudioDirectoryPublic[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    void Promise.all([
      fetchStudioMedia({
        q: query || undefined,
        category: category === "all" ? undefined : category,
      }),
      listDirectories(),
    ])
      .then(([{ items: next }, { directories: dirs }]) => {
        setItems(next);
        setDirectories(dirs);
        setSelected((prev) => {
          if (prev && next.some((m) => m.id === prev.id)) return prev;
          return next[0] ?? null;
        });
      })
      .finally(() => setLoading(false));
  }, [category, query]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleScan() {
    setScanning(true);
    try {
      await scanMedia();
      load();
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StudioHeader
        title="Media Library"
        subtitle="Browse indexed footage from authorized folders on this PC."
        onSearch={setQuery}
        actions={
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-4 py-2 text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            Refresh index
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-10">
          <DirectoryManager initialDirectories={directories} onUpdated={load} />

          <div className="mb-4 mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <FilterPill active={category === "all"} onClick={() => setCategory("all")} label="All" />
              {STUDIO_CONTENT_CATEGORIES.map((c) => (
                <FilterPill
                  key={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                  label={STUDIO_CATEGORY_LABELS[c]}
                />
              ))}
            </div>
            <div className="inline-flex rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] p-0.5">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={iconBtn(view === "grid")}
                aria-pressed={view === "grid"}
              >
                <Grid2x2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={iconBtn(view === "list")}
                aria-pressed={view === "list"}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          {loading ? (
            <MediaGridSkeleton />
          ) : items.length === 0 ? (
            <EmptyState
              title="No videos indexed"
              description="Authorize a footage folder above, then run Scan library to discover MP4, MOV, and M4V files."
            />
          ) : view === "grid" ? (
            <MediaGrid items={items} selectedId={selected?.id} onSelect={setSelected} />
          ) : (
            <MediaTable items={items} selectedId={selected?.id} onSelect={setSelected} />
          )}
        </div>

        <MediaInspector
          item={selected}
          onPatched={(item) => {
            setSelected(item);
            setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
          }}
        />
      </div>
    </div>
  );
}

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs font-medium",
        active
          ? "bg-[var(--studio-accent-muted)] text-[var(--studio-accent)]"
          : "border border-[var(--studio-border)] text-[var(--studio-text-secondary)] hover:bg-[var(--studio-bg-hover)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function iconBtn(active: boolean) {
  return [
    "rounded-[var(--studio-radius-sm)] p-2",
    active ? "bg-[var(--studio-bg-3)] text-[var(--studio-text-primary)]" : "text-[var(--studio-text-tertiary)]",
  ].join(" ");
}

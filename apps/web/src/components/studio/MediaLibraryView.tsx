"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Grid2x2, List, SlidersHorizontal } from "lucide-react";

import type { StudioCollection } from "@founder-os/studio";

import type { MediaQuery, StudioMediaPublic } from "@/lib/studio/client-api";
import {
  bulkPatchMedia,
  createCollection,
  createProject,
  fetchStudioMedia,
  listCollections,
  patchMedia,
  persistEditorQueue,
  revealMediaInExplorer,
} from "@/lib/studio/client-api";

import { BulkActionBar } from "./BulkActionBar";
import { CompareClipsModal } from "./CompareClipsModal";
import { EmptyState } from "./EmptyState";
import { LibraryNavPanel, type LibraryNavSelection } from "./LibraryNavPanel";
import { MediaContextMenu, type MediaContextMenuAction } from "./MediaContextMenu";
import { MediaGrid, MediaGridSkeleton } from "./MediaGrid";
import { MediaInspector } from "./MediaInspector";
import { MediaSourcesPanel } from "./MediaSourcesPanel";
import { MediaTable } from "./MediaTable";
import { StudioHeader } from "./StudioHeader";

export function MediaLibraryView() {
  const router = useRouter();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [navSelection, setNavSelection] = useState<LibraryNavSelection>({ type: "all" });
  const [view, setView] = useState<"grid" | "list">("grid");
  const [thumbSize, setThumbSize] = useState<"sm" | "md" | "lg">("md");
  const [items, setItems] = useState<StudioMediaPublic[]>([]);
  const [allItems, setAllItems] = useState<StudioMediaPublic[]>([]);
  const [selected, setSelected] = useState<StudioMediaPublic | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<MediaQuery["sort"]>("modified_desc");
  const [loading, setLoading] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [collections, setCollections] = useState<StudioCollection[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [expanded, setExpanded] = useState<StudioMediaPublic | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    item: StudioMediaPublic;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const mediaQuery = useMemo((): MediaQuery => {
    const base: MediaQuery = { q: debouncedQuery || undefined, sort };
    if (navSelection.type === "recent") base.recent = true;
    if (navSelection.type === "favorites") base.favorite = true;
    if (navSelection.type === "unreviewed") base.reviewStatus = "unreviewed";
    if (navSelection.type === "category") base.category = navSelection.category;
    if (navSelection.type === "collection") base.collectionId = navSelection.collectionId;
    if (navSelection.type === "missing") base.missing = true;
    return base;
  }, [debouncedQuery, navSelection, sort]);

  const load = useCallback(() => {
    setLoading(true);
    void Promise.all([fetchStudioMedia(mediaQuery), fetchStudioMedia({}), listCollections()])
      .then(([{ items: next }, { items: all }, { collections: cols }]) => {
        setItems(next);
        setAllItems(all);
        setCollections(cols);
        setSelected((prev) => {
          if (prev && next.some((m) => m.id === prev.id)) return prev;
          return next[0] ?? null;
        });
      })
      .finally(() => setLoading(false));
  }, [mediaQuery]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const m of allItems) {
      byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;
    }
    return {
      all: allItems.length,
      favorites: allItems.filter((m) => m.favorite).length,
      unreviewed: allItems.filter((m) => m.reviewStatus === "unreviewed").length,
      missing: allItems.filter((m) => m.missing).length,
      byCategory,
    };
  }, [allItems]);

  function toggleSelect(item: StudioMediaPublic, additive: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(additive ? prev : []);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setSelected(item);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelectedIds(new Set(items.map((m) => m.id)));
      }
      if (e.key === "f" && selected) {
        void import("@/lib/studio/client-api").then(({ patchMedia }) =>
          patchMedia(selected.id, { favorite: !selected.favorite }).then(({ item }) => {
            setSelected(item);
            setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
          }),
        );
      }
      if (e.key >= "1" && e.key <= "5" && selected) {
        const rating = Number(e.key);
        void import("@/lib/studio/client-api").then(({ patchMedia }) =>
          patchMedia(selected.id, { rating }).then(({ item }) => {
            setSelected(item);
            setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
          }),
        );
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (!selected || !items.length) return;
        e.preventDefault();
        const idx = items.findIndex((m) => m.id === selected.id);
        const nextIdx = e.key === "ArrowDown" ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
        setSelected(items[nextIdx] ?? selected);
      }
      if (e.key === "Escape") {
        setExpanded(null);
        setCompareOpen(false);
        setContextMenu(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, selected]);

  const selectedItems = items.filter((m) => selectedIds.has(m.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <StudioHeader
        title="Media Library"
        subtitle="Local footage index — authorize folders, review takes, send clips to the editor."
        onSearch={setQuery}
        actions={
          <button
            type="button"
            onClick={() => setSourcesOpen(true)}
            className="inline-flex items-center gap-2 rounded-[var(--studio-radius-md)] bg-[var(--studio-accent)] px-4 py-2 text-sm font-medium text-white"
          >
            <FolderPlus className="h-4 w-4" />
            Add Media Folder
          </button>
        }
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LibraryNavPanel
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed((v) => !v)}
          selection={navSelection}
          onSelect={setNavSelection}
          collections={collections}
          counts={counts}
          onDropToCollection={(collectionId, mediaIds) => {
            void bulkPatchMedia({ ids: mediaIds, collectionId }).then(() => load());
          }}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--studio-border)] px-4 py-2">
            <div className="flex items-center gap-2 text-xs text-[var(--studio-text-tertiary)]">
              <span>{items.length} clips</span>
              {selectedIds.size ? <span>· {selectedIds.size} selected</span> : null}
              {selectedIds.size >= 2 ? (
                <button type="button" className="text-[var(--studio-accent)]" onClick={() => setCompareOpen(true)}>
                  Compare
                </button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as MediaQuery["sort"])}
                className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1 text-xs"
              >
                <option value="modified_desc">Newest</option>
                <option value="modified_asc">Oldest</option>
                <option value="name">Name</option>
                <option value="duration">Duration</option>
                <option value="size">File size</option>
                <option value="rating">Rating</option>
              </select>
              <div className="inline-flex items-center gap-1 rounded-md border border-[var(--studio-border)] px-2 py-1 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <select
                  value={thumbSize}
                  onChange={(e) => setThumbSize(e.target.value as "sm" | "md" | "lg")}
                  className="bg-transparent"
                >
                  <option value="sm">Compact</option>
                  <option value="md">Grid</option>
                  <option value="lg">Large</option>
                </select>
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
          </div>

          <div className="min-h-0 flex-1 overflow-hidden px-4 py-4">
            {loading ? (
              <MediaGridSkeleton />
            ) : items.length === 0 ? (
              <EmptyState
                title={
                  navSelection.type === "all" && !debouncedQuery
                    ? "No folders connected yet"
                    : "No clips match this view"
                }
                description={
                  navSelection.type === "all" && !debouncedQuery
                    ? "Add a media folder to index MP4, MOV, M4V, and images from your PC."
                    : "Try another filter or search term."
                }
                actionLabel={navSelection.type === "all" && !debouncedQuery ? "Add Media Folder" : undefined}
                onAction={navSelection.type === "all" && !debouncedQuery ? () => setSourcesOpen(true) : undefined}
              />
            ) : view === "grid" ? (
              <MediaGrid
                items={items}
                selectedId={selected?.id}
                selectedIds={selectedIds}
                thumbSize={thumbSize}
                onSelect={setSelected}
                onToggleSelect={toggleSelect}
                onOpen={setExpanded}
                getDragIds={(item) =>
                  selectedIds.has(item.id) && selectedIds.size > 1 ? [...selectedIds] : [item.id]
                }
                onContextMenu={(item, pos) => setContextMenu({ item, x: pos.x, y: pos.y })}
              />
            ) : (
              <MediaTable items={items} selectedId={selected?.id} onSelect={setSelected} />
            )}
          </div>
        </div>

        <MediaInspector
          item={selected}
          collapsed={inspectorCollapsed}
          onToggleCollapse={() => setInspectorCollapsed((v) => !v)}
          onPatched={(item) => {
            setSelected(item);
            setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
            setAllItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
          }}
          onPrev={() => {
            if (!selected) return;
            const idx = items.findIndex((m) => m.id === selected.id);
            if (idx > 0) setSelected(items[idx - 1]!);
          }}
          onNext={() => {
            if (!selected) return;
            const idx = items.findIndex((m) => m.id === selected.id);
            if (idx >= 0 && idx < items.length - 1) setSelected(items[idx + 1]!);
          }}
        />
      </div>

      <MediaSourcesPanel open={sourcesOpen} onClose={() => setSourcesOpen(false)} onUpdated={load} />

      <BulkActionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onCategory={(category) => {
          void bulkPatchMedia({ ids: [...selectedIds], patch: { category } }).then(() => load());
        }}
        onReview={(reviewStatus) => {
          void bulkPatchMedia({ ids: [...selectedIds], patch: { reviewStatus } }).then(() => load());
        }}
        onFavorite={(favorite) => {
          void bulkPatchMedia({ ids: [...selectedIds], patch: { favorite } }).then(() => load());
        }}
        onAddCollection={() => {
          const name = window.prompt("Collection name");
          if (!name?.trim()) return;
          void createCollection(name.trim(), [...selectedIds]).then(() => load());
        }}
        onEditor={async () => {
          const ids = [...selectedIds];
          persistEditorQueue(ids);
          const { project } = await createProject(`Sequence ${new Date().toLocaleDateString()}`, ids);
          router.push(`/studio/editor?projectId=${project.id}`);
        }}
      />

      {compareOpen && selectedItems.length >= 2 ? (
        <CompareClipsModal
          items={selectedItems}
          onClose={() => setCompareOpen(false)}
          onMarkSelected={(id) => {
            void bulkPatchMedia({ ids: [id], patch: { reviewStatus: "selected" } }).then(() => load());
          }}
        />
      ) : null}

      {contextMenu ? (
        <MediaContextMenu
          item={contextMenu.item}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAction={(action: MediaContextMenuAction) => {
            const item = contextMenu.item;
            if (action === "open") setExpanded(item);
            if (action === "favorite") {
              void patchMedia(item.id, { favorite: !item.favorite }).then(({ item: next }) => {
                setSelected(next);
                setItems((prev) => prev.map((m) => (m.id === next.id ? next : m)));
              });
            }
            if (action === "add-editor") {
              persistEditorQueue([item.id]);
              void createProject(`Edit — ${item.fileName}`, [item.id]).then(({ project }) =>
                router.push(`/studio/editor?projectId=${project.id}`),
              );
            }
            if (action === "reveal") void revealMediaInExplorer(item.id);
            if (action === "compare" && selectedIds.size >= 2) setCompareOpen(true);
          }}
        />
      ) : null}

      {expanded ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setExpanded(null)}
          role="presentation"
        >
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()} role="dialog">
            <MediaInspector
              item={expanded}
              collapsed={false}
              onToggleCollapse={() => setExpanded(null)}
              onPatched={(item) => {
                setExpanded(item);
                setItems((prev) => prev.map((m) => (m.id === item.id ? item : m)));
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function iconBtn(active: boolean) {
  return [
    "rounded-[var(--studio-radius-sm)] p-2",
    active ? "bg-[var(--studio-bg-3)] text-[var(--studio-text-primary)]" : "text-[var(--studio-text-tertiary)]",
  ].join(" ");
}

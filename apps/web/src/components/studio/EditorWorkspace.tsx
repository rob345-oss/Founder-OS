"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Redo2, Save, Undo2 } from "lucide-react";

import { STUDIO_CATEGORY_LABELS, STUDIO_CONTENT_CATEGORIES } from "@founder-os/studio";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import {
  fetchStudioMedia,
  listProjects,
  mediaStreamUrl,
  mediaThumbnailUrl,
  readEditorQueue,
  setProjectMedia,
  persistEditorQueue,
} from "@/lib/studio/client-api";
import { writeMediaDragData } from "@/lib/studio/drag";
import { formatDuration } from "@/lib/studio/format";

import { EmptyState } from "./EmptyState";
import { TimelineShell } from "./TimelineShell";
import { VideoPreview } from "./VideoPreview";

export function EditorWorkspace() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [media, setMedia] = useState<StudioMediaPublic[]>([]);
  const [projectTitle, setProjectTitle] = useState("Untitled sequence");
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<StudioMediaPublic | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [demoTimeline, setDemoTimeline] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const queue = readEditorQueue();
    setQueueIds(queue);
    void Promise.all([fetchStudioMedia(), listProjects()])
      .then(([{ items }, { projects }]) => {
        const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
        const ids = project?.mediaIds?.length ? project.mediaIds : queue.length ? queue : [];
        const ordered = ids
          .map((id) => items.find((m) => m.id === id))
          .filter((m): m is StudioMediaPublic => Boolean(m));
        const pool = ordered.length ? ordered : items;
        setMedia(pool);
        setProjectTitle(project?.title ?? "Untitled sequence");
        if (pool[0]) setSelected(pool[0]);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const filtered = category === "all" ? media : media.filter((m) => m.category === category);
  const timelineClips = useMemo(() => (queueIds.length ? media.filter((m) => queueIds.includes(m.id)) : media), [media, queueIds]);

  async function appendToTimeline(ids: string[]) {
    const merged = [...new Set([...queueIds, ...ids])];
    setQueueIds(merged);
    persistEditorQueue(merged);
    if (projectId) {
      await setProjectMedia(projectId, merged);
    }
    setMedia((prev) => {
      const map = new Map(prev.map((m) => [m.id, m]));
      return merged.map((id) => map.get(id)).filter((m): m is StudioMediaPublic => Boolean(m));
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2">
        <div>
          <p className="text-sm font-medium text-[var(--studio-text-primary)]">{projectTitle}</p>
          <p className="text-[11px] text-[var(--studio-success)]">
            {timelineClips.length} clip{timelineClips.length === 1 ? "" : "s"} from Media Library · timeline shell
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] border border-[var(--studio-border)] text-[var(--studio-text-tertiary)] opacity-60"
            title="Undo — coming soon"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] border border-[var(--studio-border)] text-[var(--studio-text-tertiary)] opacity-60"
            title="Redo — coming soon"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <select
            defaultValue="9:16"
            disabled
            className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-2 py-1 text-xs"
          >
            <option value="9:16">9:16 Reels</option>
            <option value="16:9">16:9</option>
          </select>
          <button
            type="button"
            disabled
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] border border-[var(--studio-border)] text-[var(--studio-text-tertiary)] opacity-60"
            title="Save — coming soon"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled
            title="Export engine not connected"
            className="rounded-md bg-[var(--studio-bg-3)] px-3 py-1.5 text-xs font-medium text-[var(--studio-text-tertiary)] opacity-70"
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
          <div className="border-b border-[var(--studio-border)] p-3">
            <input
              type="search"
              placeholder="Filter browser…"
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1.5 text-xs"
              disabled={loading}
            />
            <div className="mt-2 flex flex-wrap gap-1">
              <CatPill active={category === "all"} onClick={() => setCategory("all")} label="All" />
              {STUDIO_CONTENT_CATEGORIES.map((c) => (
                <CatPill
                  key={c}
                  active={category === c}
                  onClick={() => setCategory(c)}
                  label={STUDIO_CATEGORY_LABELS[c]}
                />
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                draggable
                onDragStart={(e) => writeMediaDragData(e.dataTransfer, [m.id])}
                onClick={() => setSelected(m)}
                className={[
                  "mb-2 flex w-full gap-2 rounded-md border p-2 text-left text-xs",
                  selected?.id === m.id
                    ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)]"
                    : "border-[var(--studio-border)] hover:bg-[var(--studio-bg-hover)]",
                ].join(" ")}
              >
                <div
                  className="h-10 w-16 shrink-0 rounded bg-black/80 bg-cover bg-center"
                  style={{ backgroundImage: m.thumbnailKey ? `url(${mediaThumbnailUrl(m.id)})` : undefined }}
                />
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--studio-text-primary)]">{m.fileName}</p>
                  <p className="text-[var(--studio-text-tertiary)]">{formatDuration(m.durationSeconds)}</p>
                </div>
              </button>
            ))}
            {!loading && filtered.length === 0 ? (
              <EmptyState
                title="No clips in browser"
                description="Authorize a folder in Media Library and scan to populate the project browser."
              />
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-[var(--studio-bg-0)]">
          <div className="flex flex-1 flex-col items-center justify-center p-6">
            <div className="w-full max-w-4xl">
              <VideoPreview
                src={selected ? mediaStreamUrl(selected.id) : null}
                aspectClassName="aspect-[9/16] max-h-[52vh]"
              />
              <p className="mt-3 text-center text-[11px] text-[var(--studio-text-tertiary)]">
                Preview uses your local file stream · trimming and multitrack editing are not enabled in this phase.
              </p>
            </div>
          </div>
        </div>

        <aside className="w-72 shrink-0 border-l border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-4 text-xs">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Inspector
          </h3>
          {selected ? (
            <dl className="mt-3 space-y-2 text-[var(--studio-text-secondary)]">
              <div>
                <dt className="text-[var(--studio-text-tertiary)]">Clip</dt>
                <dd>{selected.fileName}</dd>
              </div>
              <p className="opacity-60 text-[var(--studio-text-tertiary)]">
                Transform · Audio · Color · Captions — coming soon
              </p>
            </dl>
          ) : (
            <p className="mt-3 text-[var(--studio-text-tertiary)]">Select a browser clip.</p>
          )}
          <label className="mt-6 flex items-center gap-2 text-[var(--studio-text-tertiary)]">
            <input type="checkbox" checked={demoTimeline} onChange={(e) => setDemoTimeline(e.target.checked)} />
            Show demo timeline clips
          </label>
        </aside>
      </div>

      <TimelineShell
        demo={demoTimeline}
        clipCount={timelineClips.length}
        onDropMediaIds={(ids) => void appendToTimeline(ids)}
      />
    </div>
  );
}

function CatPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-2 py-0.5 text-[10px]",
        active
          ? "bg-[var(--studio-accent-muted)] text-[var(--studio-accent)]"
          : "text-[var(--studio-text-tertiary)] hover:bg-[var(--studio-bg-hover)]",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

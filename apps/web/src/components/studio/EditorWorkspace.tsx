"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Redo2, Undo2 } from "lucide-react";

import { STUDIO_CATEGORY_LABELS, STUDIO_CONTENT_CATEGORIES } from "@founder-os/studio";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import {
  fetchProjectTimeline,
  fetchStudioMedia,
  listProjects,
  mediaThumbnailUrl,
  persistEditorQueue,
  readEditorQueue,
} from "@/lib/studio/client-api";
import { writeMediaDragData as writeDrag } from "@/lib/studio/drag";
import { formatDuration } from "@/lib/studio/format";
import { useTimelineEditor } from "@/lib/studio/timeline/useTimelineEditor";

import { EmptyState } from "./EmptyState";
import { SequenceVideoPreview } from "./SequenceVideoPreview";
import { TimelineEditor } from "./TimelineEditor";

export function EditorWorkspace() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const [catalog, setCatalog] = useState<StudioMediaPublic[]>([]);
  const [projectTitle, setProjectTitle] = useState("Untitled sequence");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [browserSelected, setBrowserSelected] = useState<StudioMediaPublic | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [playheadSeconds, setPlayheadSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(48);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const editor = useTimelineEditor({
    projectId,
    projectTitle,
    aspectRatio,
    mediaCatalog: catalog,
    initialMediaIds: queueIds,
  });

  useEffect(() => {
    const queue = readEditorQueue();
    setQueueIds(queue);
    void Promise.all([fetchStudioMedia(), listProjects(), projectId ? fetchProjectTimeline(projectId).catch(() => null) : null])
      .then(([mediaRes, projectsRes, timelineRes]) => {
        const project = projectId ? projectsRes.projects.find((p) => p.id === projectId) : undefined;
        setProjectTitle(project?.title ?? "Untitled sequence");
        setAspectRatio(project?.aspectRatio ?? "9:16");
        const ids = project?.mediaIds?.length ? project.mediaIds : queue.length ? queue : [];
        setQueueIds(ids);
        const items = mediaRes.items;
        setCatalog(items);
        if (timelineRes?.timeline) {
          editor.loadInitial(timelineRes.timeline);
        } else {
          editor.loadInitial(null);
        }
        const first = ids.map((id) => items.find((m) => m.id === id)).find(Boolean) ?? items[0];
        if (first) setBrowserSelected(first);
      })
      .finally(() => setLoading(false));
    // editor.loadInitial is stable enough for mount hydration only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (editor.timeline) {
      const ids = editor.clips.map((c) => c.sourceMediaId);
      persistEditorQueue(ids);
    }
  }, [editor.clips, editor.timeline]);

  const mediaById = useMemo(() => new Map(catalog.map((m) => [m.id, m])), [catalog]);
  const filtered = category === "all" ? catalog : catalog.filter((m) => m.category === category);

  const selectedClip = selectedClipId
    ? editor.clips.find((c) => c.id === selectedClipId)
    : editor.clips[0] ?? null;

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }
      if ((mod && e.key === "y") || (mod && e.shiftKey && e.key === "z")) {
        e.preventDefault();
        editor.redo();
      }
      if (mod && e.key === "d" && selectedClipId) {
        e.preventDefault();
        editor.duplicateClip(selectedClipId);
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
        e.preventDefault();
        editor.removeClip(selectedClipId);
        setSelectedClipId(null);
      }
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    },
    [editor, selectedClipId],
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  function appendToTimeline(ids: string[]) {
    editor.addMedia(ids);
    const merged = [...new Set([...queueIds, ...ids])];
    setQueueIds(merged);
  }

  const saveLabel =
    editor.saveState === "saving"
      ? "Saving…"
      : editor.saveState === "saved"
        ? "Saved"
        : editor.saveState === "error"
          ? "Save error"
          : projectId
            ? "Auto-save on"
            : "Open a project to persist";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorHeaderBar
        projectTitle={projectTitle}
        clipCount={editor.clips.length}
        saveLabel={saveLabel}
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        snapEnabled={snapEnabled}
        onSnapToggle={setSnapEnabled}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
          <div className="border-b border-[var(--studio-border)] p-3">
            <input
              type="search"
              placeholder="Filter browser…"
              className="w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-2 py-1.5 text-xs"
              disabled={loading}
            />
            <CategoryPills category={category} setCategory={setCategory} />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filtered.map((m) => (
              <button
                key={m.id}
                type="button"
                draggable
                onDragStart={(e) => writeDrag(e.dataTransfer, [m.id])}
                onClick={() => setBrowserSelected(m)}
                className={[
                  "mb-2 flex w-full gap-2 rounded-md border p-2 text-left text-xs",
                  browserSelected?.id === m.id
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
              {editor.timeline ? (
                <SequenceVideoPreview
                  timeline={editor.timeline}
                  mediaById={mediaById}
                  playheadSeconds={playheadSeconds}
                  onPlayheadSeconds={setPlayheadSeconds}
                  playing={playing}
                  onPlayingChange={setPlaying}
                  selectedClipId={selectedClipId}
                  onSelectClip={(id) => {
            setSelectedClipId(id);
            if (id) {
              const clip = editor.clips.find((c) => c.id === id);
              if (clip) setPlayheadSeconds(clip.timelineStartSeconds);
            }
          }}
                />
              ) : (
                <p className="text-center text-xs text-[var(--studio-text-tertiary)]">Loading timeline…</p>
              )}
            </div>
          </div>
        </div>

        <aside className="w-72 shrink-0 border-l border-[var(--studio-border)] bg-[var(--studio-bg-1)] p-4 text-xs">
          <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--studio-text-tertiary)]">
            Inspector
          </h3>
          {selectedClip && mediaById.get(selectedClip.sourceMediaId) ? (
            <dl className="mt-3 space-y-2 text-[var(--studio-text-secondary)]">
              <div>
                <dt className="text-[var(--studio-text-tertiary)]">Clip instance</dt>
                <dd>{selectedClip.id.slice(0, 12)}…</dd>
              </div>
              <div>
                <dt className="text-[var(--studio-text-tertiary)]">Source</dt>
                <dd>{mediaById.get(selectedClip.sourceMediaId)!.fileName}</dd>
              </div>
              <div>
                <dt className="text-[var(--studio-text-tertiary)]">In / Out (source)</dt>
                <dd>
                  {selectedClip.sourceInSeconds.toFixed(2)}s →{" "}
                  {(selectedClip.sourceOutSeconds ?? mediaById.get(selectedClip.sourceMediaId)?.durationSeconds ?? "end").toString()}
                </dd>
              </div>
              <p className="text-[var(--studio-text-tertiary)]">Delete · ⌫ / Backspace · Duplicate · ⌘D</p>
            </dl>
          ) : (
            <p className="mt-3 text-[var(--studio-text-tertiary)]">Select a timeline clip.</p>
          )}
        </aside>
      </div>

      {editor.timeline ? (
        <TimelineEditor
          timeline={editor.timeline}
          mediaById={mediaById}
          sourceDurations={editor.durations}
          selectedClipId={selectedClipId}
          playheadSeconds={playheadSeconds}
          pixelsPerSecond={pixelsPerSecond}
          snapEnabled={snapEnabled}
          onSelectClip={(id) => {
            setSelectedClipId(id);
            if (id) {
              const clip = editor.clips.find((c) => c.id === id);
              if (clip) setPlayheadSeconds(clip.timelineStartSeconds);
            }
          }}
          onPlayheadSeconds={setPlayheadSeconds}
          onPixelsPerSecond={setPixelsPerSecond}
          onDropMediaIds={appendToTimeline}
          onReorder={editor.reorder}
          onTrim={editor.trim}
          onRemove={(id) => {
            editor.removeClip(id);
            if (selectedClipId === id) setSelectedClipId(null);
          }}
          onDuplicate={editor.duplicateClip}
        />
      ) : null}
    </div>
  );
}

function EditorHeaderBar({
  projectTitle,
  clipCount,
  saveLabel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  snapEnabled,
  onSnapToggle,
}: {
  projectTitle: string;
  clipCount: number;
  saveLabel: string;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  snapEnabled: boolean;
  onSnapToggle: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-4 py-2">
      <div>
        <p className="text-sm font-medium text-[var(--studio-text-primary)]">{projectTitle}</p>
        <p className="text-[11px] text-[var(--studio-success)]">
          {clipCount} clip instance{clipCount === 1 ? "" : "s"} · {saveLabel}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] disabled:opacity-40"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--studio-radius-sm)] border border-[var(--studio-border)] text-[var(--studio-text-secondary)] disabled:opacity-40"
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        <label className="flex items-center gap-1 text-[10px] text-[var(--studio-text-tertiary)]">
          <input type="checkbox" checked={snapEnabled} onChange={(e) => onSnapToggle(e.target.checked)} />
          Snap
        </label>
        <button
          type="button"
          disabled
          title="Export engine — see STUDIO_EXPORT.md"
          className="rounded-md bg-[var(--studio-bg-3)] px-3 py-1.5 text-xs font-medium text-[var(--studio-text-tertiary)] opacity-70"
        >
          Export
        </button>
      </div>
    </div>
  );
}

function CategoryPills({ category, setCategory }: { category: string; setCategory: (c: string) => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <CatPill active={category === "all"} onClick={() => setCategory("all")} label="All" />
      {STUDIO_CONTENT_CATEGORIES.map((c) => (
        <CatPill key={c} active={category === c} onClick={() => setCategory(c)} label={STUDIO_CATEGORY_LABELS[c]} />
      ))}
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

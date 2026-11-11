"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Copy, Trash2 } from "lucide-react";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { mediaThumbnailUrl } from "@/lib/studio/client-api";
import { readMediaDragData } from "@/lib/studio/drag";
import type { StudioTimelineClipInstance, StudioTimelineProject } from "@founder-os/studio";
import { clipSequenceDuration, formatTimecode, getPrimaryVideoTrack, MIN_TRIM_SECONDS } from "@founder-os/studio";

const SNAP_PX = 8;
const MIN_PPS = 12;
const MAX_PPS = 140;
const TRACK_HEIGHT = 56;
const RULER_H = 26;

function snapPoints(clips: StudioTimelineClipInstance[], pps: number, sourceDurations: Map<string, number | null>) {
  const pts: number[] = [0];
  for (const c of clips) {
    pts.push(c.timelineStartSeconds);
    pts.push(c.timelineStartSeconds + clipSequenceDuration(c, sourceDurations.get(c.sourceMediaId) ?? null));
  }
  return pts.map((s) => s * pps);
}

export function TimelineEditor({
  timeline,
  mediaById,
  sourceDurations,
  selectedClipId,
  playheadSeconds,
  pixelsPerSecond,
  snapEnabled,
  onSelectClip,
  onPlayheadSeconds,
  onPixelsPerSecond,
  onDropMediaIds,
  onReorder,
  onTrim,
  onRemove,
  onDuplicate,
}: {
  timeline: StudioTimelineProject;
  mediaById: Map<string, StudioMediaPublic>;
  sourceDurations: Map<string, number | null>;
  selectedClipId: string | null;
  playheadSeconds: number;
  pixelsPerSecond: number;
  snapEnabled: boolean;
  onSelectClip: (id: string | null) => void;
  onPlayheadSeconds: (t: number) => void;
  onPixelsPerSecond: (pps: number) => void;
  onDropMediaIds: (ids: string[]) => void;
  onReorder: (orderedIds: string[]) => void;
  onTrim: (clipId: string, patch: { sourceInSeconds?: number; sourceOutSeconds?: number | null }) => void;
  onRemove: (clipId: string) => void;
  onDuplicate: (clipId: string) => void;
}) {
  const clips = getPrimaryVideoTrack(timeline);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [dragClipId, setDragClipId] = useState<string | null>(null);
  const [dragOverClipId, setDragOverClipId] = useState<string | null>(null);
  const [libraryDragOver, setLibraryDragOver] = useState(false);

  const contentWidth = Math.max(timeline.durationSeconds * pixelsPerSecond + 160, 520);
  const snapPx = useMemo(() => snapPoints(clips, pixelsPerSecond, sourceDurations), [clips, pixelsPerSecond, sourceDurations]);

  const seekFromClientX = useCallback(
    (clientX: number, scrollLeft: number, offsetLeft: number) => {
      const x = clientX - offsetLeft + scrollLeft;
      let seconds = x / pixelsPerSecond;
      if (snapEnabled) {
        const nearest = snapPx.reduce((best, p) => (Math.abs(p - x) < Math.abs(best - x) ? p : best), snapPx[0] ?? 0);
        if (Math.abs(nearest - x) <= SNAP_PX) seconds = nearest / pixelsPerSecond;
      }
      onPlayheadSeconds(Math.max(0, Math.min(seconds, timeline.durationSeconds)));
    },
    [onPlayheadSeconds, pixelsPerSecond, snapEnabled, snapPx, timeline.durationSeconds],
  );

  function onRulerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
    const offsetLeft = scrollRef.current?.getBoundingClientRect().left ?? 0;
    seekFromClientX(e.clientX, scrollLeft, offsetLeft);
    const move = (ev: PointerEvent) => seekFromClientX(ev.clientX, scrollRef.current?.scrollLeft ?? 0, offsetLeft);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  function reorderFromDrop(targetId: string) {
    if (!dragClipId || dragClipId === targetId) return;
    const ids = clips.map((c) => c.id);
    const from = ids.indexOf(dragClipId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, dragClipId);
    onReorder(ids);
  }

  const playheadLeft = playheadSeconds * pixelsPerSecond;

  return (
    <div className="flex h-[17.5rem] flex-col border-t border-[var(--studio-border)] bg-[var(--studio-bg-1)]">
      <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-1.5 text-xs">
        <div className="flex items-center gap-3 text-[var(--studio-text-tertiary)]">
          <span className="font-medium text-[var(--studio-text-secondary)]">Timeline</span>
          <span>{formatTimecode(playheadSeconds, timeline.frameRate)}</span>
          <span>/ {formatTimecode(timeline.durationSeconds, timeline.frameRate)}</span>
        </div>
        <TimelineZoomControl pixelsPerSecond={pixelsPerSecond} onPixelsPerSecond={onPixelsPerSecond} />
      </div>

      <TimelineScrollArea
        scrollRef={scrollRef}
        contentWidth={contentWidth}
        rulerHeight={RULER_H}
        trackHeight={TRACK_HEIGHT}
        onRulerPointerDown={onRulerPointerDown}
        playheadLeft={playheadLeft}
        clips={clips}
        mediaById={mediaById}
        sourceDurations={sourceDurations}
        pixelsPerSecond={pixelsPerSecond}
        selectedClipId={selectedClipId}
        dragClipId={dragClipId}
        dragOverClipId={dragOverClipId}
        libraryDragOver={libraryDragOver}
        onSelectClip={onSelectClip}
        onTrim={onTrim}
        onRemove={onRemove}
        onDuplicate={onDuplicate}
        onReorder={reorderFromDrop}
        onDropMediaIds={onDropMediaIds}
        setDragClipId={setDragClipId}
        setDragOverClipId={setDragOverClipId}
        setLibraryDragOver={setLibraryDragOver}
      />
    </div>
  );
}

function TimelineZoomControl({
  pixelsPerSecond,
  onPixelsPerSecond,
}: {
  pixelsPerSecond: number;
  onPixelsPerSecond: (n: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-[var(--studio-text-tertiary)]">
      <span>Zoom</span>
      <input
        type="range"
        min={MIN_PPS}
        max={MAX_PPS}
        value={pixelsPerSecond}
        onChange={(e) => onPixelsPerSecond(Number(e.target.value))}
        className="w-28"
      />
    </div>
  );
}

type ScrollProps = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  contentWidth: number;
  rulerHeight: number;
  trackHeight: number;
  onRulerPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  playheadLeft: number;
  clips: StudioTimelineClipInstance[];
  mediaById: Map<string, StudioMediaPublic>;
  sourceDurations: Map<string, number | null>;
  pixelsPerSecond: number;
  selectedClipId: string | null;
  dragClipId: string | null;
  dragOverClipId: string | null;
  libraryDragOver: boolean;
  onSelectClip: (id: string | null) => void;
  onTrim: (clipId: string, patch: { sourceInSeconds?: number; sourceOutSeconds?: number | null }) => void;
  onRemove: (clipId: string) => void;
  onDuplicate: (clipId: string) => void;
  onReorder: (targetId: string) => void;
  onDropMediaIds: (ids: string[]) => void;
  setDragClipId: (id: string | null) => void;
  setDragOverClipId: (id: string | null) => void;
  setLibraryDragOver: (v: boolean) => void;
};

function TimelineScrollArea(props: ScrollProps) {
  const {
    scrollRef,
    contentWidth,
    rulerHeight,
    trackHeight,
    onRulerPointerDown,
    playheadLeft,
    clips,
    mediaById,
    sourceDurations,
    pixelsPerSecond,
    selectedClipId,
    dragClipId,
    dragOverClipId,
    libraryDragOver,
    onSelectClip,
    onTrim,
    onRemove,
    onDuplicate,
    onReorder,
    onDropMediaIds,
    setDragClipId,
    setDragOverClipId,
    setLibraryDragOver,
  } = props;

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-3 py-2">
      <div className="relative" style={{ width: contentWidth, minHeight: rulerHeight + trackHeight + 48 }}>
        <TimelineRuler
          rulerHeight={rulerHeight}
          contentWidth={contentWidth}
          pixelsPerSecond={pixelsPerSecond}
          onRulerPointerDown={onRulerPointerDown}
        />
        <TimelinePlayhead playheadLeft={playheadLeft} height={rulerHeight + trackHeight + 32} />

        <div className="mt-1 flex items-start gap-2">
          <span className="w-14 pt-3 text-[10px] uppercase tracking-wider text-[var(--studio-text-tertiary)]">Video</span>
          <div
            className={[
              "relative rounded-[var(--studio-radius-sm)] border bg-[var(--studio-bg-0)] transition-colors",
              libraryDragOver
                ? "border-[var(--studio-accent)] bg-[var(--studio-accent-muted)]"
                : "border-[var(--studio-border)]",
            ].join(" ")}
            style={{ width: contentWidth - 72, height: trackHeight }}
            onDragOver={(e) => {
              if (!readMediaDragData(e.dataTransfer)) return;
              e.preventDefault();
              setLibraryDragOver(true);
            }}
            onDragLeave={() => setLibraryDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setLibraryDragOver(false);
              const payload = readMediaDragData(e.dataTransfer);
              if (payload) onDropMediaIds(payload.ids);
            }}
          >
            {clips.length === 0 ? (
              <div className="flex h-full items-center px-3 text-[11px] text-[var(--studio-text-tertiary)]">
                Drop clips from Media Library
              </div>
            ) : (
              clips.map((clip) => (
                <ClipBlock
                  key={clip.id}
                  clip={clip}
                  media={mediaById.get(clip.sourceMediaId)}
                  sourceDuration={sourceDurations.get(clip.sourceMediaId) ?? null}
                  pixelsPerSecond={pixelsPerSecond}
                  selected={selectedClipId === clip.id}
                  dragging={dragClipId === clip.id}
                  dragOver={dragOverClipId === clip.id}
                  onSelect={() => onSelectClip(clip.id)}
                  onRemove={() => onRemove(clip.id)}
                  onDuplicate={() => onDuplicate(clip.id)}
                  onTrim={onTrim}
                  onDragStart={() => setDragClipId(clip.id)}
                  onDragEnd={() => {
                    setDragClipId(null);
                    setDragOverClipId(null);
                  }}
                  onDragOver={() => setDragOverClipId(clip.id)}
                  onDropOn={() => {
                    onReorder(clip.id);
                    setDragOverClipId(null);
                  }}
                />
              ))
            )}
          </div>
        </div>

        <TimelineAudioPlaceholder contentWidth={contentWidth - 72} />
        <TimelineCaptionsPlaceholder contentWidth={contentWidth - 72} />
      </div>
    </div>
  );
}

function TimelineRuler({
  rulerHeight,
  contentWidth,
  pixelsPerSecond,
  onRulerPointerDown,
}: {
  rulerHeight: number;
  contentWidth: number;
  pixelsPerSecond: number;
  onRulerPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const tickEveryPx = Math.max(40, pixelsPerSecond * 5);
  const tickCount = Math.ceil(contentWidth / tickEveryPx);
  return (
    <div
      role="slider"
      aria-label="Time ruler"
      className="relative cursor-ew-resize border-b border-[var(--studio-border)] bg-[var(--studio-bg-2)]"
      style={{ height: rulerHeight, width: contentWidth }}
      onPointerDown={onRulerPointerDown}
    >
      {Array.from({ length: tickCount }).map((_, i) => {
        const seconds = (i * tickEveryPx) / pixelsPerSecond;
        return (
          <div
            key={i}
            className="absolute bottom-0 border-l border-[var(--studio-border)] text-[9px] text-[var(--studio-text-tertiary)]"
            style={{ left: i * tickEveryPx, height: rulerHeight, paddingLeft: 4, paddingTop: 2 }}
          >
            {seconds >= 60 ? `${Math.floor(seconds / 60)}m` : `${Math.round(seconds)}s`}
          </div>
        );
      })}
    </div>
  );
}

function TimelinePlayhead({ playheadLeft, height }: { playheadLeft: number; height: number }) {
  return (
    <div
      className="pointer-events-none absolute top-0 z-20 w-px bg-[var(--studio-accent)]"
      style={{ left: playheadLeft, height }}
    >
      <div className="absolute -left-1.5 top-0 h-2.5 w-2.5 rounded-full bg-[var(--studio-accent)]" />
    </div>
  );
}

function TimelineAudioPlaceholder({ contentWidth }: { contentWidth: number }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-14 text-[10px] uppercase tracking-wider text-[var(--studio-text-tertiary)]">Audio</span>
      <div
        className="flex h-8 items-center rounded-[var(--studio-radius-sm)] border border-dashed border-[var(--studio-border)] px-3 text-[10px] text-[var(--studio-text-tertiary)]"
        style={{ width: contentWidth }}
      >
        Linked to video — separate lanes in a future phase
      </div>
    </div>
  );
}

function TimelineCaptionsPlaceholder({ contentWidth }: { contentWidth: number }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-14 text-[10px] uppercase tracking-wider text-[var(--studio-text-tertiary)]">Captions</span>
      <div
        className="flex h-8 items-center rounded-[var(--studio-radius-sm)] border border-dashed border-[var(--studio-border)] px-3 text-[10px] text-[var(--studio-text-tertiary)]"
        style={{ width: contentWidth }}
      >
        Captions track — coming soon
      </div>
    </div>
  );
}

function ClipBlock({
  clip,
  media,
  sourceDuration,
  pixelsPerSecond,
  selected,
  dragging,
  dragOver,
  onSelect,
  onRemove,
  onDuplicate,
  onTrim,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDropOn,
}: {
  clip: StudioTimelineClipInstance;
  media?: StudioMediaPublic;
  sourceDuration: number | null;
  pixelsPerSecond: number;
  selected: boolean;
  dragging: boolean;
  dragOver: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onTrim: (clipId: string, patch: { sourceInSeconds?: number; sourceOutSeconds?: number | null }) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDropOn: () => void;
}) {
  const width = Math.max(clipSequenceDuration(clip, sourceDuration) * pixelsPerSecond, 36);
  const left = clip.timelineStartSeconds * pixelsPerSecond;

  function startTrim(edge: "in" | "out", e: React.PointerEvent) {
    e.stopPropagation();
    const startX = e.clientX;
    const baseIn = clip.sourceInSeconds;
    const baseOut = clip.sourceOutSeconds ?? sourceDuration ?? baseIn + 1;
    let patch: { sourceInSeconds?: number; sourceOutSeconds?: number | null } | null = null;
    const move = (ev: PointerEvent) => {
      const deltaSec = (ev.clientX - startX) / pixelsPerSecond;
      if (edge === "in") {
        const nextIn = Math.max(0, Math.min(baseOut - MIN_TRIM_SECONDS, baseIn + deltaSec));
        patch = { sourceInSeconds: nextIn };
      } else {
        const maxOut = sourceDuration ?? baseOut + 60;
        const nextOut = Math.max(baseIn + MIN_TRIM_SECONDS, Math.min(maxOut, baseOut + deltaSec));
        patch = { sourceOutSeconds: nextOut };
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (patch) onTrim(clip.id, patch);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropOn();
      }}
      onClick={onSelect}
      className={[
        "absolute top-1 flex h-[calc(100%-0.5rem)] overflow-hidden rounded border text-[10px]",
        selected
          ? "border-[var(--studio-accent)] ring-1 ring-[var(--studio-accent)]"
          : "border-[var(--studio-border-strong)]",
        dragOver ? "brightness-110" : "",
        dragging ? "opacity-60" : "",
        media?.missing ? "border-amber-500/60" : "bg-[var(--studio-accent-muted)]",
      ].join(" ")}
      style={{ left, width }}
      title={media?.fileName ?? clip.sourceMediaId}
    >
      <div
        className="h-full w-2 shrink-0 cursor-ew-resize bg-black/30"
        onPointerDown={(e) => startTrim("in", e)}
      />
      <div
        className="min-w-0 flex-1 bg-cover bg-center px-1.5 py-1"
        style={{
          backgroundImage: media?.thumbnailKey ? `url(${mediaThumbnailUrl(media.id)})` : undefined,
        }}
      >
        <p className="truncate font-medium text-[var(--studio-text-primary)] shadow-sm">{media?.fileName ?? "Missing"}</p>
        {media?.missing ? <p className="text-amber-200">Offline</p> : null}
      </div>
      {selected ? (
        <span className="absolute right-1 top-1 flex gap-0.5">
          <button type="button" className="rounded bg-black/50 p-0.5" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
            <Copy className="h-3 w-3" />
          </button>
          <button type="button" className="rounded bg-black/50 p-0.5" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      ) : null}
      <div
        className="h-full w-2 shrink-0 cursor-ew-resize bg-black/30"
        onPointerDown={(e) => startTrim("out", e)}
      />
    </div>
  );
}

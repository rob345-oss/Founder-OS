"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { StudioMediaPublic } from "@/lib/studio/client-api";
import { mediaStreamUrl } from "@/lib/studio/client-api";
import type { StudioTimelineProject } from "@founder-os/studio";
import {
  buildSequenceSegments,
  clipSequenceDuration,
  resolveSequenceTime,
  type SequenceClipSegment,
} from "@founder-os/studio";

export function SequenceVideoPreview({
  timeline,
  mediaById,
  playheadSeconds,
  onPlayheadSeconds,
  playing,
  onPlayingChange,
  aspectClassName = "aspect-[9/16] max-h-[52vh]",
  selectedClipId,
  onSelectClip,
}: {
  timeline: StudioTimelineProject | null;
  mediaById: Map<string, StudioMediaPublic>;
  playheadSeconds: number;
  onPlayheadSeconds: (t: number) => void;
  playing: boolean;
  onPlayingChange: (v: boolean) => void;
  aspectClassName?: string;
  selectedClipId: string | null;
  onSelectClip: (clipId: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const segmentRef = useRef<SequenceClipSegment | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [missingWarning, setMissingWarning] = useState<string | null>(null);
  const transitioning = useRef(false);

  const sourceDurations = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const [id, m] of mediaById) map.set(id, m.durationSeconds);
    return map;
  }, [mediaById]);

  const segments = useMemo(
    () => (timeline ? buildSequenceSegments(timeline, sourceDurations) : []),
    [timeline, sourceDurations],
  );

  const syncToPlayhead = useCallback(
    async (seconds: number, autoplay: boolean) => {
      const resolved = resolveSequenceTime(seconds, segments);
      if (!resolved) {
        setStreamUrl(null);
        setMissingWarning("No clips on the timeline. Drop videos from the library.");
        return;
      }
      const media = mediaById.get(resolved.segment.sourceMediaId);
      if (!media) {
        setStreamUrl(null);
        setMissingWarning("Clip references media that is not in the project browser.");
        return;
      }
      if (media.missing) {
        setStreamUrl(null);
        setMissingWarning(`${media.fileName} is missing on disk. Re-scan your library folder.`);
        return;
      }
      setMissingWarning(null);
      segmentRef.current = resolved.segment;
      onSelectClip(resolved.segment.clipInstanceId);
      const nextUrl = mediaStreamUrl(media.id);
      setStreamUrl(nextUrl);
      const el = videoRef.current;
      if (!el) return;
      if (el.src !== `${window.location.origin}${nextUrl}` && !el.src.endsWith(nextUrl)) {
        el.src = nextUrl;
        el.load();
      }
      const seek = () => {
        try {
          const max = media.durationSeconds ?? resolved.sourceTimeSeconds + 10;
          el.currentTime = Math.min(Math.max(0, resolved.sourceTimeSeconds), max);
          if (autoplay) void el.play().catch(() => onPlayingChange(false));
        } catch {
          /* ignore */
        }
      };
      if (el.readyState >= 1) seek();
      else el.addEventListener("loadedmetadata", seek, { once: true });
    },
    [mediaById, onPlayingChange, onSelectClip, segments],
  );

  useEffect(() => {
    if (!playing) void syncToPlayhead(playheadSeconds, false);
  }, [playheadSeconds, playing, syncToPlayhead, selectedClipId]);

  useEffect(() => {
    if (playing) void syncToPlayhead(playheadSeconds, true);
  }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const onTime = () => {
      if (transitioning.current) return;
      const active = segmentRef.current;
      if (!active) return;
      const local = el.currentTime;
      const seq = active.timelineStartSeconds + (local - active.sourceInSeconds);
      onPlayheadSeconds(seq);
      const end = active.sourceOutSeconds - 0.04;
      if (playing && local >= end) {
        const idx = segments.findIndex((s) => s.clipInstanceId === active.clipInstanceId);
        const next = segments[idx + 1];
        if (next) {
          transitioning.current = true;
          onPlayheadSeconds(next.timelineStartSeconds);
          void syncToPlayhead(next.timelineStartSeconds, true).finally(() => {
            transitioning.current = false;
          });
        } else {
          onPlayingChange(false);
          el.pause();
        }
      }
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [onPlayheadSeconds, onPlayingChange, playing, segments, syncToPlayhead]);

  const activeMedia = selectedClipId
    ? (() => {
        const clip = timeline?.tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);
        return clip ? mediaById.get(clip.sourceMediaId) : null;
      })()
  : null;

  return (
    <div className="w-full">
      <div
        className={`relative overflow-hidden rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-black ${aspectClassName}`}
      >
        {missingWarning ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-amber-200">
            {missingWarning}
          </div>
        ) : streamUrl ? (
          <video
            ref={videoRef}
            src={streamUrl}
            playsInline
            className="absolute inset-0 h-full w-full object-contain"
            onClick={() => onPlayingChange(!playing)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--studio-text-tertiary)]">
            Add clips to the timeline to preview the sequence
          </div>
        )}
      </div>
      <SequencePlaybackControls
        playing={playing}
        onPlayingChange={onPlayingChange}
        duration={timeline?.durationSeconds ?? 0}
      />
      {activeMedia && selectedClipId && timeline ? (
        <p className="mt-2 text-center text-[11px] text-[var(--studio-text-tertiary)]">
          {activeMedia.fileName} ·{" "}
          {(() => {
            const clip = getClip(timeline, selectedClipId);
            return clip
              ? `${clipSequenceDuration(clip, activeMedia.durationSeconds).toFixed(1)}s on timeline`
              : "—";
          })()}
        </p>
      ) : null}
    </div>
  );
}

function getClip(timeline: StudioTimelineProject, clipId: string) {
  return timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
}

function SequencePlaybackControls({
  playing,
  onPlayingChange,
  duration,
}: {
  playing: boolean;
  onPlayingChange: (v: boolean) => void;
  duration: number;
}) {
  return (
    <div className="mt-3 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPlayingChange(!playing)}
        className="rounded-md border border-[var(--studio-border)] bg-[var(--studio-bg-2)] px-3 py-1 text-xs text-[var(--studio-text-secondary)]"
      >
        {playing ? "Pause" : "Play sequence"}
      </button>
      <span className="text-[11px] text-[var(--studio-text-tertiary)]">
        Sequence {duration > 0 ? `${duration.toFixed(1)}s` : "—"}
      </span>
    </div>
  );
}

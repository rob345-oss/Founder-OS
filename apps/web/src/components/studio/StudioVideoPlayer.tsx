"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react";

function formatTs(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function StudioVideoPlayer({
  src,
  poster,
  kind = "video",
  onPrev,
  onNext,
}: {
  src?: string | null;
  poster?: string | null;
  kind?: "video" | "image";
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "ArrowLeft") {
        const el = videoRef.current;
        if (el) el.currentTime = Math.max(0, el.currentTime - 5);
      }
      if (e.key === "ArrowRight") {
        const el = videoRef.current;
        if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
      }
      if (e.key === "ArrowUp") onPrev?.();
      if (e.key === "ArrowDown") onNext?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onPrev, togglePlay]);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
  }, [src]);

  if (!src) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-black text-xs text-[var(--studio-text-tertiary)]">
        Select media to preview
      </div>
    );
  }

  if (kind === "image") {
    return (
      <div className="relative overflow-hidden rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-black">
        <img src={src} alt="" className="max-h-[min(52vh,480px)] w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--studio-radius-md)] border border-[var(--studio-border)] bg-black">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={src}
          poster={poster ?? undefined}
          playsInline
          className="absolute inset-0 h-full w-full object-contain"
          onTimeUpdate={() => setTime(videoRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => {
            setDuration(videoRef.current?.duration ?? 0);
            if (videoRef.current) videoRef.current.playbackRate = rate;
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
        />
      </div>
      <div className="space-y-2 border-t border-[var(--studio-border)] bg-[var(--studio-bg-2)] p-3">
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.05}
          value={time}
          onChange={(e) => {
            const next = Number(e.target.value);
            setTime(next);
            if (videoRef.current) videoRef.current.currentTime = next;
          }}
          className="w-full accent-[var(--studio-accent)]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--studio-text-secondary)]">
          <span>
            {formatTs(time)} / {formatTs(duration)}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={togglePlay}
              className="rounded p-1.5 hover:bg-[var(--studio-bg-hover)]"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const el = videoRef.current;
                if (!el) return;
                el.muted = !el.muted;
                setMuted(el.muted);
              }}
              className="rounded p-1.5 hover:bg-[var(--studio-bg-hover)]"
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <select
              value={rate}
              onChange={(e) => {
                const next = Number(e.target.value);
                setRate(next);
                if (videoRef.current) videoRef.current.playbackRate = next;
              }}
              className="rounded border border-[var(--studio-border)] bg-[var(--studio-bg-3)] px-1 py-0.5"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded p-1.5 hover:bg-[var(--studio-bg-hover)]"
              onClick={() => videoRef.current?.requestFullscreen?.()}
              aria-label="Fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

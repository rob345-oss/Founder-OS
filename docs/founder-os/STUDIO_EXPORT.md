# Studio FFmpeg export design (Phase 2B prep)

Export is **not implemented** in Phase 2B. This document defines how a future renderer turns `StudioTimelineProject` into FFmpeg operations.

## Job interface (proposed)

```ts
type StudioExportJob = {
  id: string;
  projectId: string;
  presetId: string;
  status: "queued" | "running" | "completed" | "failed";
  outputPath: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  progress: number; // 0–1
};
```

Jobs are stored in SQLite (`export_jobs` table, future migration) and executed by a local worker process that shells out to `ffmpeg` / `ffprobe` (same host assumptions as media scan).

## Render graph

1. Load `StudioTimelineProject` from `projects.timeline_json`.
2. Resolve each `StudioTimelineClipInstance` to an absolute file path via `media` + `directories`.
3. For each clip, build a **filter segment**:
   - Input seek: `-ss {sourceInSeconds}` before `-i` (keyframe seek; not frame-accurate until re-encoded with `trim` filter).
   - Duration: `-t {clipSequenceDuration}`.
4. Concatenate video segments with `concat` demuxer or `xfade` (future).
5. Apply canvas:
   - `scale` + `pad` to target resolution preserving aspect ratio (letterbox/pillarbox).
6. Audio:
   - Map first audio stream per clip; `concat` audio; optional separate audio tracks later via multitrack JSON.
7. Mux to preset container (MP4/MOV).

## Presets

| Preset | Resolution | FPS | Container | Notes |
|--------|------------|-----|-----------|-------|
| `reels_9_16` | 1080x1920 | 30 | MP4 | Default TikTok/Reels |
| `youtube_16_9` | 1920x1080 | 30 | MP4 | Letterbox sources |
| `master_prores` | source max | source | MOV | ProRes proxy for finishing |

## Mixed frame rates

- Project `frameRate` is authoritative for output.
- Per-clip `media.frame_rate` mismatch → `fps=FRAME_RATE` filter after `setpts` normalization.
- Document drift risk; optional `minterpolate` off by default (quality vs speed).

## Missing files

- Pre-flight validator lists offline clips (`media.missing = 1`).
- Job fails fast with user-visible report; partial export optional behind flag.

## Aspect ratios

- Canvas from `project.aspectRatio`.
- Source taller/wider → pad with black (or blurred background in future preset).

## Non-destructive guarantee

- FFmpeg reads source paths read-only.
- Output writes to `Studio/exports/{jobId}.mp4` never overwrites sources.

## iOS / cloud

- Export jobs reference timeline JSON + media IDs only for remote orchestration; binaries stay local until explicit upload phase.

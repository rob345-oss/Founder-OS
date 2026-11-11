# Founder OS Studio — Phase 2C report

## Export features

- Local FFmpeg render from persisted `StudioTimelineProject` (SQLite `projects.timeline_json`).
- Presets: Vertical Social (1080×1920), Landscape (1920×1080), Square (1080×1080); quality CRF high/standard/fast.
- Letterbox/pillarbox fit (`scale` + `pad`, no surprise crop).
- Trim via `trim`/`atrim` filters; repeated source files as separate inputs.
- Silent clips: `anullsrc` stereo bed; clips with audio: `atrim` + `aresample` + `concat`.
- Export modal in editor; `/studio/exports` history with play, reveal, progress polling.
- Single concurrent worker queue; cancel with process kill; interrupted jobs → `failed` on restart.

## FFmpeg architecture

1. `resolveExportRenderPlan` — validate saved timeline, resolve indexed paths, `ffprobe` audio presence.
2. `buildFilterComplex` (`packages/studio/src/export-plan.ts`) — per-clip video+audio chains, `concat`.
3. `buildFfmpegArgs` — spawn array only (`shell: false`), `-progress pipe:1` for real `out_time_ms`.
4. Temp file in `%LOCALAPPDATA%/FounderOS/Studio/export-temp/{jobId}.part.mp4`, atomic `rename` on success.
5. Binaries: `PATH`, `FFMPEG_PATH` / `FFPROBE_PATH`, common Windows install paths.

## Windows setup

```powershell
winget install Gyan.FFmpeg
# or download from https://www.gyan.dev/ffmpeg/builds/ and add ...\bin to PATH
```

Optional `apps/web/.env.local`:

```env
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe
```

## Tests

- `packages/studio/src/__tests__/export-plan.test.ts`
- `apps/web/src/lib/studio/server/__tests__/export-*.test.ts`
- Integration render test skips when FFmpeg is not installed.

## Known limitations

- One render at a time (queued jobs wait).
- Progress derived from FFmpeg `out_time_ms` vs planned duration (not frame-indexed).
- Destination picker is Windows folder dialog; macOS reveal only.
- `FOUNDER_OS_STUDIO_MEDIA_ROOT` still applies to **source** reads, not export output dir (user-chosen validated folders).

## Branch

`feature/studio-export-2c` from `feature/studio-timeline-2b`.

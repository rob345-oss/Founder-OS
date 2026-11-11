# Studio timeline architecture (Phase 2A proposal)

## Goals

- **Non-destructive**: source media on disk is never rewritten; the timeline references `StudioMediaItem.id` values from the local SQLite index.
- **Local-first**: timeline JSON lives beside `studio.db` under `%LOCALAPPDATA%\FounderOS\Studio` (future `timelines/{projectId}.json`).
- **iOS-ready**: types live in `packages/studio/src/timeline.ts` and mirror what a future mobile review app would sync (metadata only).

## Core model

| Concept | Purpose |
|--------|---------|
| `StudioTimelineProject` | Root document: aspect ratio, frame rate, duration, ordered tracks |
| `StudioTimelineTrack` | Video, audio, or captions lane; supports future `lane` stacking |
| `StudioTimelineClipInstance` | One placed clip: `sourceMediaId`, in/out on source, `timelineStartSeconds` on sequence |

Clip instances are **not** the same as media items: the same hook take can appear twice with different trims.

## Duration and aspect ratio

- **Project duration** = max end time across all tracks (computed; also stored for export presets).
- **Aspect ratio** = project canvas (9:16, 16:9) independent of source clip ratios; letterboxing handled at render time (Phase 3).

## Future tracks

- **Audio**: separate track type; optional link to video clip via `metadata.linkedClipId`.
- **Captions**: `extensions.captions[]` or dedicated captions track with text + time ranges.
- **AI edits**: `extensions.aiEdits[]` stores proposals (cut points, B-roll suggestions) without applying them until the user accepts.

## Editor (Phase 2B)

- `projects.timeline_json` stores the full `StudioTimelineProject` (auto-saved).
- First open without JSON hydrates from legacy `project_media` order (one full-length clip per id).
- `TimelineEditor` is the interactive UI; `TimelineShell` remains unused legacy shell.
- FFmpeg export graph is designed in [STUDIO_EXPORT.md](./STUDIO_EXPORT.md), not implemented.

## Future

- Optional Supabase sync: timeline metadata only; never binary media.
- Multitrack audio/captions editing and export worker (Phase 3).

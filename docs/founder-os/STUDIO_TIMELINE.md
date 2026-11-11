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

## Editor shell today (Phase 2A)

- `StudioProject.mediaIds` is an ordered **import queue** (browser + timeline drop target).
- `TimelineShell` is visual only; dropping clips updates the queue and `PUT /api/studio/projects/:id/media`.
- Full multitrack UI and FFmpeg render graph are explicitly out of scope until Phase 2B/3.

## Persistence plan (next phase)

1. On first open of a project in the editor, hydrate `StudioTimelineProject` from `mediaIds` (one full-length clip per id on track `video-1`).
2. Save timeline mutations to SQLite (`project_timeline_json`) or sidecar JSON with schema version.
3. Optional Supabase sync: timeline metadata only; never binary media.

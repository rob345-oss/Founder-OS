# Founder OS Studio — Phase 2B report

## Implemented

- Persistent non-destructive timeline in SQLite (`projects.timeline_json`, schema v2).
- Clip instances with unique IDs, source in/out, timeline positions, video track ID.
- Editor: drop from library, reorder (drag), remove instance, trim handles, duplicate, undo/redo, keyboard shortcuts, zoom, ruler, playhead, snap, timecode.
- Auto-save on timeline mutations when `projectId` is present (`PUT /api/studio/projects/:id/timeline`).
- Hydration from legacy `project_media` queue when no JSON exists (migration compatibility).
- Sequence preview: seeks to source time, respects trims, advances across clips, missing media warning.
- Export architecture documented in [STUDIO_EXPORT.md](./STUDIO_EXPORT.md).

## Persistence architecture

- **Source of truth**: `projects.timeline_json` — full `StudioTimelineProject` document (`schemaVersion: 1`).
- **Legacy index**: `project_media` updated with unique source IDs in sequence order for overview compatibility (duplicates not representable in that table).
- **Domain logic**: `packages/studio/src/timeline-ops.ts` (shared with future iOS).
- **Migration**: On DB open, `ALTER TABLE projects ADD COLUMN timeline_json` when schema &lt; 2.

## Playback architecture

- `buildSequenceSegments` + `resolveSequenceTime` map sequence time → clip + source timestamp.
- `SequenceVideoPreview` loads `/api/studio/media/:id/stream`, sets `currentTime` to resolved source position, listens to `timeupdate` to advance playhead and jump to next clip at trim out-point.
- Not verified frame-accurate; browser keyframe seek applies.

## Tests

- `timeline-ops.test.ts` — ordering, trim validation, duplicate, playback resolve.
- `timeline-persistence.test.ts` — migration + save/reload.
- Run: `npm run test:studio -w apps/web`

## Known limitations

- Single active video track editing (audio/captions lanes are visual placeholders).
- Trim preview updates on pointer up (not live during drag).
- No FFmpeg export worker yet.
- Session editor without `?projectId=` does not auto-save to SQLite.
- Ruler tick labels approximate when heavily zoomed.

## Local test instructions

1. `npm install` at repo root.
2. `npm run dev -w apps/web`
3. Open `/studio/media` — add a folder, scan videos.
4. Create or open a project → **Edit** (or `/studio/editor?projectId=...`).
5. Drag three clips to the timeline, trim, reorder, close browser tab.
6. Reopen the same project URL — sequence and trims should match.

## Branch

`feature/studio-timeline-2b` from `feature/studio-media-library-2` (Phase 2A).

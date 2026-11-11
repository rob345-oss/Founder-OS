# Studio Phase 2A — stabilization report

Branch: `feature/studio-media-library-2` (not merged / not deployed).

## 1. Test results (local, 2026-11-11)

| Suite | Command | Result |
|-------|---------|--------|
| Studio Vitest | `cd apps/web && npm run test:studio` | **15 passed** (6 files) |
| Web typecheck | `npm run typecheck -w founder-os-web` | **Pass** |
| API regression | `pytest -v` in `services/api` | **4 passed** |

FFmpeg: when `ffmpeg`/`ffprobe` are on `PATH`, `ffprobe.test.ts` generates a synthetic MP4 and asserts probe + thumbnail. Without FFmpeg, probe gracefully returns nulls (covered).

## 2. Security findings

| Area | Status | Notes |
|------|--------|-------|
| Vercel / hosted FS | OK | `VERCEL=1` → 403 on all studio APIs (tested) |
| Loopback + same-site | OK | Origin/Referer must match host; optional `STUDIO_LOCAL_TOKEN` |
| Path traversal | OK | `paths.test.ts` |
| Reveal in Explorer | OK | Server resolves file inside authorized roots only; no path in JSON response |
| Stream URLs | OK (existing) | Re-validates path inside authorized directory |

**Residual risk:** `NEXT_PUBLIC_STUDIO_LOCAL_TOKEN` is public if set — treat as nuisance protection only (documented in `STUDIO.md`).

## 3. Screenshots

Committed under `docs/founder-os/screenshots/phase-2a/`:

- `studio-overview-1920.png`
- `studio-media-1440.png`
- `studio-editor-1440.png`

(Captured at 1440×900 and 1920×1080 viewports via local `next dev` on port 3001.)

## 4. Implemented in this phase

- **Tests:** scan runner, guard, ffprobe/fixtures, media id stability, repository (existing).
- **Offline files:** rescan marks missing instead of deleting metadata; **Offline / Missing** library filter.
- **UX:** drag-and-drop to collections + timeline; context menu; arrow-key selection; per-folder rescan; scan progress bar; clearer offline badges.
- **Reveal in Explorer:** `POST /api/studio/media/:id/reveal` (Win/macOS).
- **CI:** `npm run test:studio` in `.github/workflows/ci.yml`.
- **Timeline model:** `packages/studio/src/timeline.ts` + [STUDIO_TIMELINE.md](./STUDIO_TIMELINE.md).

## 5. Remaining limitations

- Full timeline UI, trim, multitrack audio, captions, export/render — still shell-only.
- Windows folder picker validated on Win32 only (501 on other OS — paste path).
- Large directory scans are single-threaded Node walks (no worker farm yet).
- Compare takes / bulk editor require indexed media (not exercised in empty-library screenshots).
- iOS app not wired; shared types only.

## 6. Manual validation checklist (operator)

Run on Windows with real footage (optional; does not modify sources):

1. Add Media Folder → picker or path → background scan with cancel.
2. Preview MP4/MOV stream + thumbnails (FFmpeg on PATH).
3. Tag, rate, bulk select, collection, project queue.
4. Drag clip to collection and editor timeline.
5. Reveal in Explorer on an authorized file.
6. Delete/move file → rescan → **Offline / Missing** filter.

## 7. PR

Open from `feature/studio-media-library-2` after commit push (see chat for URL).

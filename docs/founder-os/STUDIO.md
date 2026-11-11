# Founder OS Studio (Phase 1)

Premium local-first video production UI inside `apps/web`. Raw footage stays on disk; the browser talks to **Next.js route handlers on your machine** for indexing and streaming.

## Launch on Windows

```powershell
cd c:\path\to\Founder-OS
npm install
cd apps\web
copy ..\..\.env.example .env.local   # optional Supabase for Command Center
npm run dev
```

Open [http://localhost:3000/studio](http://localhost:3000/studio).

Optional: install [FFmpeg](https://ffmpeg.org/) and ensure `ffprobe` / `ffmpeg` are on `PATH` for duration, resolution, and JPEG thumbnails.

### Production mode locally (`next build` + `next start`)

```powershell
$env:STUDIO_ENABLE_LOCAL_FS="true"
npm run start
```

## Local media workflow (works today)

1. **Media Library** or **Overview** → authorize an absolute folder (e.g. `D:\Footage\Reels`).
2. **Scan library** / **Refresh index** — recursively indexes `.mp4`, `.mov`, `.m4v`, `.webm`, `.mkv`.
3. Browse grid/list, preview video, assign **content category** (hook, body, CTA, etc.).
4. **Editor** — preview selected indexed clips; timeline is shell-only (optional demo clips toggle).

Data directory (default): `%LOCALAPPDATA%\FounderOS\Studio` (`index.json` + `thumbnails/`). Override with `FOUNDER_OS_STUDIO_DATA_DIR`.

## Security model

| Control | Behavior |
|---------|----------|
| **Vercel / `VERCEL=1`** | All `/api/studio/*` routes return **403** — no hosted deployment can touch a deployment disk as a stand-in for your PC. |
| **Production** | Local FS APIs disabled unless `STUDIO_ENABLE_LOCAL_FS=true` (set only on **your** local `next start`). |
| **Loopback** | Without `STUDIO_LOCAL_TOKEN`, requests must target `localhost` / `127.0.0.1` / `::1` (hostname check, not spoofable `Host` alone). |
| **Token** | Server secret is **`STUDIO_LOCAL_TOKEN`** only. The browser may send the same value via `X-Studio-Local-Token` when you set **`NEXT_PUBLIC_STUDIO_LOCAL_TOKEN`** — that value is **public** (bundled in JS) and is optional nuisance protection, not confidentiality. |
| **Same-site** | `Origin` / `Referer` must match the app host when present, reducing cross-site loopback embedding of stream URLs. |
| **Directories** | Only paths you authorize; canonicalized with `realpath`; traversal and `..` segments rejected. |
| **Streaming** | Resolved file path re-validated inside authorized roots (symlink-safe). |
| **Responses** | Full Windows paths are not returned in JSON APIs. |

**Your PC footage cannot be read through a remote Vercel URL** — those route handlers either do not run against your filesystem on Vercel (blocked), or when developing locally, only your local Node process can read disks you authorize.

## Shared types

`packages/studio` — categories, pipeline stages, media/project schemas for future iOS and API contracts.

## Placeholders (UI only)

AI Studio generate, export, templates, captions, timeline editing, cloud sync, multi-user collaboration.

## Phase 2 suggestions

1. FastAPI or worker-backed scan jobs + progress for large libraries.
2. Transcript ingest (local Whisper) tied to `StudioMediaAiFields`.
3. Non-destructive timeline project files linking media IDs.
4. FFmpeg render queue and export presets per platform.
5. Opt-in Supabase sync of metadata (not raw video) for iOS review app.

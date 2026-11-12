# Founder OS — Independent iOS marketing architecture

This document covers **Founder OS marketing mobile** (`apps/marketing-ios`). It is **not** the Titanium Guardian customer app (`senior-cybersecurity-346/mobile`).

## Build tracks (same codebase, two installable apps)

| Track | Display name | Bundle ID | EAS build profile | OTA channel |
| --- | --- | --- | --- | --- |
| **Dev** | Founder OS Dev | `com.founderos.app.dev` | `development` | `development` |
| **Lab** | Founder OS Lab | `com.founderos.app.lab` | `preview-lab` | `preview-lab` |

Configuration:

- `app.config.ts` — bundle ID, scheme, and `extra.fosAppTrack` from `EXPO_PUBLIC_FOS_APP_TRACK`
- `eas.json` — isolated channels (never `preview-lab` / `development` TG channels on TG bundles)
- `env.contract.json` + `npm run validate:env` — local isolation checks (no EAS login)
- `scripts/ios/founder-os-apple.contract.json` + `Set-FounderOSAppleEnvironment.ps1` — Apple Developer ID `robertdsicora@gmail.com`, team `T3KM8V39H7` (see [scripts/ios/README.md](../../scripts/ios/README.md))

**Identifier availability:** Apple App ID registration and Expo `eas init` were **not** run in-repo. Before first device build, confirm both bundle IDs are free in [Apple Developer → Identifiers](https://developer.apple.com/account/resources/identifiers/list) and create a **new** Expo project (do not attach TG project `8e571169-1b49-4d9d-b466-9507ac05decf`).

## What exists today (audit summary)

### Mobile

| Path | Role | Maturity |
| --- | --- | --- |
| `apps/marketing-ios` | Marketing Command Center (Expo Router, SQLite on device) | **Primary** — rich local UX; no cloud auth/sync yet |
| `apps/mobile` | Legacy founder dashboard (Supabase + FastAPI) | **Deprecated** — `com.titanium.founderos` bundle; not a third install track |

EAS for **Founder OS marketing**: `apps/marketing-ios/eas.json` added locally; **no** `extra.eas.projectId` until you run `eas init`.  
EAS for **Titanium Guardian**: external repo only; triggered from `/infrastructure` via `INFRASTRUCTURE_TG_REPO_PATH` (unchanged).

### Web / Studio (marketing operations — desktop)

- **Content production pipeline** — functional on **local** Next.js (`/studio/pipeline`): productions, stages, campaigns, approvals, comments, publishing targets, dashboard APIs under `/api/studio/productions/*` (SQLite in `%LOCALAPPDATA%/FounderOS/Studio`).
- **Media library** — functional locally: scan, thumbnails (FFmpeg), categories, collections, compare, editor shell.
- **Blocked on Vercel** — `assertStudioLocalRequest` returns 403 for hosted deploys; requires your PC + `FOUNDER_OS_STUDIO_MEDIA_ROOT`.
- **Placeholders** — timeline editing, AI generation, social OAuth publish, cloud metadata sync to mobile.

### Backend

| Component | Data | Auth |
| --- | --- | --- |
| `services/api` (FastAPI) | Supabase Postgres schema `founder_os` | JWT + `FOUNDER_USER_IDS` allowlist |
| `apps/web` (Next.js) | Studio SQLite; Infrastructure diagnostics | Supabase session (server routes) |
| `apps/marketing-ios` | On-device SQLite | None (prototype) |

Shared Supabase **project** with TG is documented in `docs/SUPABASE_ISOLATION.md` (schema `founder_os`, dedicated DB roles). Production DDL for `founder_os` may still be pending on live project.

### Titanium Guardian dependencies

| Integration | Purpose | Isolation |
| --- | --- | --- |
| `/infrastructure` | TG health, EAS history, optional staging admin probe | Server-only tokens; does not ship in marketing iOS app |
| Studio media root | Often TG commercial footage folder on disk | Path only; not TG app DB |
| Shared Supabase Auth project | Web sign-in | Allowlist separates founders from TG customers |

Marketing iOS **does not** call TG mobile APIs or use TG bundle IDs when validation passes.

## Data isolation recommendation

**Short term (Dev daily use):**

- Keep **persistent** marketing pipeline data on **desktop Studio SQLite** (source of truth today).
- **Dev iOS app**: on-device SQLite (current prototype) until sync API exists; treat as personal cockpit, not shared team DB.

**Medium term:**

1. **Option A (lighter):** Stay on shared Supabase project; store marketing/sync tables only in `founder_os` with RLS + `founder_os_app` role (align with API).
2. **Option B (stronger):** New Supabase project `founder-os-mobile` for marketing sync + auth; TG project used only via read-only/service bridges if needed.

**Lab vs Dev data:**

- Separate bundle IDs ⇒ separate app sandboxes ⇒ separate on-device SQLite automatically.
- When cloud sync ships, use `EXPO_PUBLIC_APP_ENV` / track in API namespace (`lab.*` vs `dev.*` tables or row `environment` column) so Lab experiments never overwrite Dev.

Never embed `SUPABASE_SERVICE_ROLE_KEY`, social app secrets, or `STUDIO_LOCAL_TOKEN` in the mobile client.

## Mobile feature roadmap (reuse vs build)

| Priority | Web/Studio today | iOS path |
| --- | --- | --- |
| Marketing overview / tasks | Production dashboard API (local) | Proxy APIs + auth; or sync subset to SQLite |
| Content pipeline | Full CRUD + kanban (local) | Read-only milestone → mobile approvals |
| Video/post tracking | Productions + publishing targets | List + stage transitions via API |
| Publishing queue | `production_publishing` | Read/update URL + manual published state |
| Human approval | `production_approvals` | Push notification (later) + approve/reject |
| Media library | Local FS + stream URLs | Thumbnails/metadata sync only (no raw library on phone) |
| Campaign analytics | Studio + marketing-ios local metrics | Unify via API; CSV import already on iOS |
| Notifications | None | Expo notifications + server triggers (later) |

**Desktop-only today:** FFmpeg scan/thumbnail, folder picker, `ffprobe`, large file stream — need **server-side media gateway** or **paired LAN** access for iOS parity.

## Manual setup checklist (you — not automated)

### Required before first **billable** EAS iOS build

1. [Apple Developer Program](https://developer.apple.com/programs/) — active membership.
2. Register App IDs: `com.founderos.app.dev`, `com.founderos.app.lab`.
3. [Expo account](https://expo.dev/signup) — **new project** under `founder-os-marketing` slug (`eas init` in `apps/marketing-ios`).
4. `eas credentials` / automatic credentials — per profile (`development`, `preview-lab`).
5. Register test devices (internal distribution).
6. Set EAS Secrets: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` (and later API URL for Cloud Run).
7. Supabase: enable Auth for your founder user; set `FOUNDER_USER_IDS` on API.

### Optional (later)

- Push credentials (APNs) for approvals/reminders.
- Social OAuth (Meta/LinkedIn) — server-side only.
- App Store Connect listing (production track not defined yet).

### Do **not** do without explicit approval

- `eas build` (billable)
- `eas submit`
- Production Supabase DDL / migration on TG project
- Reusing TG OAuth client IDs or EAS project UUID

**Links**

- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Update channels: https://docs.expo.dev/eas-update/how-it-works/
- Internal distribution: https://docs.expo.dev/build/internal-distribution/
- Expo env vars: https://docs.expo.dev/eas/environment-variables/

## Work Cursor can do next (safe, local)

- Wire marketing-iOS to FastAPI read APIs with Supabase session.
- Shared types from `@founder-os/studio` / `packages/contracts` for production DTOs.
- LAN Studio bridge (device token) for read-only pipeline while cloud sync is designed.
- CI job running `validate:env` + `npm test` (no EAS).

## First safe implementation milestone

1. Run `cd apps/marketing-ios && npm run validate:env && npm test && npm run typecheck`.
2. You: `eas init` (new project), register Apple App IDs, set EAS secrets — **no build yet**.
3. Implement Supabase magic link / password auth on marketing-iOS Dev only.
4. Read-only production list from FastAPI or a thin sync endpoint (founder allowlist).

## Risks and controls

| Risk | Control |
| --- | --- |
| Bundle ID collision with TG | `validate-mobile-env.mjs` + forbidden prefixes in `env.contract.json` |
| Shared TG Expo project | Forbidden project UUID in validator; separate `eas init` |
| Service role in client | `forbiddenInClient` list; code review on `extra` in app.config |
| Lab overwrites Dev data | Separate bundles; future API `environment` dimension |
| Studio APIs exposed publicly | Keep 403 on Vercel; mobile uses Cloud Run + auth, not loopback token |
| Accidental TG EAS build | Infrastructure gates unchanged; FO builds use `apps/marketing-ios` only |

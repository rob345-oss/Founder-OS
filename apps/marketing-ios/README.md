# Founder OS Marketing (Expo / iOS)

Local-first marketing workspace with **two installable tracks** on the same iPhone (isolated from Titanium Guardian apps):

| Track | Env var | Bundle ID |
| --- | --- | --- |
| **Founder OS Dev** | `EXPO_PUBLIC_FOS_APP_TRACK=development` | `com.founderos.app.dev` |
| **Founder OS Lab** | `EXPO_PUBLIC_FOS_APP_TRACK=lab` | `com.founderos.app.lab` |

See [docs/founder-os/MOBILE_IOS_ARCHITECTURE.md](../../docs/founder-os/MOBILE_IOS_ARCHITECTURE.md).

Data lives in SQLite on device today; Supabase + API wiring is planned. No login in the current prototype.

## Prerequisites

- Node.js 20+
- Xcode (for iOS Simulator) or Expo Go on a physical device
- This folder participates in the monorepo workspace; from the repo root run `npm install` after pulling.

## Commands

```bash
cd apps/marketing-ios
npm install   # if not hoisted from root
npm run start    # Expo dev server
npm run ios      # iOS simulator (macOS)
npm run typecheck
npm test
```

## CSV import (Analytics)

Header row (case-insensitive):

`platform,kpi,value,period_start,period_end,measurement_type`

- `measurement_type`: `actual` or `calculated` (default `actual`)
- `platform` / `kpi` must match app enums (e.g. `linkedin`, `followers`)

## EAS / validation (no billable builds in CI yet)

```bash
cp .env.example .env   # optional for local Supabase/API URLs
npm run validate:env
npm run validate:env:lab
npm run validate:apple
```

- Profiles: `development` (Dev client, channel `development`), `preview-lab` (channel `preview-lab`).
- Expo project: [@robert_sicora/founder-os-marketing](https://expo.dev/accounts/robert_sicora/projects/founder-os-marketing) (`f29123e5-7119-46f0-8eb3-05f7f8824048`) — not Titanium Guardian.
- **Apple Developer** (signing, devices, App Store Connect): `robertdsicora@gmail.com`, team `T3KM8V39H7`. See [scripts/ios/README.md](../../scripts/ios/README.md).
- Do not run raw `eas build` without loading the PowerShell Apple env — use `scripts/ios/Start-FounderOSDevIosBuild.ps1` after dot-sourcing `Set-FounderOSAppleEnvironment.ps1`.

## Architecture (short)

- `app/` — Expo Router screens (tabs + stack for Scorecard & Settings)
- `lib/db/` — SQLite schema and migrations
- `lib/data/repository.ts` — persistence API
- `lib/domain/` — goal progress, scorecard, recommendations, analytics helpers
- `lib/integrations/` — connector interfaces (no live OAuth)
- `lib/ai/` — future assistant stub
- `context/WorkspaceContext.tsx` — active workspace

See the repository-level deliverable section in the parent README after merge.

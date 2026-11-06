# Marketing Command Center (Expo / iOS)

Local-first marketing workspace for Founder OS. Data lives in SQLite on device; no login or cloud APIs in this prototype.

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

## EAS / bundle identity

- **iOS bundle ID:** `com.founderos.marketing.commandcenter` (see `app.json`)
- Create a **separate** Expo/EAS project for this app so it does not share credentials with Titanium Guardian.

## Architecture (short)

- `app/` — Expo Router screens (tabs + stack for Scorecard & Settings)
- `lib/db/` — SQLite schema and migrations
- `lib/data/repository.ts` — persistence API
- `lib/domain/` — goal progress, scorecard, recommendations, analytics helpers
- `lib/integrations/` — connector interfaces (no live OAuth)
- `lib/ai/` — future assistant stub
- `context/WorkspaceContext.tsx` — active workspace

See the repository-level deliverable section in the parent README after merge.

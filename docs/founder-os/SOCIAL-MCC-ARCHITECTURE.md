# Social Marketing Command Center — Phase 0 / M1 Architecture

## Branch

`feature/social-marketing-command-center` (from CRM + marketing baseline).

## Reused

| Area | Location |
|------|-----------|
| Marketing shell, auth | `MarketingShell`, `requireMarketingSuperAdmin` (CRM super_admin) |
| Executive growth dashboard | `/marketing`, `buildMarketingOverview` |
| Campaigns CRUD | `marketing_campaigns`, `/marketing/campaigns` |
| Integrations probe | `collectMarketingSocialIntegrations` (Meta, LinkedIn env) |
| CRM waitlist attribution | `crm_contacts.waitlist_snapshot` UTM fields |
| Migrations runner | `apps/web/scripts/apply-crm-migrations-staging.mjs` |
| Design tokens | Studio CSS variables on marketing pages |

## Created (M1)

| Area | Location |
|------|-----------|
| Postgres tables | `000010_social_command_center.sql`, RLS `000011_*` |
| SQLite parity | `apps/web/src/lib/marketing/server/db.ts` |
| Domain types | `social-types.ts` |
| Repository + overview | `social-repository.ts`, `social-overview.ts` |
| Publish safety | `MARKETING_PUBLISH_ARMED` → `publish-guard.ts` |
| APIs | `/api/marketing/social/*` |
| UI routes | `/marketing/social/*` sidebar (see `nav.ts`) |
| UTM link builder | `/api/marketing/social/links` |

## Not connected (by design)

- OAuth token storage / encrypted refresh (M4 adapters)
- Automatic platform publish workers
- GA4 website visitors in social funnel
- AI writing assistant (M2/M4)
- Demo/fake KPI seed data

## Staging host + static assets

On `staging.titaniumguardian.com`, `/marketing/*` HTML is **rewritten** to the `founder-os-web` Vercel project (see `.tg-ref/frontend/vercel.json`). Relative `/_next/static/*` URLs in that HTML would otherwise resolve on the **Titanium Guardian frontend** and load the wrong CSS bundle (unstyled marketing UI).

**Fix:** set `FOUNDER_OS_ASSET_PREFIX=/founder-os-assets` on the **founder-os-web** Vercel project at build time (`apps/web/next.config.ts`), deploy founder-os-web, then deploy the TG frontend (`frontend/vercel.json` on the Titanium Guardian repo) with this additional rewrite:

```json
{
  "source": "/founder-os-assets/_next/:path*",
  "has": [{ "type": "host", "value": "staging.titaniumguardian.com" }],
  "destination": "https://founder-os-web-blush.vercel.app/founder-os-assets/_next/:path*"
}
```

## Staging

Apply migrations only to staging Postgres:

```bash
cd apps/web
npm run crm:apply-migrations
```

Keep `MARKETING_PUBLISH_ARMED` unset on all environments until an explicit production GO.
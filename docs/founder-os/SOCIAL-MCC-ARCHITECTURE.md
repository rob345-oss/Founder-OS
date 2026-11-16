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

## Staging

Apply migrations only to staging Postgres:

```bash
cd apps/web
npm run crm:apply-migrations
```

Keep `MARKETING_PUBLISH_ARMED` unset on all environments until an explicit production GO.
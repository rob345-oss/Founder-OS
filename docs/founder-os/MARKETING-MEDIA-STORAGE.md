# Marketing social media storage (staging)

## Database

Apply migration `supabase/migrations/000012_marketing_media_assets_metadata.sql` on staging Postgres before enabling uploads in production-like environments.

## Object storage

- **Local (default):** files under `{MARKETING_DATA_DIR}/marketing-media/` (same base as CRM `FOUNDER_OS_CRM_DATA_DIR`). Used for local dev and single-node deployments.
- **Supabase (staging/production on Vercel):** set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `MARKETING_SUPABASE_SERVICE_ROLE_KEY`), and optionally `MARKETING_MEDIA_STORAGE=supabase`.

Create a **private** bucket named `marketing-social-media` in Supabase. Do not expose the service role key to the browser; all uploads go through `POST /api/marketing/social/media-assets` with super_admin bearer auth.

## Canonical routes

- Media library UI: `/marketing/social/media`
- APIs: `/api/marketing/social/media-assets/*`

Titanium Guardian rewrites should continue to proxy these paths to Founder OS unchanged.
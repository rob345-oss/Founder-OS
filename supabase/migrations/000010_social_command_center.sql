-- Social Marketing Command Center (staging first, additive)
SET search_path TO founder_os, public;

CREATE TABLE IF NOT EXISTS founder_os.marketing_social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'instagram', 'facebook', 'youtube', 'tiktok', 'x')),
    account_label TEXT,
    external_account_id TEXT,
    connection_state TEXT NOT NULL DEFAULT 'not_connected'
        CHECK (connection_state IN (
            'not_connected', 'connected', 'token_expired', 'reauthorization_required',
            'permission_limited', 'sync_error'
        )),
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_sync_at TIMESTAMPTZ,
    health_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (platform, external_account_id)
);

CREATE TABLE IF NOT EXISTS founder_os.marketing_social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    internal_label TEXT,
    body_text TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'instagram', 'facebook', 'youtube', 'tiktok', 'x')),
    campaign_id UUID REFERENCES founder_os.marketing_campaigns (id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'idea'
        CHECK (status IN (
            'idea', 'draft', 'in_review', 'approved', 'scheduled', 'publishing',
            'published', 'failed', 'canceled'
        )),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    platform_permalink TEXT,
    destination_url TEXT,
    cta_text TEXT,
    hashtags TEXT,
    topic_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    media_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    external_publish_state TEXT NOT NULL DEFAULT 'planned'
        CHECK (external_publish_state IN ('planned', 'scheduled_internal', 'ready_external', 'published_verified', 'failed')),
    publish_error TEXT,
    is_manual_track_only BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_social_posts_status ON founder_os.marketing_social_posts (status);
CREATE INDEX IF NOT EXISTS idx_marketing_social_posts_scheduled ON founder_os.marketing_social_posts (scheduled_at);
CREATE INDEX IF NOT EXISTS idx_marketing_social_posts_published ON founder_os.marketing_social_posts (published_at);
CREATE INDEX IF NOT EXISTS idx_marketing_social_posts_platform ON founder_os.marketing_social_posts (platform);

CREATE TABLE IF NOT EXISTS founder_os.marketing_social_post_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES founder_os.marketing_social_posts (id) ON DELETE CASCADE,
    source TEXT NOT NULL CHECK (source IN ('manual', 'provider')),
    provider_snapshot_id TEXT,
    period_start DATE,
    period_end DATE,
    impressions BIGINT,
    reach BIGINT,
    engagements BIGINT,
    likes BIGINT,
    comments BIGINT,
    shares BIGINT,
    saves BIGINT,
    clicks BIGINT,
    video_views BIGINT,
    watch_time_sec BIGINT,
    profile_visits BIGINT,
    website_clicks BIGINT,
    followers_gained BIGINT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    synced_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_social_post_metrics_provider
    ON founder_os.marketing_social_post_metrics (post_id, source, provider_snapshot_id)
    WHERE source = 'provider' AND provider_snapshot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_social_post_metrics_post ON founder_os.marketing_social_post_metrics (post_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS founder_os.marketing_social_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'video', 'other')),
    storage_url TEXT,
    mime_type TEXT,
    byte_size BIGINT,
    width INT,
    height INT,
    duration_sec INT,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.marketing_social_attribution_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES founder_os.marketing_campaigns (id) ON DELETE SET NULL,
    post_id UUID REFERENCES founder_os.marketing_social_posts (id) ON DELETE SET NULL,
    label TEXT NOT NULL,
    destination_url TEXT NOT NULL,
    utm_source TEXT NOT NULL,
    utm_medium TEXT NOT NULL,
    utm_campaign TEXT NOT NULL,
    utm_content TEXT,
    utm_term TEXT,
    tracked_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.marketing_social_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    detail JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Marketing Command Center operational tables (REFERENCE — staging first)
SET search_path TO founder_os, public;

CREATE TABLE IF NOT EXISTS founder_os.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    objective TEXT,
    channel TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    planned_budget NUMERIC,
    actual_spend NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.marketing_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    target_value NUMERIC NOT NULL,
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'planned'
        CHECK (status IN ('planned', 'active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.marketing_content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content_type TEXT,
    platform TEXT,
    hook TEXT,
    cta TEXT,
    status TEXT NOT NULL DEFAULT 'idea'
        CHECK (status IN ('idea', 'script', 'ready_to_film', 'filmed', 'editing', 'scheduled', 'published')),
    publish_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.marketing_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    default_date_range TEXT NOT NULL DEFAULT '30d',
    timezone TEXT NOT NULL DEFAULT 'Europe/Madrid',
    qualified_lead_stages JSONB NOT NULL DEFAULT '["qualified","pilot_candidate","pilot_active","converted"]'::jsonb,
    data_refresh_note TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO founder_os.marketing_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

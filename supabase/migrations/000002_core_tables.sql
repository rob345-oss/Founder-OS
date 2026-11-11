-- Founder OS — REFERENCE ONLY (staging first, production with explicit approval)
SET search_path TO founder_os, public;

CREATE TABLE IF NOT EXISTS founder_os.ventures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venture_id UUID NOT NULL REFERENCES founder_os.ventures(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES founder_os.projects(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'backlog'
        CHECK (status IN ('backlog', 'in_progress', 'done', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID,
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category VARCHAR(64) NOT NULL,
    units DOUBLE PRECISION NOT NULL DEFAULT 0,
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add RLS + policies in 000003_rls.sql after reviewer sign-off

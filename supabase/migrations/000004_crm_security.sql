-- CRM security hardening + sync observability (staging first)
SET search_path TO founder_os, public;

CREATE TABLE IF NOT EXISTS founder_os.crm_sync_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type TEXT NOT NULL DEFAULT 'waitlist_leads',
    status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed')),
    leads_seen INTEGER NOT NULL DEFAULT 0,
    upserted INTEGER NOT NULL DEFAULT 0,
    created INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS founder_os.crm_sync_state (
    sync_key TEXT PRIMARY KEY,
    last_success_at TIMESTAMPTZ,
    last_watermark TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_webhook_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, idempotency_key)
);

-- Deny PostgREST access; server uses direct DB role with grants.
ALTER TABLE founder_os.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_note_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_webhook_receipts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA founder_os FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA founder_os FROM anon, authenticated;

-- Rollback (manual): DROP TABLE IF EXISTS founder_os.crm_webhook_receipts, founder_os.crm_sync_state, founder_os.crm_sync_runs;
-- Then DISABLE ROW LEVEL SECURITY on crm_* if reverting 000004 only.

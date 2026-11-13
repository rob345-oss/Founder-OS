-- Titanium Guardian CRM overlay (REFERENCE — apply staging first)
-- Extends founder_os with CRM tables linked to TG leads via tg_lead_id (UUID).
-- Public leads remain authoritative on TG; do not duplicate encrypted lead payloads unnecessarily.

CREATE SCHEMA IF NOT EXISTS founder_os;

SET search_path TO founder_os, public;

CREATE TABLE IF NOT EXISTS founder_os.crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tg_lead_id UUID UNIQUE,
    archived_at TIMESTAMPTZ,
    full_name TEXT NOT NULL DEFAULT '',
    primary_email TEXT NOT NULL,
    primary_email_normalized TEXT NOT NULL,
    additional_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    phone TEXT,
    country_code CHAR(2),
    preferred_language TEXT,
    organization TEXT,
    contact_source TEXT,
    classifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    relationship_status TEXT NOT NULL DEFAULT 'new'
        CHECK (relationship_status IN (
            'new', 'not_contacted', 'contacted', 'interested', 'follow_up_needed',
            'pilot_invited', 'pilot_active', 'converted', 'not_interested', 'inactive'
        )),
    pipeline_stage TEXT NOT NULL DEFAULT 'new_lead'
        CHECK (pipeline_stage IN (
            'new_lead', 'contacted', 'interested', 'qualified', 'pilot_candidate',
            'pilot_active', 'converted', 'closed'
        )),
    assigned_owner_id UUID,
    contact_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    internal_notes_summary TEXT NOT NULL DEFAULT '',
    marketing_consent BOOLEAN,
    next_follow_up_at TIMESTAMPTZ,
    last_interaction_at TIMESTAMPTZ,
    date_added TIMESTAMPTZ NOT NULL DEFAULT now(),
    waitlist_snapshot JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_contacts_email_norm
    ON founder_os.crm_contacts (primary_email_normalized)
    WHERE archived_at IS NULL AND tg_lead_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_contacts_pipeline ON founder_os.crm_contacts (pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_relationship ON founder_os.crm_contacts (relationship_status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_follow_up ON founder_os.crm_contacts (next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_archived ON founder_os.crm_contacts (archived_at);

CREATE TABLE IF NOT EXISTS founder_os.crm_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES founder_os.crm_contacts(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_note_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES founder_os.crm_notes(id) ON DELETE CASCADE,
    editor_user_id UUID NOT NULL,
    previous_body TEXT NOT NULL,
    revised_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES founder_os.crm_contacts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'crm',
    idempotency_key TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (contact_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_crm_activities_contact ON founder_os.crm_activities (contact_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS founder_os.crm_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES founder_os.crm_contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'cancelled')),
    assigned_owner_id UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_follow_ups_due ON founder_os.crm_follow_ups (status, due_at);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES founder_os.crm_contacts(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'twilio_sendgrid',
    provider_message_id TEXT,
    direction TEXT NOT NULL DEFAULT 'outbound'
        CHECK (direction IN ('outbound', 'inbound')),
    from_address TEXT,
    to_address TEXT NOT NULL,
    subject TEXT,
    template_key TEXT,
    campaign_key TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (delivery_status IN (
            'draft', 'queued', 'sent', 'delivered', 'bounced', 'failed'
        )),
    sent_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_contact ON founder_os.crm_email_messages (contact_id, sent_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_email_provider_id
    ON founder_os.crm_email_messages (provider, provider_message_id)
    WHERE provider_message_id IS NOT NULL;

-- RLS policies in a follow-up migration after security review.

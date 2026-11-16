-- CRM Email Campaign Manager (additive — staging first)
SET search_path TO founder_os, public;

-- Reusable labels (many-to-many with campaigns and templates)
CREATE TABLE IF NOT EXISTS founder_os.crm_email_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#5b8cff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'es')),
    communication_type TEXT NOT NULL DEFAULT 'promotional'
        CHECK (communication_type IN ('transactional', 'promotional')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    from_name TEXT NOT NULL DEFAULT 'Titanium Guardian',
    from_address TEXT,
    subject_default TEXT NOT NULL DEFAULT '',
    preview_text_default TEXT NOT NULL DEFAULT '',
    current_version_id UUID,
    created_by_user_id UUID,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES founder_os.crm_email_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
    html_body TEXT NOT NULL DEFAULT '',
    text_body TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    preview_text TEXT NOT NULL DEFAULT '',
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, version_number)
);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_template_labels (
    template_id UUID NOT NULL REFERENCES founder_os.crm_email_templates(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES founder_os.crm_email_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (template_id, label_id)
);

-- Saved audience definitions (JSON filter DSL)
CREATE TABLE IF NOT EXISTS founder_os.crm_email_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    internal_notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN (
            'draft', 'scheduled', 'sending', 'completed', 'paused',
            'cancelled', 'failed', 'partially_completed'
        )),
    communication_type TEXT NOT NULL DEFAULT 'promotional'
        CHECK (communication_type IN ('transactional', 'promotional')),
    template_id UUID REFERENCES founder_os.crm_email_templates(id) ON DELETE SET NULL,
    template_version_id UUID REFERENCES founder_os.crm_email_template_versions(id) ON DELETE SET NULL,
    subject TEXT NOT NULL DEFAULT '',
    preview_text TEXT NOT NULL DEFAULT '',
    from_name TEXT NOT NULL DEFAULT 'Titanium Guardian',
    from_address TEXT,
    audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
    excluded_contact_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_recipients INTEGER,
    scheduled_at TIMESTAMPTZ,
    scheduled_timezone TEXT NOT NULL DEFAULT 'UTC',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_campaigns_status_scheduled
    ON founder_os.crm_email_campaigns (status, scheduled_at);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_campaign_labels (
    campaign_id UUID NOT NULL REFERENCES founder_os.crm_email_campaigns(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES founder_os.crm_email_labels(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, label_id)
);

-- Per-recipient queue row (materialized at send time)
CREATE TABLE IF NOT EXISTS founder_os.crm_email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES founder_os.crm_email_campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES founder_os.crm_contacts(id) ON DELETE CASCADE,
    email_address TEXT NOT NULL,
    personalization JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'queued', 'sent', 'skipped', 'failed', 'suppressed')),
    skip_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (campaign_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_email_campaign_recipients_campaign
    ON founder_os.crm_email_campaign_recipients (campaign_id, status);

-- Durable dispatch units (idempotent)
CREATE TABLE IF NOT EXISTS founder_os.crm_email_send_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES founder_os.crm_email_campaigns(id) ON DELETE SET NULL,
    campaign_recipient_id UUID REFERENCES founder_os.crm_email_campaign_recipients(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES founder_os.crm_contacts(id) ON DELETE SET NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    to_address TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    last_error TEXT,
    is_test BOOLEAN NOT NULL DEFAULT false,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_send_jobs_dispatch
    ON founder_os.crm_email_send_jobs (status, scheduled_at)
    WHERE status IN ('pending', 'processing');

ALTER TABLE founder_os.crm_email_messages
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES founder_os.crm_email_campaigns(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS send_job_id UUID REFERENCES founder_os.crm_email_send_jobs(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS campaign_recipient_id UUID;

CREATE INDEX IF NOT EXISTS idx_crm_email_messages_campaign
    ON founder_os.crm_email_messages (campaign_id, sent_at DESC);

-- Granular provider events (opens/clicks are approximate)
CREATE TABLE IF NOT EXISTS founder_os.crm_email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES founder_os.crm_email_messages(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES founder_os.crm_email_campaigns(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES founder_os.crm_contacts(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'twilio_email',
    provider_event_id TEXT,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'queued', 'accepted', 'delivered', 'deferred', 'bounced',
            'opened', 'clicked', 'replied', 'unsubscribed', 'spam_report', 'failed'
        )),
    is_unique BOOLEAN NOT NULL DEFAULT false,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_email_events_campaign
    ON founder_os.crm_email_events (campaign_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_email_events_contact
    ON founder_os.crm_email_events (contact_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_suppressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_normalized TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL DEFAULT 'unsubscribe',
    source_campaign_id UUID REFERENCES founder_os.crm_email_campaigns(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID,
    actor_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_email_audit_created
    ON founder_os.crm_email_audit_logs (created_at DESC);

-- Automation scaffolding (activated manually)
CREATE TABLE IF NOT EXISTS founder_os.crm_email_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    trigger_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (trigger_type IN (
            'waitlist_signup', 'manual_enroll', 'lifecycle_stage',
            'label_added', 'email_clicked', 'email_delivered', 'delay_elapsed'
        )),
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_automation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES founder_os.crm_email_automations(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL CHECK (step_type IN ('send_email', 'wait')),
    wait_duration_hours INTEGER,
    template_id UUID REFERENCES founder_os.crm_email_templates(id) ON DELETE SET NULL,
    template_version_id UUID REFERENCES founder_os.crm_email_template_versions(id) ON DELETE SET NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (automation_id, step_order)
);

CREATE TABLE IF NOT EXISTS founder_os.crm_email_automation_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES founder_os.crm_email_automations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES founder_os.crm_contacts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'completed', 'paused', 'exited')),
    current_step_order INTEGER NOT NULL DEFAULT 0,
    next_run_at TIMESTAMPTZ,
    exit_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (automation_id, contact_id)
);

INSERT INTO founder_os.crm_email_labels (slug, name, color)
VALUES
    ('onboarding', 'Onboarding', '#5b8cff'),
    ('product-update', 'Product Update', '#7c5cff'),
    ('newsletter', 'Newsletter', '#22a06b'),
    ('waitlist', 'Waitlist', '#e56910'),
    ('follow-up', 'Follow-up', '#6554c0'),
    ('announcement', 'Announcement', '#cf3333')
ON CONFLICT (slug) DO NOTHING;
-- CRM contact profile v2 support: enriched notes + custom field definitions (staging additive)

SET search_path TO founder_os, public;

ALTER TABLE founder_os.crm_notes
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN (
      'general', 'meeting', 'phone_call', 'email', 'follow_up', 'research', 'personal_context', 'other'
    ));

ALTER TABLE founder_os.crm_notes
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_crm_notes_contact_pinned
  ON founder_os.crm_notes (contact_id, pinned DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS founder_os.crm_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL
    CHECK (field_type IN (
      'short_text', 'long_text', 'number', 'date', 'dropdown', 'multi_select', 'boolean', 'url'
    )),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  required BOOLEAN NOT NULL DEFAULT false,
  created_by_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_custom_field_definitions_key
  ON founder_os.crm_custom_field_definitions (field_key);
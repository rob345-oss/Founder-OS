-- CRM Email Campaign security (RLS + grants)
SET search_path TO founder_os, public;

ALTER TABLE founder_os.crm_email_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_template_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_campaign_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_send_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.crm_email_automation_enrollments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA founder_os FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA founder_os FROM anon, authenticated;

-- Rollback (manual): DROP automation/campaign tables in reverse dependency order;
-- DISABLE ROW LEVEL SECURITY on tables above if reverting 000009 only.
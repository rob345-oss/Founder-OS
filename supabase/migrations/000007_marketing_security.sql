-- Marketing Command Center security hardening (staging first)
SET search_path TO founder_os, public;

ALTER TABLE founder_os.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON founder_os.marketing_campaigns FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_goals FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_content_items FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_settings FROM anon, authenticated;

-- Rollback (manual): DISABLE ROW LEVEL SECURITY on marketing_* tables if reverting 000007 only.

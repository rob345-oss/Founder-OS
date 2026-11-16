-- Social Command Center RLS (staging first)
SET search_path TO founder_os, public;

ALTER TABLE founder_os.marketing_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_social_post_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_social_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_social_attribution_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE founder_os.marketing_social_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON founder_os.marketing_social_accounts FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_social_posts FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_social_post_metrics FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_social_media_assets FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_social_attribution_links FROM anon, authenticated;
REVOKE ALL ON founder_os.marketing_social_audit_events FROM anon, authenticated;
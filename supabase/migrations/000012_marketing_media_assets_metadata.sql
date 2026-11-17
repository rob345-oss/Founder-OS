-- Marketing social media assets — metadata columns (staging, additive)
SET search_path TO founder_os, public;

ALTER TABLE founder_os.marketing_social_media_assets
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS alt_text TEXT,
    ADD COLUMN IF NOT EXISTS storage_key TEXT,
    ADD COLUMN IF NOT EXISTS original_filename TEXT,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS upload_state TEXT NOT NULL DEFAULT 'ready'
        CHECK (upload_state IN ('uploading', 'ready', 'failed'));

CREATE INDEX IF NOT EXISTS idx_marketing_social_media_assets_archived
    ON founder_os.marketing_social_media_assets (archived_at)
    WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_social_media_assets_title
    ON founder_os.marketing_social_media_assets (title);
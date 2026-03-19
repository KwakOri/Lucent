BEGIN;

ALTER TABLE public.media_asset_upload_sessions
  ALTER COLUMN upload_id TYPE TEXT;

COMMIT;

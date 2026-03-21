BEGIN;

ALTER TABLE public.v2_projects
  ADD COLUMN IF NOT EXISTS cover_media_asset_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v2_projects_cover_media_asset_id_fkey'
  ) THEN
    ALTER TABLE public.v2_projects
      ADD CONSTRAINT v2_projects_cover_media_asset_id_fkey
      FOREIGN KEY (cover_media_asset_id)
      REFERENCES public.media_assets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_v2_projects_cover_media_asset_id
  ON public.v2_projects(cover_media_asset_id);

COMMENT ON COLUMN public.v2_projects.cover_media_asset_id IS '프로젝트 커버 이미지 media_assets 참조';

COMMIT;

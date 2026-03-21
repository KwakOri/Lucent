BEGIN;

ALTER TABLE public.v2_campaigns
  ADD COLUMN IF NOT EXISTS shop_banner_media_asset_id UUID,
  ADD COLUMN IF NOT EXISTS shop_banner_alt_text VARCHAR(255);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v2_campaigns_shop_banner_media_asset_id_fkey'
  ) THEN
    ALTER TABLE public.v2_campaigns
      ADD CONSTRAINT v2_campaigns_shop_banner_media_asset_id_fkey
      FOREIGN KEY (shop_banner_media_asset_id)
      REFERENCES public.media_assets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_v2_campaigns_shop_banner_media_asset_id
  ON public.v2_campaigns(shop_banner_media_asset_id);

COMMENT ON COLUMN public.v2_campaigns.shop_banner_media_asset_id IS '상점 페이지 전용 배너 이미지 media_assets 참조';
COMMENT ON COLUMN public.v2_campaigns.shop_banner_alt_text IS '상점 배너 이미지 대체 텍스트';

COMMIT;

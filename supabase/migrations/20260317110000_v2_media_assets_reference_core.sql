BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'v2_media_asset_kind_enum'
  ) THEN
    CREATE TYPE v2_media_asset_kind_enum AS ENUM (
      'IMAGE',
      'VIDEO',
      'AUDIO',
      'DOCUMENT',
      'ARCHIVE',
      'FILE'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'v2_media_asset_status_enum'
  ) THEN
    CREATE TYPE v2_media_asset_status_enum AS ENUM (
      'ACTIVE',
      'INACTIVE',
      'ARCHIVED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_kind v2_media_asset_kind_enum NOT NULL DEFAULT 'FILE',
  storage_provider VARCHAR(50) NOT NULL DEFAULT 'R2',
  storage_bucket VARCHAR(255),
  storage_path VARCHAR(1000) NOT NULL,
  public_url VARCHAR(1000),
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150),
  file_size BIGINT,
  checksum VARCHAR(255),
  status v2_media_asset_status_enum NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_assets_storage_provider_path_unique UNIQUE (storage_provider, storage_path),
  CONSTRAINT media_assets_file_size_non_negative CHECK (file_size IS NULL OR file_size > 0)
);

CREATE INDEX IF NOT EXISTS idx_media_assets_asset_kind ON public.media_assets(asset_kind);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON public.media_assets(status);
CREATE INDEX IF NOT EXISTS idx_media_assets_storage_path ON public.media_assets(storage_path);

DROP TRIGGER IF EXISTS update_media_assets_updated_at ON public.media_assets;
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.v2_product_media
  ADD COLUMN IF NOT EXISTS media_asset_id UUID;

ALTER TABLE public.v2_digital_assets
  ADD COLUMN IF NOT EXISTS media_asset_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v2_product_media_media_asset_id_fkey'
  ) THEN
    ALTER TABLE public.v2_product_media
      ADD CONSTRAINT v2_product_media_media_asset_id_fkey
      FOREIGN KEY (media_asset_id)
      REFERENCES public.media_assets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v2_digital_assets_media_asset_id_fkey'
  ) THEN
    ALTER TABLE public.v2_digital_assets
      ADD CONSTRAINT v2_digital_assets_media_asset_id_fkey
      FOREIGN KEY (media_asset_id)
      REFERENCES public.media_assets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_v2_product_media_media_asset_id
  ON public.v2_product_media(media_asset_id);

CREATE INDEX IF NOT EXISTS idx_v2_digital_assets_media_asset_id
  ON public.v2_digital_assets(media_asset_id);

INSERT INTO public.media_assets (
  asset_kind,
  storage_provider,
  storage_bucket,
  storage_path,
  public_url,
  file_name,
  mime_type,
  file_size,
  checksum,
  status,
  metadata
)
SELECT DISTINCT
  CASE
    WHEN pm.media_type = 'VIDEO' THEN 'VIDEO'::v2_media_asset_kind_enum
    ELSE 'IMAGE'::v2_media_asset_kind_enum
  END AS asset_kind,
  'R2' AS storage_provider,
  NULL AS storage_bucket,
  pm.storage_path,
  pm.public_url,
  COALESCE(
    NULLIF(regexp_replace(pm.storage_path, '^.*/', ''), ''),
    pm.storage_path
  ) AS file_name,
  CASE
    WHEN pm.storage_path ILIKE '%.webp' THEN 'image/webp'
    WHEN pm.storage_path ILIKE '%.png' THEN 'image/png'
    WHEN pm.storage_path ILIKE '%.gif' THEN 'image/gif'
    WHEN pm.storage_path ILIKE '%.jpeg' OR pm.storage_path ILIKE '%.jpg' THEN 'image/jpeg'
    WHEN pm.storage_path ILIKE '%.svg' THEN 'image/svg+xml'
    WHEN pm.media_type = 'VIDEO' THEN 'video/mp4'
    ELSE 'application/octet-stream'
  END AS mime_type,
  NULL AS file_size,
  NULL AS checksum,
  CASE
    WHEN pm.status = 'ACTIVE' THEN 'ACTIVE'::v2_media_asset_status_enum
    WHEN pm.status = 'ARCHIVED' THEN 'ARCHIVED'::v2_media_asset_status_enum
    ELSE 'INACTIVE'::v2_media_asset_status_enum
  END AS status,
  jsonb_build_object(
    'source_table',
    'v2_product_media',
    'source_media_id',
    pm.id
  ) AS metadata
FROM public.v2_product_media pm
WHERE pm.deleted_at IS NULL
ON CONFLICT (storage_provider, storage_path) DO UPDATE
SET
  public_url = COALESCE(EXCLUDED.public_url, public.media_assets.public_url),
  mime_type = COALESCE(public.media_assets.mime_type, EXCLUDED.mime_type),
  updated_at = NOW();

INSERT INTO public.media_assets (
  asset_kind,
  storage_provider,
  storage_bucket,
  storage_path,
  public_url,
  file_name,
  mime_type,
  file_size,
  checksum,
  status,
  metadata
)
SELECT DISTINCT
  CASE
    WHEN da.mime_type ILIKE 'audio/%' THEN 'AUDIO'::v2_media_asset_kind_enum
    WHEN da.mime_type ILIKE 'image/%' THEN 'IMAGE'::v2_media_asset_kind_enum
    WHEN da.mime_type ILIKE 'video/%' THEN 'VIDEO'::v2_media_asset_kind_enum
    WHEN da.mime_type = 'application/pdf' THEN 'DOCUMENT'::v2_media_asset_kind_enum
    WHEN da.storage_path ILIKE '%.zip' THEN 'ARCHIVE'::v2_media_asset_kind_enum
    ELSE 'FILE'::v2_media_asset_kind_enum
  END AS asset_kind,
  'R2' AS storage_provider,
  NULL AS storage_bucket,
  da.storage_path,
  NULL AS public_url,
  da.file_name,
  da.mime_type,
  da.file_size,
  da.checksum,
  CASE
    WHEN da.status = 'READY' THEN 'ACTIVE'::v2_media_asset_status_enum
    WHEN da.status = 'RETIRED' THEN 'INACTIVE'::v2_media_asset_status_enum
    ELSE 'INACTIVE'::v2_media_asset_status_enum
  END AS status,
  jsonb_build_object(
    'source_table',
    'v2_digital_assets',
    'source_asset_id',
    da.id,
    'asset_role',
    da.asset_role,
    'version_no',
    da.version_no
  ) AS metadata
FROM public.v2_digital_assets da
WHERE da.deleted_at IS NULL
ON CONFLICT (storage_provider, storage_path) DO UPDATE
SET
  file_name = COALESCE(NULLIF(EXCLUDED.file_name, ''), public.media_assets.file_name),
  mime_type = COALESCE(EXCLUDED.mime_type, public.media_assets.mime_type),
  file_size = COALESCE(EXCLUDED.file_size, public.media_assets.file_size),
  checksum = COALESCE(EXCLUDED.checksum, public.media_assets.checksum),
  updated_at = NOW();

UPDATE public.v2_product_media pm
SET
  media_asset_id = ma.id,
  storage_path = ma.storage_path,
  public_url = ma.public_url
FROM public.media_assets ma
WHERE pm.media_asset_id IS NULL
  AND ma.storage_provider = 'R2'
  AND ma.storage_path = pm.storage_path;

UPDATE public.v2_digital_assets da
SET
  media_asset_id = ma.id,
  storage_path = ma.storage_path,
  file_name = COALESCE(NULLIF(da.file_name, ''), ma.file_name),
  mime_type = COALESCE(da.mime_type, ma.mime_type, 'application/octet-stream'),
  file_size = COALESCE(NULLIF(da.file_size, 0), ma.file_size, 1),
  checksum = COALESCE(da.checksum, ma.checksum)
FROM public.media_assets ma
WHERE da.media_asset_id IS NULL
  AND ma.storage_provider = 'R2'
  AND ma.storage_path = da.storage_path;

COMMENT ON TABLE public.media_assets IS 'R2 기준 공통 파일 메타데이터 레지스트리';
COMMENT ON COLUMN public.v2_product_media.media_asset_id IS '공통 media_assets 참조';
COMMENT ON COLUMN public.v2_digital_assets.media_asset_id IS '공통 media_assets 참조';

COMMIT;

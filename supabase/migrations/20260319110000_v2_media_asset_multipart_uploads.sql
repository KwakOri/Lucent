BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'v2_media_asset_upload_session_status_enum'
  ) THEN
    CREATE TYPE v2_media_asset_upload_session_status_enum AS ENUM (
      'INITIATED',
      'UPLOADING',
      'COMPLETING',
      'COMPLETED',
      'ABORTED',
      'FAILED',
      'EXPIRED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.media_asset_upload_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upload_id VARCHAR(255) NOT NULL,
  storage_path VARCHAR(1000) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  file_size BIGINT NOT NULL,
  asset_kind v2_media_asset_kind_enum NOT NULL DEFAULT 'FILE',
  asset_status v2_media_asset_status_enum NOT NULL DEFAULT 'ACTIVE',
  part_size INTEGER NOT NULL,
  total_parts INTEGER NOT NULL,
  status v2_media_asset_upload_session_status_enum NOT NULL DEFAULT 'INITIATED',
  uploaded_parts_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_asset_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  aborted_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_asset_upload_sessions_upload_id_unique UNIQUE (upload_id),
  CONSTRAINT media_asset_upload_sessions_storage_path_unique UNIQUE (storage_path),
  CONSTRAINT media_asset_upload_sessions_file_size_positive CHECK (file_size > 0),
  CONSTRAINT media_asset_upload_sessions_part_size_positive CHECK (part_size > 0),
  CONSTRAINT media_asset_upload_sessions_total_parts_positive CHECK (total_parts > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'media_asset_upload_sessions_media_asset_id_fkey'
  ) THEN
    ALTER TABLE public.media_asset_upload_sessions
      ADD CONSTRAINT media_asset_upload_sessions_media_asset_id_fkey
      FOREIGN KEY (media_asset_id)
      REFERENCES public.media_assets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_media_asset_upload_sessions_status
  ON public.media_asset_upload_sessions(status);

CREATE INDEX IF NOT EXISTS idx_media_asset_upload_sessions_expires_at
  ON public.media_asset_upload_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_media_asset_upload_sessions_media_asset_id
  ON public.media_asset_upload_sessions(media_asset_id);

CREATE INDEX IF NOT EXISTS idx_media_asset_upload_sessions_created_at
  ON public.media_asset_upload_sessions(created_at DESC);

DROP TRIGGER IF EXISTS update_media_asset_upload_sessions_updated_at
  ON public.media_asset_upload_sessions;

CREATE TRIGGER update_media_asset_upload_sessions_updated_at
  BEFORE UPDATE ON public.media_asset_upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.media_asset_upload_sessions IS
  '대용량 R2 multipart 업로드 상태를 추적하는 세션 테이블';

COMMENT ON COLUMN public.media_asset_upload_sessions.uploaded_parts_json IS
  '완료 요청에 사용된 multipart part 목록';

COMMENT ON COLUMN public.media_asset_upload_sessions.media_asset_id IS
  '업로드 완료 후 연결된 media_assets.id';

COMMIT;

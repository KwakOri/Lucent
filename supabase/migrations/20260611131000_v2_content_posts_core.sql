CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'v2_content_post_type_enum'
  ) THEN
    CREATE TYPE public.v2_content_post_type_enum AS ENUM (
      'NEWS',
      'NOTICE',
      'BANNER_AD'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'v2_content_post_status_enum'
  ) THEN
    CREATE TYPE public.v2_content_post_status_enum AS ENUM (
      'DRAFT',
      'PUBLISHED',
      'ARCHIVED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.v2_content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT,
  body_json JSONB NOT NULL DEFAULT jsonb_build_object('type', 'doc', 'content', jsonb_build_array()),
  body_text TEXT NOT NULL DEFAULT '',
  post_type public.v2_content_post_type_enum NOT NULL DEFAULT 'NEWS',
  status public.v2_content_post_status_enum NOT NULL DEFAULT 'DRAFT',
  cover_media_asset_id UUID,
  cover_alt_text VARCHAR(255),
  cta_label VARCHAR(80),
  cta_url VARCHAR(1000),
  featured_on_home BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by UUID,
  updated_by UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_content_posts_slug_not_blank CHECK (length(trim(slug)) > 0),
  CONSTRAINT v2_content_posts_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT v2_content_posts_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT v2_content_posts_period_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT v2_content_posts_body_json_object CHECK (jsonb_typeof(body_json) = 'object')
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'v2_content_posts_cover_media_asset_id_fkey'
  ) THEN
    ALTER TABLE public.v2_content_posts
      ADD CONSTRAINT v2_content_posts_cover_media_asset_id_fkey
      FOREIGN KEY (cover_media_asset_id)
      REFERENCES public.media_assets(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_content_posts_slug_active
  ON public.v2_content_posts(slug)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_content_posts_status_published_at
  ON public.v2_content_posts(status, published_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_content_posts_featured_home
  ON public.v2_content_posts(featured_on_home, sort_order, published_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_content_posts_post_type
  ON public.v2_content_posts(post_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_content_posts_cover_media_asset_id
  ON public.v2_content_posts(cover_media_asset_id);

DROP TRIGGER IF EXISTS update_v2_content_posts_updated_at ON public.v2_content_posts;
CREATE TRIGGER update_v2_content_posts_updated_at
  BEFORE UPDATE ON public.v2_content_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.v2_content_posts IS '관리자가 발행하는 공지/뉴스/배너형 사이트 콘텐츠';
COMMENT ON COLUMN public.v2_content_posts.body_json IS 'Tiptap JSON document payload';
COMMENT ON COLUMN public.v2_content_posts.body_text IS '검색/요약/검증용 plain text';
COMMENT ON COLUMN public.v2_content_posts.cover_media_asset_id IS '게시글 썸네일/커버 이미지 media_assets 참조';
COMMENT ON COLUMN public.v2_content_posts.featured_on_home IS '홈 새소식 섹션 노출 여부';

COMMIT;

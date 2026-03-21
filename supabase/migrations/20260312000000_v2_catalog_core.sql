-- V2 Catalog Core Schema Migration
-- Created: 2026-03-12
-- Description: Add v2 catalog core tables for project/product/variant/media/digital-asset domain
-- Reference: docs/v2-plans/01/*

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_project_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_artist_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_product_kind_enum AS ENUM ('STANDARD', 'BUNDLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_product_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_fulfillment_type_enum AS ENUM ('DIGITAL', 'PHYSICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_variant_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_media_type_enum AS ENUM ('IMAGE', 'VIDEO');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_media_role_enum AS ENUM ('PRIMARY', 'GALLERY', 'DETAIL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_media_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_asset_role_enum AS ENUM ('PRIMARY', 'BONUS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_digital_asset_status_enum AS ENUM ('DRAFT', 'READY', 'RETIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_project_id UUID,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url VARCHAR(1000),
  status v2_project_status_enum NOT NULL DEFAULT 'DRAFT',
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_projects_legacy_project_id_unique UNIQUE (legacy_project_id),
  CONSTRAINT v2_projects_slug_unique UNIQUE (slug),
  CONSTRAINT v2_projects_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_projects_status ON public.v2_projects(status);
CREATE INDEX IF NOT EXISTS idx_v2_projects_is_active ON public.v2_projects(is_active);
CREATE INDEX IF NOT EXISTS idx_v2_projects_sort_order ON public.v2_projects(sort_order);

CREATE TABLE IF NOT EXISTS public.v2_artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_artist_id UUID,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  bio TEXT,
  profile_image_url VARCHAR(1000),
  status v2_artist_status_enum NOT NULL DEFAULT 'DRAFT',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_artists_legacy_artist_id_unique UNIQUE (legacy_artist_id),
  CONSTRAINT v2_artists_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_v2_artists_status ON public.v2_artists(status);

CREATE TABLE IF NOT EXISTS public.v2_project_artists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.v2_projects(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.v2_artists(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL DEFAULT 'CONTRIBUTOR',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status v2_artist_status_enum NOT NULL DEFAULT 'ACTIVE',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_project_artists_project_artist_unique UNIQUE (project_id, artist_id),
  CONSTRAINT v2_project_artists_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_project_artists_project_id ON public.v2_project_artists(project_id);
CREATE INDEX IF NOT EXISTS idx_v2_project_artists_artist_id ON public.v2_project_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_v2_project_artists_status ON public.v2_project_artists(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_project_artists_primary_per_project
  ON public.v2_project_artists(project_id)
  WHERE is_primary = true AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.v2_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_product_id UUID,
  project_id UUID NOT NULL REFERENCES public.v2_projects(id) ON DELETE CASCADE,
  product_kind v2_product_kind_enum NOT NULL DEFAULT 'STANDARD',
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  short_description TEXT,
  description TEXT,
  status v2_product_status_enum NOT NULL DEFAULT 'DRAFT',
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_products_legacy_product_id_unique UNIQUE (legacy_product_id),
  CONSTRAINT v2_products_project_slug_unique UNIQUE (project_id, slug),
  CONSTRAINT v2_products_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_products_project_id ON public.v2_products(project_id);
CREATE INDEX IF NOT EXISTS idx_v2_products_product_kind ON public.v2_products(product_kind);
CREATE INDEX IF NOT EXISTS idx_v2_products_status ON public.v2_products(status);
CREATE INDEX IF NOT EXISTS idx_v2_products_sort_order ON public.v2_products(sort_order);

CREATE TABLE IF NOT EXISTS public.v2_product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.v2_products(id) ON DELETE CASCADE,
  sku VARCHAR(120) NOT NULL,
  title VARCHAR(255) NOT NULL,
  fulfillment_type v2_fulfillment_type_enum NOT NULL,
  requires_shipping BOOLEAN NOT NULL DEFAULT false,
  track_inventory BOOLEAN NOT NULL DEFAULT false,
  weight_grams INTEGER,
  dimension_json JSONB,
  status v2_variant_status_enum NOT NULL DEFAULT 'DRAFT',
  option_summary_json JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_product_variants_sku_unique UNIQUE (sku),
  CONSTRAINT v2_product_variants_weight_non_negative CHECK (weight_grams IS NULL OR weight_grams >= 0),
  CONSTRAINT v2_product_variants_digital_shipping_check CHECK (
    fulfillment_type <> 'DIGITAL' OR requires_shipping = false
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_product_variants_product_id ON public.v2_product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_v2_product_variants_fulfillment_type ON public.v2_product_variants(fulfillment_type);
CREATE INDEX IF NOT EXISTS idx_v2_product_variants_status ON public.v2_product_variants(status);

CREATE TABLE IF NOT EXISTS public.v2_product_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.v2_products(id) ON DELETE CASCADE,
  media_type v2_media_type_enum NOT NULL DEFAULT 'IMAGE',
  media_role v2_media_role_enum NOT NULL DEFAULT 'GALLERY',
  storage_path VARCHAR(1000) NOT NULL,
  public_url VARCHAR(1000),
  alt_text VARCHAR(500),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status v2_media_status_enum NOT NULL DEFAULT 'DRAFT',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_product_media_product_storage_role_unique UNIQUE (product_id, storage_path, media_role),
  CONSTRAINT v2_product_media_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_product_media_product_id ON public.v2_product_media(product_id);
CREATE INDEX IF NOT EXISTS idx_v2_product_media_media_role ON public.v2_product_media(media_role);
CREATE INDEX IF NOT EXISTS idx_v2_product_media_status ON public.v2_product_media(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_product_media_primary_per_product
  ON public.v2_product_media(product_id)
  WHERE is_primary = true AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.v2_digital_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES public.v2_product_variants(id) ON DELETE CASCADE,
  asset_role v2_asset_role_enum NOT NULL DEFAULT 'PRIMARY',
  file_name VARCHAR(255) NOT NULL,
  storage_path VARCHAR(1000) NOT NULL,
  mime_type VARCHAR(150) NOT NULL,
  file_size BIGINT NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  checksum VARCHAR(255),
  status v2_digital_asset_status_enum NOT NULL DEFAULT 'DRAFT',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_digital_assets_file_size_positive CHECK (file_size > 0),
  CONSTRAINT v2_digital_assets_version_positive CHECK (version_no > 0),
  CONSTRAINT v2_digital_assets_variant_role_version_unique UNIQUE (variant_id, asset_role, version_no)
);

CREATE INDEX IF NOT EXISTS idx_v2_digital_assets_variant_id ON public.v2_digital_assets(variant_id);
CREATE INDEX IF NOT EXISTS idx_v2_digital_assets_status ON public.v2_digital_assets(status);

-- =====================================================
-- 3. VALIDATION FUNCTIONS
-- =====================================================

-- Keep the asset delivery boundary strict:
-- v2_digital_assets must be attached to DIGITAL fulfillment variants only.
CREATE OR REPLACE FUNCTION public.validate_v2_digital_asset_variant()
RETURNS TRIGGER AS $$
DECLARE
  variant_fulfillment_type v2_fulfillment_type_enum;
BEGIN
  SELECT fulfillment_type
    INTO variant_fulfillment_type
    FROM public.v2_product_variants
   WHERE id = NEW.variant_id;

  IF variant_fulfillment_type IS NULL THEN
    RAISE EXCEPTION 'variant not found: %', NEW.variant_id;
  END IF;

  IF variant_fulfillment_type <> 'DIGITAL' THEN
    RAISE EXCEPTION 'variant % is not DIGITAL', NEW.variant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_projects_updated_at ON public.v2_projects;
CREATE TRIGGER update_v2_projects_updated_at
  BEFORE UPDATE ON public.v2_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_artists_updated_at ON public.v2_artists;
CREATE TRIGGER update_v2_artists_updated_at
  BEFORE UPDATE ON public.v2_artists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_project_artists_updated_at ON public.v2_project_artists;
CREATE TRIGGER update_v2_project_artists_updated_at
  BEFORE UPDATE ON public.v2_project_artists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_products_updated_at ON public.v2_products;
CREATE TRIGGER update_v2_products_updated_at
  BEFORE UPDATE ON public.v2_products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_product_variants_updated_at ON public.v2_product_variants;
CREATE TRIGGER update_v2_product_variants_updated_at
  BEFORE UPDATE ON public.v2_product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_product_media_updated_at ON public.v2_product_media;
CREATE TRIGGER update_v2_product_media_updated_at
  BEFORE UPDATE ON public.v2_product_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_digital_assets_updated_at ON public.v2_digital_assets;
CREATE TRIGGER update_v2_digital_assets_updated_at
  BEFORE UPDATE ON public.v2_digital_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS validate_v2_digital_asset_variant_trigger ON public.v2_digital_assets;
CREATE TRIGGER validate_v2_digital_asset_variant_trigger
  BEFORE INSERT OR UPDATE ON public.v2_digital_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_v2_digital_asset_variant();

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_projects IS 'v2 catalog top-level merchandising container';
COMMENT ON TABLE public.v2_products IS 'v2 customer-facing sellable catalog entity';
COMMENT ON TABLE public.v2_product_variants IS 'v2 transaction and fulfillment minimum unit';
COMMENT ON TABLE public.v2_product_media IS 'v2 catalog exposure assets (display purpose)';
COMMENT ON TABLE public.v2_digital_assets IS 'v2 digital delivery assets (fulfillment purpose)';

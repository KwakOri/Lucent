-- V2 Catalog Core Backfill Migration
-- Created: 2026-03-12
-- Description: Backfill legacy catalog data into v2 catalog core tables
-- Reference: docs/v2-plans/01/04_migration_cutover.md

-- =====================================================
-- 1. projects -> v2_projects
-- =====================================================

INSERT INTO public.v2_projects (
  legacy_project_id,
  name,
  slug,
  description,
  cover_image_url,
  status,
  is_active,
  sort_order,
  metadata
)
SELECT
  p.id,
  p.name,
  p.slug,
  p.description,
  i.public_url,
  CASE
    WHEN p.is_active THEN 'ACTIVE'::v2_project_status_enum
    ELSE 'DRAFT'::v2_project_status_enum
  END,
  p.is_active,
  p.order_index,
  jsonb_build_object('source', 'legacy.projects', 'backfilled_at', NOW())
FROM public.projects p
LEFT JOIN public.images i ON i.id = p.cover_image_id
ON CONFLICT (legacy_project_id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  cover_image_url = EXCLUDED.cover_image_url,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- =====================================================
-- 2. artists -> v2_artists + v2_project_artists
-- =====================================================

INSERT INTO public.v2_artists (
  legacy_artist_id,
  name,
  slug,
  bio,
  profile_image_url,
  status,
  metadata
)
SELECT
  a.id,
  a.name,
  a.slug,
  a.description,
  i.public_url,
  CASE
    WHEN a.is_active THEN 'ACTIVE'::v2_artist_status_enum
    ELSE 'ARCHIVED'::v2_artist_status_enum
  END,
  jsonb_build_object('source', 'legacy.artists', 'backfilled_at', NOW())
FROM public.artists a
LEFT JOIN public.images i ON i.id = a.profile_image_id
ON CONFLICT (legacy_artist_id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  bio = EXCLUDED.bio,
  profile_image_url = EXCLUDED.profile_image_url,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

WITH ranked_artists AS (
  SELECT
    a.id AS legacy_artist_id,
    a.project_id AS legacy_project_id,
    a.is_active,
    ROW_NUMBER() OVER (
      PARTITION BY a.project_id
      ORDER BY a.created_at, a.id
    ) AS artist_rank
  FROM public.artists a
)
INSERT INTO public.v2_project_artists (
  project_id,
  artist_id,
  role,
  sort_order,
  is_primary,
  status,
  metadata
)
SELECT
  vp.id AS project_id,
  va.id AS artist_id,
  'ARTIST' AS role,
  ra.artist_rank - 1 AS sort_order,
  (ra.artist_rank = 1) AS is_primary,
  CASE
    WHEN ra.is_active THEN 'ACTIVE'::v2_artist_status_enum
    ELSE 'ARCHIVED'::v2_artist_status_enum
  END,
  jsonb_build_object('source', 'legacy.artists.project_id', 'backfilled_at', NOW())
FROM ranked_artists ra
JOIN public.v2_projects vp ON vp.legacy_project_id = ra.legacy_project_id
JOIN public.v2_artists va ON va.legacy_artist_id = ra.legacy_artist_id
ON CONFLICT (project_id, artist_id) DO UPDATE SET
  role = EXCLUDED.role,
  sort_order = EXCLUDED.sort_order,
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- =====================================================
-- 3. products -> v2_products + default v2_product_variants
-- =====================================================

WITH product_base AS (
  SELECT
    p.id AS legacy_product_id,
    NULL::UUID AS legacy_artist_id,
    p.project_id AS legacy_project_id,
    p.name,
    p.slug,
    p.description,
    p.type,
    p.stock,
    p.is_active,
    p.created_at,
    p.updated_at
  FROM public.products p
),
product_ranked AS (
  SELECT
    pb.*,
    ROW_NUMBER() OVER (
      PARTITION BY pb.legacy_project_id, pb.slug
      ORDER BY pb.created_at, pb.legacy_product_id
    ) AS slug_rank,
    ROW_NUMBER() OVER (
      PARTITION BY pb.legacy_project_id
      ORDER BY pb.created_at, pb.legacy_product_id
    ) - 1 AS sort_order
  FROM product_base pb
)
INSERT INTO public.v2_products (
  legacy_product_id,
  project_id,
  product_kind,
  title,
  slug,
  short_description,
  description,
  status,
  sort_order,
  metadata
)
SELECT
  pr.legacy_product_id,
  vp.id AS project_id,
  CASE
    WHEN pr.type = 'BUNDLE' THEN 'BUNDLE'::v2_product_kind_enum
    ELSE 'STANDARD'::v2_product_kind_enum
  END AS product_kind,
  pr.name AS title,
  CASE
    WHEN pr.slug_rank = 1 THEN pr.slug
    ELSE pr.slug || '-' || pr.slug_rank::TEXT
  END AS slug,
  NULL::TEXT AS short_description,
  pr.description,
  CASE
    WHEN pr.is_active THEN 'ACTIVE'::v2_product_status_enum
    ELSE 'INACTIVE'::v2_product_status_enum
  END AS status,
  pr.sort_order,
  jsonb_build_object(
    'source', 'legacy.products',
    'legacy_artist_id', pr.legacy_artist_id,
    'legacy_type', pr.type,
    'slug_rank', pr.slug_rank,
    'backfilled_at', NOW()
  ) AS metadata
FROM product_ranked pr
JOIN public.v2_projects vp ON vp.legacy_project_id = pr.legacy_project_id
ON CONFLICT (legacy_product_id) DO UPDATE SET
  project_id = EXCLUDED.project_id,
  product_kind = EXCLUDED.product_kind,
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO public.v2_product_variants (
  product_id,
  sku,
  title,
  fulfillment_type,
  requires_shipping,
  track_inventory,
  status,
  option_summary_json,
  metadata
)
SELECT
  vp.id AS product_id,
  'LEGACY-' || REPLACE(p.id::TEXT, '-', '') AS sku,
  'Default' AS title,
  CASE
    WHEN p.type = 'VOICE_PACK' THEN 'DIGITAL'::v2_fulfillment_type_enum
    ELSE 'PHYSICAL'::v2_fulfillment_type_enum
  END AS fulfillment_type,
  CASE
    WHEN p.type = 'PHYSICAL_GOODS' THEN true
    ELSE false
  END AS requires_shipping,
  CASE
    WHEN p.type = 'PHYSICAL_GOODS' AND p.stock IS NOT NULL THEN true
    ELSE false
  END AS track_inventory,
  CASE
    WHEN p.is_active THEN 'ACTIVE'::v2_variant_status_enum
    ELSE 'INACTIVE'::v2_variant_status_enum
  END AS status,
  jsonb_build_object('legacy_default_variant', true),
  jsonb_build_object(
    'source', 'legacy.products',
    'legacy_product_id', p.id,
    'legacy_type', p.type,
    'backfilled_at', NOW()
  )
FROM public.products p
JOIN public.v2_products vp ON vp.legacy_product_id = p.id
ON CONFLICT (sku) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  title = EXCLUDED.title,
  fulfillment_type = EXCLUDED.fulfillment_type,
  requires_shipping = EXCLUDED.requires_shipping,
  track_inventory = EXCLUDED.track_inventory,
  status = EXCLUDED.status,
  option_summary_json = EXCLUDED.option_summary_json,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- =====================================================
-- 4. images/file url -> v2_product_media / v2_digital_assets
-- =====================================================

INSERT INTO public.v2_product_media (
  product_id,
  media_type,
  media_role,
  storage_path,
  public_url,
  alt_text,
  sort_order,
  is_primary,
  status,
  metadata
)
SELECT
  vp.id AS product_id,
  'IMAGE'::v2_media_type_enum,
  'PRIMARY'::v2_media_role_enum,
  COALESCE(i.r2_key, i.public_url, 'legacy/images/' || i.id::TEXT) AS storage_path,
  i.public_url,
  i.alt_text,
  0 AS sort_order,
  true AS is_primary,
  CASE
    WHEN p.is_active THEN 'ACTIVE'::v2_media_status_enum
    ELSE 'INACTIVE'::v2_media_status_enum
  END AS status,
  jsonb_build_object(
    'source', 'legacy.products.main_image_id',
    'legacy_image_id', i.id,
    'backfilled_at', NOW()
  )
FROM public.products p
JOIN public.v2_products vp ON vp.legacy_product_id = p.id
JOIN public.images i ON i.id = p.main_image_id
ON CONFLICT (product_id, storage_path, media_role) DO UPDATE SET
  public_url = EXCLUDED.public_url,
  alt_text = EXCLUDED.alt_text,
  sort_order = EXCLUDED.sort_order,
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO public.v2_product_media (
  product_id,
  media_type,
  media_role,
  storage_path,
  public_url,
  alt_text,
  sort_order,
  is_primary,
  status,
  metadata
)
SELECT
  vp.id AS product_id,
  'IMAGE'::v2_media_type_enum,
  'GALLERY'::v2_media_role_enum,
  COALESCE(i.r2_key, i.public_url, 'legacy/images/' || i.id::TEXT) AS storage_path,
  i.public_url,
  i.alt_text,
  GREATEST(pi.display_order, 0) + 1 AS sort_order,
  false AS is_primary,
  CASE
    WHEN p.is_active THEN 'ACTIVE'::v2_media_status_enum
    ELSE 'INACTIVE'::v2_media_status_enum
  END AS status,
  jsonb_build_object(
    'source', 'legacy.product_images',
    'legacy_image_id', i.id,
    'backfilled_at', NOW()
  )
FROM public.product_images pi
JOIN public.products p ON p.id = pi.product_id
JOIN public.v2_products vp ON vp.legacy_product_id = p.id
JOIN public.images i ON i.id = pi.image_id
WHERE p.main_image_id IS DISTINCT FROM i.id
ON CONFLICT (product_id, storage_path, media_role) DO UPDATE SET
  public_url = EXCLUDED.public_url,
  alt_text = EXCLUDED.alt_text,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

INSERT INTO public.v2_digital_assets (
  variant_id,
  asset_role,
  file_name,
  storage_path,
  mime_type,
  file_size,
  version_no,
  checksum,
  status,
  metadata
)
SELECT
  vv.id AS variant_id,
  'PRIMARY'::v2_asset_role_enum,
  'legacy-' || p.id::TEXT AS file_name,
  p.digital_file_url AS storage_path,
  'application/octet-stream' AS mime_type,
  1 AS file_size,
  1 AS version_no,
  NULL AS checksum,
  CASE
    WHEN p.is_active THEN 'READY'::v2_digital_asset_status_enum
    ELSE 'DRAFT'::v2_digital_asset_status_enum
  END AS status,
  jsonb_build_object(
    'source', 'legacy.products.digital_file_url',
    'legacy_product_id', p.id,
    'backfilled_at', NOW()
  )
FROM public.products p
JOIN public.v2_products vp ON vp.legacy_product_id = p.id
JOIN public.v2_product_variants vv
  ON vv.product_id = vp.id
 AND vv.sku = 'LEGACY-' || REPLACE(p.id::TEXT, '-', '')
 AND vv.fulfillment_type = 'DIGITAL'
WHERE p.digital_file_url IS NOT NULL
  AND p.digital_file_url <> ''
ON CONFLICT (variant_id, asset_role, version_no) DO UPDATE SET
  file_name = EXCLUDED.file_name,
  storage_path = EXCLUDED.storage_path,
  mime_type = EXCLUDED.mime_type,
  checksum = EXCLUDED.checksum,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

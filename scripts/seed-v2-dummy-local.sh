#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

log() {
  printf '[seed-v2-dummy-local] %s\n' "$1"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Required command not found: ${cmd}" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd npx

cd "${FE_DIR}"

log "starting local supabase (if not already running)"
npx supabase start >/dev/null

if command -v rg >/dev/null 2>&1; then
  DB_CONTAINER="$(docker ps --format '{{.Names}}' | rg '^supabase_db_' | head -n 1 || true)"
else
  DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep -E '^supabase_db_' | head -n 1 || true)"
fi
if [[ -z "${DB_CONTAINER}" ]]; then
  echo "supabase db container not found (expected name starting with supabase_db_)" >&2
  exit 1
fi

log "seeding v2 dummy catalog/pricing data"
docker exec -i "${DB_CONTAINER}" psql -v ON_ERROR_STOP=1 -U postgres -d postgres <<'SQL'
-- =====================================================
-- V2 Dummy Data Seed (Local only)
-- Idempotent: repeated runs update the same fixture rows.
-- =====================================================

-- IDs
-- project:               8a8d1000-0000-4000-8000-000000000001
-- artist:                8a8d1000-0000-4000-8000-000000000002
-- products:
--   digital standard:    8a8d1000-0000-4000-8000-000000000101
--   physical standard:   8a8d1000-0000-4000-8000-000000000102
--   bundle product:      8a8d1000-0000-4000-8000-000000000103
-- variants:
--   digital:             8a8d1000-0000-4000-8000-000000000201
--   physical:            8a8d1000-0000-4000-8000-000000000202
--   bundle parent:       8a8d1000-0000-4000-8000-000000000203
-- bundle:
--   definition:          8a8d1000-0000-4000-8000-000000000401
-- pricing:
--   base price list:     8a8d1000-0000-4000-8000-000000000301

INSERT INTO public.v2_projects (
  id,
  name,
  slug,
  description,
  cover_image_url,
  status,
  is_active,
  sort_order,
  metadata,
  deleted_at
)
VALUES (
  '8a8d1000-0000-4000-8000-000000000001',
  'V2 Dummy Project',
  'v2-dummy-project',
  'Local v2 checkout/cart test fixture project',
  'https://placehold.co/1200x675/png?text=V2+Dummy+Project',
  'ACTIVE',
  true,
  9999,
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  cover_image_url = EXCLUDED.cover_image_url,
  status = EXCLUDED.status,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

INSERT INTO public.v2_artists (
  id,
  name,
  slug,
  bio,
  profile_image_url,
  status,
  metadata,
  deleted_at
)
VALUES (
  '8a8d1000-0000-4000-8000-000000000002',
  'V2 Dummy Artist',
  'v2-dummy-artist',
  'Local test fixture artist for v2 paths',
  'https://placehold.co/512x512/png?text=V2+Artist',
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  bio = EXCLUDED.bio,
  profile_image_url = EXCLUDED.profile_image_url,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

INSERT INTO public.v2_project_artists (
  id,
  project_id,
  artist_id,
  role,
  sort_order,
  is_primary,
  status,
  metadata,
  deleted_at
)
VALUES (
  '8a8d1000-0000-4000-8000-000000000003',
  '8a8d1000-0000-4000-8000-000000000001',
  '8a8d1000-0000-4000-8000-000000000002',
  'CREATOR',
  0,
  true,
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (project_id, artist_id) DO UPDATE
SET
  role = EXCLUDED.role,
  sort_order = EXCLUDED.sort_order,
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

-- Products
INSERT INTO public.v2_products (
  id,
  project_id,
  product_kind,
  title,
  slug,
  short_description,
  description,
  status,
  sort_order,
  metadata,
  deleted_at
)
VALUES
(
  '8a8d1000-0000-4000-8000-000000000101',
  '8a8d1000-0000-4000-8000-000000000001',
  'STANDARD',
  'V2 Dummy Digital Voice Pack',
  'v2-dummy-digital-voice-pack',
  'Digital fixture product for v2 checkout',
  'A digital-only dummy product for local v2 testing.',
  'ACTIVE',
  1,
  jsonb_build_object('fixture', 'v2-dummy-local', 'kind', 'digital'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000102',
  '8a8d1000-0000-4000-8000-000000000001',
  'STANDARD',
  'V2 Dummy Physical Goods',
  'v2-dummy-physical-goods',
  'Physical fixture product for v2 checkout',
  'A shippable dummy product for local v2 testing.',
  'ACTIVE',
  2,
  jsonb_build_object('fixture', 'v2-dummy-local', 'kind', 'physical'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000103',
  '8a8d1000-0000-4000-8000-000000000001',
  'BUNDLE',
  'V2 Dummy Starter Bundle',
  'v2-dummy-starter-bundle',
  'Bundle fixture product for v2 checkout',
  'A bundle fixture composed of digital + physical component.',
  'ACTIVE',
  3,
  jsonb_build_object('fixture', 'v2-dummy-local', 'kind', 'bundle'),
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  project_id = EXCLUDED.project_id,
  product_kind = EXCLUDED.product_kind,
  title = EXCLUDED.title,
  slug = EXCLUDED.slug,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

-- Variants
INSERT INTO public.v2_product_variants (
  id,
  product_id,
  sku,
  title,
  fulfillment_type,
  requires_shipping,
  track_inventory,
  weight_grams,
  dimension_json,
  option_summary_json,
  status,
  metadata,
  deleted_at
)
VALUES
(
  '8a8d1000-0000-4000-8000-000000000201',
  '8a8d1000-0000-4000-8000-000000000101',
  'V2-DUMMY-DIGI-001',
  'Digital Edition',
  'DIGITAL',
  false,
  false,
  NULL,
  NULL,
  jsonb_build_object('edition', 'digital'),
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000202',
  '8a8d1000-0000-4000-8000-000000000102',
  'V2-DUMMY-PHYS-001',
  'Physical Edition',
  'PHYSICAL',
  true,
  true,
  350,
  jsonb_build_object('width_cm', 10, 'height_cm', 15, 'depth_cm', 2),
  jsonb_build_object('edition', 'physical'),
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000203',
  '8a8d1000-0000-4000-8000-000000000103',
  'V2-DUMMY-BUNDLE-001',
  'Bundle Parent Edition',
  'PHYSICAL',
  true,
  false,
  450,
  jsonb_build_object('width_cm', 20, 'height_cm', 20, 'depth_cm', 5),
  jsonb_build_object('edition', 'bundle'),
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  sku = EXCLUDED.sku,
  title = EXCLUDED.title,
  fulfillment_type = EXCLUDED.fulfillment_type,
  requires_shipping = EXCLUDED.requires_shipping,
  track_inventory = EXCLUDED.track_inventory,
  weight_grams = EXCLUDED.weight_grams,
  dimension_json = EXCLUDED.dimension_json,
  option_summary_json = EXCLUDED.option_summary_json,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

-- Product media (PRIMARY)
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
  metadata,
  deleted_at
)
VALUES
(
  '8a8d1000-0000-4000-8000-000000000101',
  'IMAGE',
  'PRIMARY',
  'fixtures/v2-dummy/digital-primary.jpg',
  'https://placehold.co/1024x1024/png?text=V2+Digital',
  'V2 Dummy Digital',
  0,
  true,
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000102',
  'IMAGE',
  'PRIMARY',
  'fixtures/v2-dummy/physical-primary.jpg',
  'https://placehold.co/1024x1024/png?text=V2+Physical',
  'V2 Dummy Physical',
  0,
  true,
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000103',
  'IMAGE',
  'PRIMARY',
  'fixtures/v2-dummy/bundle-primary.jpg',
  'https://placehold.co/1024x1024/png?text=V2+Bundle',
  'V2 Dummy Bundle',
  0,
  true,
  'ACTIVE',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (product_id, storage_path, media_role) DO UPDATE
SET
  public_url = EXCLUDED.public_url,
  alt_text = EXCLUDED.alt_text,
  sort_order = EXCLUDED.sort_order,
  is_primary = EXCLUDED.is_primary,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

-- Digital asset (only for DIGITAL variant)
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
  metadata,
  deleted_at
)
VALUES
(
  '8a8d1000-0000-4000-8000-000000000201',
  'PRIMARY',
  'v2-dummy-digital-track.mp3',
  'fixtures/v2-dummy/v2-dummy-digital-track.mp3',
  'audio/mpeg',
  1234567,
  1,
  md5('v2-dummy-digital-track.mp3'),
  'READY',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (variant_id, asset_role, version_no) DO UPDATE
SET
  file_name = EXCLUDED.file_name,
  storage_path = EXCLUDED.storage_path,
  mime_type = EXCLUDED.mime_type,
  file_size = EXCLUDED.file_size,
  checksum = EXCLUDED.checksum,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

-- Bundle definition (ACTIVE) + components
INSERT INTO public.v2_bundle_definitions (
  id,
  bundle_product_id,
  anchor_product_id,
  version_no,
  mode,
  status,
  pricing_strategy,
  metadata,
  deleted_at
)
VALUES (
  '8a8d1000-0000-4000-8000-000000000401',
  '8a8d1000-0000-4000-8000-000000000103',
  '8a8d1000-0000-4000-8000-000000000103',
  1,
  'FIXED',
  'ACTIVE',
  'WEIGHTED',
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (bundle_product_id, version_no) DO UPDATE
SET
  anchor_product_id = EXCLUDED.anchor_product_id,
  mode = EXCLUDED.mode,
  status = EXCLUDED.status,
  pricing_strategy = EXCLUDED.pricing_strategy,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

INSERT INTO public.v2_bundle_components (
  id,
  bundle_definition_id,
  component_variant_id,
  is_required,
  min_quantity,
  max_quantity,
  default_quantity,
  sort_order,
  price_allocation_weight,
  metadata,
  deleted_at
)
VALUES
(
  '8a8d1000-0000-4000-8000-000000000402',
  '8a8d1000-0000-4000-8000-000000000401',
  '8a8d1000-0000-4000-8000-000000000202',
  true,
  1,
  1,
  1,
  1,
  0.6,
  jsonb_build_object('fixture', 'v2-dummy-local', 'component', 'physical'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000403',
  '8a8d1000-0000-4000-8000-000000000401',
  '8a8d1000-0000-4000-8000-000000000201',
  true,
  1,
  1,
  1,
  2,
  0.4,
  jsonb_build_object('fixture', 'v2-dummy-local', 'component', 'digital'),
  NULL
)
ON CONFLICT (bundle_definition_id, component_variant_id) DO UPDATE
SET
  is_required = EXCLUDED.is_required,
  min_quantity = EXCLUDED.min_quantity,
  max_quantity = EXCLUDED.max_quantity,
  default_quantity = EXCLUDED.default_quantity,
  sort_order = EXCLUDED.sort_order,
  price_allocation_weight = EXCLUDED.price_allocation_weight,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

-- BASE price list (PUBLISHED)
INSERT INTO public.v2_price_lists (
  id,
  campaign_id,
  rollback_of_price_list_id,
  name,
  scope_type,
  status,
  currency_code,
  priority,
  published_at,
  starts_at,
  ends_at,
  channel_scope_json,
  source_type,
  source_id,
  source_snapshot_json,
  metadata,
  deleted_at
)
VALUES (
  '8a8d1000-0000-4000-8000-000000000301',
  NULL,
  NULL,
  'V2 Dummy Base Price List',
  'BASE',
  'PUBLISHED',
  'KRW',
  100,
  NOW(),
  NOW() - INTERVAL '30 days',
  NULL,
  '[]'::jsonb,
  'fixture',
  'v2-dummy-local',
  '{}'::jsonb,
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  scope_type = EXCLUDED.scope_type,
  status = EXCLUDED.status,
  currency_code = EXCLUDED.currency_code,
  priority = EXCLUDED.priority,
  published_at = EXCLUDED.published_at,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  channel_scope_json = EXCLUDED.channel_scope_json,
  source_type = EXCLUDED.source_type,
  source_id = EXCLUDED.source_id,
  source_snapshot_json = EXCLUDED.source_snapshot_json,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;

INSERT INTO public.v2_price_list_items (
  price_list_id,
  product_id,
  variant_id,
  status,
  unit_amount,
  compare_at_amount,
  min_purchase_quantity,
  max_purchase_quantity,
  starts_at,
  ends_at,
  channel_scope_json,
  source_type,
  source_id,
  source_snapshot_json,
  metadata,
  deleted_at
)
VALUES
(
  '8a8d1000-0000-4000-8000-000000000301',
  '8a8d1000-0000-4000-8000-000000000101',
  '8a8d1000-0000-4000-8000-000000000201',
  'ACTIVE',
  9900,
  12900,
  1,
  NULL,
  NOW() - INTERVAL '30 days',
  NULL,
  '[]'::jsonb,
  'fixture',
  'v2-dummy-local',
  '{}'::jsonb,
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000301',
  '8a8d1000-0000-4000-8000-000000000102',
  '8a8d1000-0000-4000-8000-000000000202',
  'ACTIVE',
  17900,
  21900,
  1,
  NULL,
  NOW() - INTERVAL '30 days',
  NULL,
  '[]'::jsonb,
  'fixture',
  'v2-dummy-local',
  '{}'::jsonb,
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
),
(
  '8a8d1000-0000-4000-8000-000000000301',
  '8a8d1000-0000-4000-8000-000000000103',
  '8a8d1000-0000-4000-8000-000000000203',
  'ACTIVE',
  25900,
  31900,
  1,
  NULL,
  NOW() - INTERVAL '30 days',
  NULL,
  '[]'::jsonb,
  'fixture',
  'v2-dummy-local',
  '{}'::jsonb,
  jsonb_build_object('fixture', 'v2-dummy-local'),
  NULL
)
ON CONFLICT (price_list_id, product_id, variant_id) DO UPDATE
SET
  status = EXCLUDED.status,
  unit_amount = EXCLUDED.unit_amount,
  compare_at_amount = EXCLUDED.compare_at_amount,
  min_purchase_quantity = EXCLUDED.min_purchase_quantity,
  max_purchase_quantity = EXCLUDED.max_purchase_quantity,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  channel_scope_json = EXCLUDED.channel_scope_json,
  source_type = EXCLUDED.source_type,
  source_id = EXCLUDED.source_id,
  source_snapshot_json = EXCLUDED.source_snapshot_json,
  metadata = EXCLUDED.metadata,
  deleted_at = NULL;
SQL

log "seed complete. fixture identifiers:"
docker exec -i "${DB_CONTAINER}" psql -U postgres -d postgres -At <<'SQL'
SELECT 'project_id=' || id || ' slug=' || slug
  FROM public.v2_projects
 WHERE slug = 'v2-dummy-project';

SELECT 'variant_id=' || v.id || ' sku=' || v.sku || ' title=' || v.title
  FROM public.v2_product_variants v
 WHERE v.id IN (
   '8a8d1000-0000-4000-8000-000000000201',
   '8a8d1000-0000-4000-8000-000000000202',
   '8a8d1000-0000-4000-8000-000000000203'
 )
 ORDER BY v.sku;

SELECT 'price_list_id=' || id || ' status=' || status || ' name=' || name
  FROM public.v2_price_lists
 WHERE id = '8a8d1000-0000-4000-8000-000000000301';
SQL

log "done"

-- V2 Campaign / Pricing / Promotion
-- Base price list backfill from legacy products.price
-- Created: 2026-03-14

WITH existing_base_price_list AS (
  SELECT id
  FROM public.v2_price_lists
  WHERE source_type = 'legacy'
    AND source_id = 'products.price'
    AND scope_type = 'BASE'
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1
),
inserted_base_price_list AS (
  INSERT INTO public.v2_price_lists (
    name,
    scope_type,
    status,
    currency_code,
    priority,
    published_at,
    channel_scope_json,
    source_type,
    source_id,
    source_snapshot_json,
    metadata
  )
  SELECT
    'Legacy Base Price List (KRW)',
    'BASE',
    'PUBLISHED',
    'KRW',
    0,
    NOW(),
    '[]'::jsonb,
    'legacy',
    'products.price',
    '{}'::jsonb,
    jsonb_build_object(
      'backfill', 'products.price',
      'created_by', '20260314010000_v2_campaign_pricing_base_price_backfill.sql'
    )
  WHERE NOT EXISTS (SELECT 1 FROM existing_base_price_list)
  RETURNING id
),
base_price_list AS (
  SELECT id FROM inserted_base_price_list
  UNION ALL
  SELECT id FROM existing_base_price_list
  LIMIT 1
),
legacy_product_variant_map AS (
  SELECT
    p.id AS legacy_product_id,
    p.price AS legacy_price,
    p.is_active AS legacy_is_active,
    vp.id AS v2_product_id,
    vv.id AS v2_variant_id
  FROM public.products p
  JOIN public.v2_products vp
    ON vp.legacy_product_id = p.id
   AND vp.deleted_at IS NULL
  JOIN LATERAL (
    SELECT vv_inner.id
    FROM public.v2_product_variants vv_inner
    WHERE vv_inner.product_id = vp.id
      AND vv_inner.deleted_at IS NULL
    ORDER BY
      CASE vv_inner.status
        WHEN 'ACTIVE' THEN 0
        WHEN 'DRAFT' THEN 1
        WHEN 'INACTIVE' THEN 2
        ELSE 3
      END,
      vv_inner.created_at ASC
    LIMIT 1
  ) vv ON TRUE
)
INSERT INTO public.v2_price_list_items (
  price_list_id,
  product_id,
  variant_id,
  status,
  unit_amount,
  compare_at_amount,
  min_purchase_quantity,
  max_purchase_quantity,
  channel_scope_json,
  source_type,
  source_id,
  source_snapshot_json,
  metadata
)
SELECT
  bpl.id AS price_list_id,
  lpvm.v2_product_id AS product_id,
  lpvm.v2_variant_id AS variant_id,
  CASE WHEN lpvm.legacy_is_active THEN 'ACTIVE'::v2_price_item_status_enum ELSE 'INACTIVE'::v2_price_item_status_enum END AS status,
  lpvm.legacy_price AS unit_amount,
  NULL AS compare_at_amount,
  1 AS min_purchase_quantity,
  NULL AS max_purchase_quantity,
  '[]'::jsonb AS channel_scope_json,
  'legacy' AS source_type,
  lpvm.legacy_product_id::text AS source_id,
  jsonb_build_object(
    'legacy_product_id', lpvm.legacy_product_id,
    'legacy_price', lpvm.legacy_price
  ) AS source_snapshot_json,
  jsonb_build_object(
    'backfill', 'products.price',
    'currency', 'KRW'
  ) AS metadata
FROM legacy_product_variant_map lpvm
CROSS JOIN base_price_list bpl
ON CONFLICT (price_list_id, product_id, variant_id) DO UPDATE SET
  status = EXCLUDED.status,
  unit_amount = EXCLUDED.unit_amount,
  compare_at_amount = EXCLUDED.compare_at_amount,
  min_purchase_quantity = EXCLUDED.min_purchase_quantity,
  max_purchase_quantity = EXCLUDED.max_purchase_quantity,
  channel_scope_json = EXCLUDED.channel_scope_json,
  source_type = EXCLUDED.source_type,
  source_id = EXCLUDED.source_id,
  source_snapshot_json = EXCLUDED.source_snapshot_json,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

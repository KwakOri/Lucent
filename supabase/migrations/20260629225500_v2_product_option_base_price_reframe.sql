-- V2 pricing
-- Reframe BASE as product-option default price and keep campaign prices as OVERRIDE.
-- Created: 2026-06-29

WITH inserted_base_price_list AS (
  INSERT INTO public.v2_price_lists (
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
  SELECT
    NULL,
    NULL,
    '상품 옵션 기준가',
    'BASE',
    'PUBLISHED',
    'KRW',
    100,
    NOW(),
    NULL,
    NULL,
    '[]'::jsonb,
    'catalog',
    'product-option-base',
    jsonb_build_object(
      'backfill', '20260629225500_v2_product_option_base_price_reframe.sql',
      'pricing_rule', 'BASE is product option default sale price'
    ),
    jsonb_build_object(
      'created_by', '20260629225500_v2_product_option_base_price_reframe.sql',
      'pricing_rule', 'product_option_default_price'
    ),
    NULL
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.v2_price_lists existing
    WHERE existing.scope_type = 'BASE'
      AND existing.campaign_id IS NULL
      AND existing.source_type = 'catalog'
      AND existing.source_id = 'product-option-base'
      AND existing.deleted_at IS NULL
  )
  RETURNING id
),
target_base_price_list AS (
  SELECT id
  FROM inserted_base_price_list
  UNION ALL
  SELECT existing.id
  FROM public.v2_price_lists existing
  WHERE existing.scope_type = 'BASE'
    AND existing.campaign_id IS NULL
    AND existing.source_type = 'catalog'
    AND existing.source_id = 'product-option-base'
    AND existing.deleted_at IS NULL
  LIMIT 1
),
existing_base_items AS (
  SELECT
    pli.id AS source_item_id,
    pli.price_list_id AS source_price_list_id,
    pli.product_id,
    pli.variant_id,
    pli.unit_amount,
    pli.compare_at_amount,
    pli.min_purchase_quantity,
    pli.max_purchase_quantity,
    pli.starts_at,
    pli.ends_at,
    pli.channel_scope_json,
    pli.source_snapshot_json,
    pli.metadata,
    pli.created_at,
    pli.updated_at,
    10 AS source_rank
  FROM public.v2_price_list_items pli
  JOIN public.v2_price_lists pl
    ON pl.id = pli.price_list_id
  JOIN public.v2_products p
    ON p.id = pli.product_id
  JOIN public.v2_product_variants v
    ON v.id = pli.variant_id
  WHERE pl.scope_type = 'BASE'
    AND pl.status = 'PUBLISHED'
    AND pl.deleted_at IS NULL
    AND pli.status = 'ACTIVE'
    AND pli.deleted_at IS NULL
    AND pli.variant_id IS NOT NULL
    AND p.deleted_at IS NULL
    AND v.deleted_at IS NULL
),
muribaleine_popup_normal_prices AS (
  SELECT
    pli.id AS source_item_id,
    pli.price_list_id AS source_price_list_id,
    pli.product_id,
    pli.variant_id,
    pli.unit_amount,
    NULL::integer AS compare_at_amount,
    pli.min_purchase_quantity,
    pli.max_purchase_quantity,
    NULL::timestamptz AS starts_at,
    NULL::timestamptz AS ends_at,
    COALESCE(pli.channel_scope_json, '[]'::jsonb) AS channel_scope_json,
    pli.source_snapshot_json,
    pli.metadata,
    pli.created_at,
    pli.updated_at,
    20 AS source_rank
  FROM public.v2_price_list_items pli
  JOIN public.v2_price_lists pl
    ON pl.id = pli.price_list_id
  JOIN public.v2_campaigns c
    ON c.id = pl.campaign_id
  JOIN public.v2_campaign_targets ct
    ON ct.campaign_id = c.id
   AND ct.target_type = 'PROJECT'
   AND ct.is_excluded = false
   AND ct.deleted_at IS NULL
  JOIN public.v2_projects project
    ON project.id = ct.target_id
  JOIN public.v2_products p
    ON p.id = pli.product_id
  JOIN public.v2_product_variants v
    ON v.id = pli.variant_id
  WHERE project.slug = 'muribaleine'
    AND pl.scope_type = 'OVERRIDE'
    AND pl.status = 'PUBLISHED'
    AND pl.deleted_at IS NULL
    AND c.campaign_type = 'POPUP'
    AND c.deleted_at IS NULL
    AND pli.status = 'ACTIVE'
    AND pli.deleted_at IS NULL
    AND pli.variant_id IS NOT NULL
    AND pli.compare_at_amount IS NULL
    AND p.deleted_at IS NULL
    AND v.deleted_at IS NULL
),
ranked_source_items AS (
  SELECT
    source_items.*,
    ROW_NUMBER() OVER (
      PARTITION BY source_items.product_id, source_items.variant_id
      ORDER BY
        source_items.source_rank ASC,
        source_items.updated_at DESC,
        source_items.created_at DESC
    ) AS row_number
  FROM (
    SELECT * FROM existing_base_items
    UNION ALL
    SELECT * FROM muribaleine_popup_normal_prices
  ) source_items
),
upserted_base_items AS (
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
  SELECT
    target_base_price_list.id,
    ranked_source_items.product_id,
    ranked_source_items.variant_id,
    'ACTIVE',
    ranked_source_items.unit_amount,
    ranked_source_items.compare_at_amount,
    ranked_source_items.min_purchase_quantity,
    ranked_source_items.max_purchase_quantity,
    ranked_source_items.starts_at,
    ranked_source_items.ends_at,
    COALESCE(ranked_source_items.channel_scope_json, '[]'::jsonb),
    'catalog',
    CONCAT('product-option-base:', ranked_source_items.product_id::text, ':', ranked_source_items.variant_id::text),
    COALESCE(ranked_source_items.source_snapshot_json, '{}'::jsonb) || jsonb_build_object(
      'source_price_list_id', ranked_source_items.source_price_list_id,
      'source_price_list_item_id', ranked_source_items.source_item_id,
      'backfill', '20260629225500_v2_product_option_base_price_reframe.sql'
    ),
    COALESCE(ranked_source_items.metadata, '{}'::jsonb) || jsonb_build_object(
      'updated_by', '20260629225500_v2_product_option_base_price_reframe.sql',
      'pricing_rule', 'product_option_default_price'
    ),
    NULL
  FROM ranked_source_items
  CROSS JOIN target_base_price_list
  WHERE ranked_source_items.row_number = 1
  ON CONFLICT ON CONSTRAINT v2_price_list_items_unique DO UPDATE
  SET
    status = 'ACTIVE',
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
    metadata = COALESCE(public.v2_price_list_items.metadata, '{}'::jsonb) || jsonb_build_object(
      'updated_by', '20260629225500_v2_product_option_base_price_reframe.sql',
      'pricing_rule', 'product_option_default_price'
    ),
    deleted_at = NULL,
    updated_at = NOW()
  RETURNING id
),
deactivated_muribaleine_override_items AS (
  UPDATE public.v2_price_list_items pli
  SET
    status = 'INACTIVE',
    metadata = COALESCE(pli.metadata, '{}'::jsonb) || jsonb_build_object(
      'deactivated_by', '20260629225500_v2_product_option_base_price_reframe.sql',
      'deactivation_reason', 'normal popup sale price migrated to product option BASE'
    ),
    updated_at = NOW()
  FROM public.v2_price_lists pl
  JOIN public.v2_campaigns c
    ON c.id = pl.campaign_id
  JOIN public.v2_campaign_targets ct
    ON ct.campaign_id = c.id
   AND ct.target_type = 'PROJECT'
   AND ct.is_excluded = false
   AND ct.deleted_at IS NULL
  JOIN public.v2_projects project
    ON project.id = ct.target_id
  WHERE pli.price_list_id = pl.id
    AND project.slug = 'muribaleine'
    AND pl.scope_type = 'OVERRIDE'
    AND pl.status = 'PUBLISHED'
    AND pl.deleted_at IS NULL
    AND c.campaign_type = 'POPUP'
    AND c.deleted_at IS NULL
    AND pli.status = 'ACTIVE'
    AND pli.deleted_at IS NULL
    AND pli.variant_id IS NOT NULL
    AND pli.compare_at_amount IS NULL
  RETURNING pli.id
)
UPDATE public.v2_price_lists pl
SET
  status = 'ARCHIVED',
  deleted_at = NOW(),
  metadata = COALESCE(pl.metadata, '{}'::jsonb) || jsonb_build_object(
    'archived_by', '20260629225500_v2_product_option_base_price_reframe.sql',
    'archive_reason', 'empty no-campaign OVERRIDE price list is legacy test data'
  ),
  updated_at = NOW()
WHERE pl.scope_type = 'OVERRIDE'
  AND pl.campaign_id IS NULL
  AND pl.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.v2_price_list_items pli
    WHERE pli.price_list_id = pl.id
      AND pli.deleted_at IS NULL
      AND pli.status = 'ACTIVE'
  );

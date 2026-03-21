-- V2 Campaign / Pricing / Promotion
-- Build project-scoped ALWAYS_ON campaign + BASE pricing from legacy price data
-- Created: 2026-03-22

WITH legacy_price_lists AS (
  SELECT
    pl.id,
    pl.name,
    pl.currency_code,
    pl.priority,
    pl.published_at,
    pl.starts_at,
    pl.ends_at,
    pl.channel_scope_json,
    pl.metadata
  FROM public.v2_price_lists pl
  WHERE pl.scope_type = 'BASE'
    AND pl.status = 'PUBLISHED'
    AND pl.deleted_at IS NULL
    AND pl.source_type = 'legacy'
    AND pl.source_id = 'products.price'
),
legacy_project_candidates AS (
  SELECT DISTINCT
    p.project_id
  FROM public.v2_price_list_items pli
  JOIN legacy_price_lists lpl
    ON lpl.id = pli.price_list_id
  JOIN public.v2_products p
    ON p.id = pli.product_id
  WHERE pli.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND p.project_id IS NOT NULL
),
project_campaign_upsert AS (
  INSERT INTO public.v2_campaigns (
    code,
    name,
    description,
    campaign_type,
    status,
    starts_at,
    ends_at,
    channel_scope_json,
    purchase_limit_json,
    source_type,
    source_id,
    source_snapshot_json,
    metadata,
    deleted_at
  )
  SELECT
    CONCAT('LEGACY-BASE-ALWAYS-ON-', REPLACE(lpc.project_id::text, '-', '')),
    CONCAT(COALESCE(p.name, 'Project'), ' Legacy Base Always On Campaign'),
    'Generated project-scoped ALWAYS_ON campaign from legacy BASE pricing data.',
    'ALWAYS_ON',
    'ACTIVE',
    NOW() - INTERVAL '1 year',
    NULL,
    '[]'::jsonb,
    '{}'::jsonb,
    'legacy',
    lpc.project_id::text,
    jsonb_build_object(
      'project_id', lpc.project_id,
      'legacy_source', 'products.price',
      'backfill', '20260322060000_v2_project_always_on_campaign_price_backfill.sql'
    ),
    jsonb_build_object(
      'created_by', '20260322060000_v2_project_always_on_campaign_price_backfill.sql',
      'legacy_source', 'products.price'
    ),
    NULL
  FROM legacy_project_candidates lpc
  LEFT JOIN public.v2_projects p
    ON p.id = lpc.project_id
  ON CONFLICT (code) DO UPDATE
  SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    campaign_type = EXCLUDED.campaign_type,
    status = EXCLUDED.status,
    starts_at = COALESCE(public.v2_campaigns.starts_at, EXCLUDED.starts_at),
    ends_at = NULL,
    channel_scope_json = EXCLUDED.channel_scope_json,
    purchase_limit_json = EXCLUDED.purchase_limit_json,
    source_type = EXCLUDED.source_type,
    source_id = EXCLUDED.source_id,
    source_snapshot_json = EXCLUDED.source_snapshot_json,
    metadata = COALESCE(public.v2_campaigns.metadata, '{}'::jsonb) || jsonb_build_object(
      'updated_by', '20260322060000_v2_project_always_on_campaign_price_backfill.sql',
      'legacy_source', 'products.price'
    ),
    deleted_at = NULL,
    updated_at = NOW()
  RETURNING id
),
project_campaigns AS (
  SELECT
    lpc.project_id,
    c.id AS campaign_id
  FROM legacy_project_candidates lpc
  JOIN public.v2_campaigns c
    ON c.code = CONCAT('LEGACY-BASE-ALWAYS-ON-', REPLACE(lpc.project_id::text, '-', ''))
   AND c.deleted_at IS NULL
),
campaign_target_upsert AS (
  INSERT INTO public.v2_campaign_targets (
    campaign_id,
    target_type,
    target_id,
    sort_order,
    is_excluded,
    source_type,
    source_id,
    source_snapshot_json,
    metadata,
    deleted_at
  )
  SELECT
    pc.campaign_id,
    'PROJECT',
    pc.project_id,
    0,
    false,
    'legacy',
    'products.price.project.target',
    jsonb_build_object(
      'project_id', pc.project_id,
      'backfill', '20260322060000_v2_project_always_on_campaign_price_backfill.sql'
    ),
    jsonb_build_object(
      'created_by', '20260322060000_v2_project_always_on_campaign_price_backfill.sql'
    ),
    NULL
  FROM project_campaigns pc
  ON CONFLICT (campaign_id, target_type, target_id) DO UPDATE
  SET
    is_excluded = false,
    sort_order = LEAST(public.v2_campaign_targets.sort_order, 0),
    source_type = EXCLUDED.source_type,
    source_id = EXCLUDED.source_id,
    source_snapshot_json = EXCLUDED.source_snapshot_json,
    metadata = COALESCE(public.v2_campaign_targets.metadata, '{}'::jsonb) || jsonb_build_object(
      'updated_by', '20260322060000_v2_project_always_on_campaign_price_backfill.sql'
    ),
    deleted_at = NULL,
    updated_at = NOW()
  RETURNING id
),
legacy_project_price_lists AS (
  SELECT DISTINCT
    lpl.id AS legacy_price_list_id,
    lpl.name AS legacy_price_list_name,
    lpl.currency_code,
    lpl.priority,
    lpl.published_at,
    lpl.starts_at,
    lpl.ends_at,
    lpl.channel_scope_json,
    lpl.metadata AS legacy_price_list_metadata,
    p.project_id,
    pc.campaign_id,
    pjt.slug AS project_slug
  FROM public.v2_price_list_items pli
  JOIN legacy_price_lists lpl
    ON lpl.id = pli.price_list_id
  JOIN public.v2_products p
    ON p.id = pli.product_id
  JOIN project_campaigns pc
    ON pc.project_id = p.project_id
  LEFT JOIN public.v2_projects pjt
    ON pjt.id = p.project_id
  WHERE pli.deleted_at IS NULL
    AND p.deleted_at IS NULL
),
project_price_list_upsert AS (
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
    lppl.campaign_id,
    NULL,
    CONCAT(
      COALESCE(NULLIF(lppl.legacy_price_list_name, ''), 'Legacy Base Price'),
      ' / ',
      COALESCE(NULLIF(lppl.project_slug, ''), lppl.project_id::text),
      ' (ALWAYS_ON)'
    ),
    'BASE',
    'PUBLISHED',
    lppl.currency_code,
    lppl.priority,
    COALESCE(lppl.published_at, NOW()),
    lppl.starts_at,
    lppl.ends_at,
    COALESCE(lppl.channel_scope_json, '[]'::jsonb),
    'legacy',
    CONCAT('products.price.project:', lppl.project_id::text, ':', lppl.legacy_price_list_id::text),
    jsonb_build_object(
      'project_id', lppl.project_id,
      'legacy_price_list_id', lppl.legacy_price_list_id,
      'backfill', '20260322060000_v2_project_always_on_campaign_price_backfill.sql'
    ),
    COALESCE(lppl.legacy_price_list_metadata, '{}'::jsonb) || jsonb_build_object(
      'created_by', '20260322060000_v2_project_always_on_campaign_price_backfill.sql',
      'legacy_price_list_id', lppl.legacy_price_list_id::text
    ),
    NULL
  FROM legacy_project_price_lists lppl
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.v2_price_lists existing
    WHERE existing.source_type = 'legacy'
      AND existing.source_id = CONCAT(
        'products.price.project:',
        lppl.project_id::text,
        ':',
        lppl.legacy_price_list_id::text
      )
      AND existing.deleted_at IS NULL
  )
  RETURNING id
),
project_price_lists AS (
  SELECT
    lppl.project_id,
    lppl.legacy_price_list_id,
    pl.id AS project_price_list_id
  FROM legacy_project_price_lists lppl
  JOIN public.v2_price_lists pl
    ON pl.source_type = 'legacy'
   AND pl.source_id = CONCAT('products.price.project:', lppl.project_id::text, ':', lppl.legacy_price_list_id::text)
   AND pl.deleted_at IS NULL
),
legacy_project_price_items AS (
  SELECT
    pli.id AS legacy_price_list_item_id,
    pli.price_list_id AS legacy_price_list_id,
    p.project_id,
    pli.product_id,
    pli.variant_id,
    pli.status,
    pli.unit_amount,
    pli.compare_at_amount,
    pli.min_purchase_quantity,
    pli.max_purchase_quantity,
    pli.starts_at,
    pli.ends_at,
    pli.channel_scope_json,
    pli.source_snapshot_json,
    pli.metadata
  FROM public.v2_price_list_items pli
  JOIN legacy_price_lists lpl
    ON lpl.id = pli.price_list_id
  JOIN public.v2_products p
    ON p.id = pli.product_id
  WHERE pli.deleted_at IS NULL
    AND p.deleted_at IS NULL
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
  ppl.project_price_list_id,
  lppi.product_id,
  lppi.variant_id,
  lppi.status,
  lppi.unit_amount,
  lppi.compare_at_amount,
  lppi.min_purchase_quantity,
  lppi.max_purchase_quantity,
  lppi.starts_at,
  lppi.ends_at,
  COALESCE(lppi.channel_scope_json, '[]'::jsonb),
  'legacy',
  CONCAT('products.price.project.item:', lppi.legacy_price_list_item_id::text),
  COALESCE(lppi.source_snapshot_json, '{}'::jsonb) || jsonb_build_object(
    'project_id', lppi.project_id,
    'legacy_price_list_id', lppi.legacy_price_list_id,
    'legacy_price_list_item_id', lppi.legacy_price_list_item_id,
    'backfill', '20260322060000_v2_project_always_on_campaign_price_backfill.sql'
  ),
  COALESCE(lppi.metadata, '{}'::jsonb) || jsonb_build_object(
    'created_by', '20260322060000_v2_project_always_on_campaign_price_backfill.sql',
    'legacy_price_list_item_id', lppi.legacy_price_list_item_id::text
  ),
  NULL
FROM legacy_project_price_items lppi
JOIN project_price_lists ppl
  ON ppl.project_id = lppi.project_id
 AND ppl.legacy_price_list_id = lppi.legacy_price_list_id
ON CONFLICT ON CONSTRAINT v2_price_list_items_unique DO UPDATE
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
  metadata = COALESCE(public.v2_price_list_items.metadata, '{}'::jsonb) || jsonb_build_object(
    'updated_by', '20260322060000_v2_project_always_on_campaign_price_backfill.sql'
  ),
  deleted_at = NULL,
  updated_at = NOW();

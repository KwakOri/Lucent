-- V2 Campaign / Pricing / Promotion
-- Ensure legacy BASE price lists are linked to an ACTIVE ALWAYS_ON campaign
-- Created: 2026-03-22

WITH legacy_always_on_campaign AS (
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
  VALUES (
    'LEGACY-BASE-ALWAYS-ON',
    'Legacy Base Price Always On Campaign',
    'Generated campaign used to make legacy BASE price lists shop-pricing eligible.',
    'ALWAYS_ON',
    'ACTIVE',
    NOW() - INTERVAL '1 year',
    NULL,
    '[]'::jsonb,
    '{}'::jsonb,
    'legacy',
    'products.price.base',
    '{}'::jsonb,
    jsonb_build_object(
      'backfill', 'products.price.base',
      'created_by', '20260322001000_v2_pricing_base_price_list_always_on_campaign_backfill.sql'
    ),
    NULL
  )
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
      'backfill', 'products.price.base',
      'updated_by', '20260322001000_v2_pricing_base_price_list_always_on_campaign_backfill.sql'
    ),
    deleted_at = NULL,
    updated_at = NOW()
  RETURNING id
)
UPDATE public.v2_price_lists pl
SET
  campaign_id = lac.id,
  metadata = COALESCE(pl.metadata, '{}'::jsonb) || jsonb_build_object(
    'always_on_campaign_backfill',
    '20260322001000_v2_pricing_base_price_list_always_on_campaign_backfill.sql'
  ),
  updated_at = NOW()
FROM legacy_always_on_campaign lac
WHERE pl.scope_type = 'BASE'
  AND pl.status = 'PUBLISHED'
  AND pl.deleted_at IS NULL
  AND pl.source_type = 'legacy'
  AND pl.source_id = 'products.price'
  AND pl.campaign_id IS NULL;

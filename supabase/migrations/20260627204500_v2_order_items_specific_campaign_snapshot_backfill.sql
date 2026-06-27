-- v2_order_items specific campaign snapshot backfill
--
-- Purpose:
-- - Fix order item campaign snapshots that were saved as the project ALWAYS_ON
--   campaign even when the purchased product also belonged to a more specific
--   active campaign such as a popup.
--
-- Safety:
-- - Idempotent.
-- - Does not overwrite existing non-ALWAYS_ON snapshots.
-- - Chooses the most specific active non-ALWAYS_ON target.
-- - Skips ambiguous items when more than one campaign matches at the same
--   highest specificity.

WITH active_items AS (
  SELECT
    oi.id AS order_item_id,
    oi.product_id,
    oi.variant_id,
    oi.bundle_definition_id,
    oi.project_id_snapshot,
    oi.campaign_id_snapshot AS current_campaign_id,
    oi.campaign_name_snapshot AS current_campaign_name,
    COALESCE(o.placed_at, o.created_at, oi.created_at) AS order_at
  FROM public.v2_order_items oi
  JOIN public.v2_orders o
    ON o.id = oi.order_id
  LEFT JOIN public.v2_campaigns current_campaign
    ON current_campaign.id = oi.campaign_id_snapshot
  WHERE oi.line_type IN ('STANDARD', 'BUNDLE_PARENT')
    AND oi.line_status NOT IN ('CANCELED', 'REFUNDED')
    AND (
      oi.campaign_id_snapshot IS NULL
      OR current_campaign.campaign_type = 'ALWAYS_ON'
    )
),
matched_campaigns AS (
  SELECT DISTINCT
    ai.order_item_id,
    c.id AS campaign_id,
    c.name AS campaign_name,
    CASE ct.target_type
      WHEN 'BUNDLE_DEFINITION' THEN 4
      WHEN 'VARIANT' THEN 3
      WHEN 'PRODUCT' THEN 2
      WHEN 'PROJECT' THEN 1
      ELSE 0
    END AS match_priority
  FROM active_items ai
  JOIN public.v2_campaign_targets ct
    ON ct.deleted_at IS NULL
   AND ct.is_excluded = false
   AND (
     (ct.target_type = 'BUNDLE_DEFINITION' AND ct.target_id = ai.bundle_definition_id)
     OR (ct.target_type = 'VARIANT' AND ct.target_id = ai.variant_id)
     OR (ct.target_type = 'PRODUCT' AND ct.target_id = ai.product_id)
     OR (ct.target_type = 'PROJECT' AND ct.target_id = ai.project_id_snapshot)
   )
  JOIN public.v2_campaigns c
    ON c.id = ct.campaign_id
   AND c.deleted_at IS NULL
   AND c.status = 'ACTIVE'
   AND c.campaign_type <> 'ALWAYS_ON'
  WHERE (c.starts_at IS NULL OR c.starts_at <= ai.order_at)
    AND (c.ends_at IS NULL OR c.ends_at >= ai.order_at)
    AND NOT EXISTS (
      SELECT 1
      FROM public.v2_campaign_targets excluded_target
      WHERE excluded_target.campaign_id = c.id
        AND excluded_target.deleted_at IS NULL
        AND excluded_target.is_excluded = true
        AND (
          (excluded_target.target_type = 'BUNDLE_DEFINITION' AND excluded_target.target_id = ai.bundle_definition_id)
          OR (excluded_target.target_type = 'VARIANT' AND excluded_target.target_id = ai.variant_id)
          OR (excluded_target.target_type = 'PRODUCT' AND excluded_target.target_id = ai.product_id)
          OR (excluded_target.target_type = 'PROJECT' AND excluded_target.target_id = ai.project_id_snapshot)
        )
    )
),
campaign_candidates AS (
  SELECT
    mc.order_item_id,
    mc.campaign_id,
    mc.campaign_name,
    MAX(mc.match_priority) AS match_priority
  FROM matched_campaigns mc
  GROUP BY mc.order_item_id, mc.campaign_id, mc.campaign_name
),
top_campaign_candidates AS (
  SELECT
    cc.order_item_id,
    cc.campaign_id,
    cc.campaign_name,
    COUNT(*) OVER (PARTITION BY cc.order_item_id) AS top_campaign_count
  FROM campaign_candidates cc
  WHERE cc.match_priority = (
    SELECT MAX(inner_cc.match_priority)
    FROM campaign_candidates inner_cc
    WHERE inner_cc.order_item_id = cc.order_item_id
  )
),
resolved AS (
  SELECT
    tcc.order_item_id,
    tcc.campaign_id,
    tcc.campaign_name
  FROM top_campaign_candidates tcc
  WHERE tcc.top_campaign_count = 1
)
UPDATE public.v2_order_items oi
SET
  campaign_id_snapshot = resolved.campaign_id,
  campaign_name_snapshot = resolved.campaign_name,
  updated_at = NOW()
FROM resolved
WHERE oi.id = resolved.order_item_id
  AND (
    oi.campaign_id_snapshot IS DISTINCT FROM resolved.campaign_id
    OR NULLIF(BTRIM(oi.campaign_name_snapshot), '') IS DISTINCT FROM resolved.campaign_name
  );

-- v2_order_items campaign snapshot backfill
-- 목적
-- 1) selected_price_list_id 기반으로 campaign_id_snapshot 누락치를 복원
-- 2) campaign_name_snapshot 공백/NULL 값을 캠페인 이름으로 복원
--
-- 안전성
-- - 동일 SQL 재실행 가능(idempotent)
-- - 기존 값이 이미 존재하면 overwrite 하지 않음(COALESCE 기반)

WITH price_list_campaign AS (
  SELECT
    pl.id AS price_list_id,
    pl.campaign_id,
    c.name AS campaign_name
  FROM public.v2_price_lists pl
  LEFT JOIN public.v2_campaigns c
    ON c.id = pl.campaign_id
),
campaign_catalog AS (
  SELECT
    c.id AS campaign_id,
    c.name AS campaign_name
  FROM public.v2_campaigns c
),
order_item_source AS (
  SELECT
    oi.id AS order_item_id,
    CASE
      WHEN (oi.display_snapshot #>> '{pricing,selected_price_list_id}')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN (oi.display_snapshot #>> '{pricing,selected_price_list_id}')::uuid
      ELSE NULL::uuid
    END AS selected_price_list_id,
    oi.campaign_id_snapshot,
    oi.campaign_name_snapshot
  FROM public.v2_order_items oi
)
UPDATE public.v2_order_items oi
SET
  campaign_id_snapshot = COALESCE(src.campaign_id_snapshot, plc.campaign_id),
  campaign_name_snapshot = COALESCE(
    NULLIF(BTRIM(src.campaign_name_snapshot), ''),
    COALESCE(plc.campaign_name, cc.campaign_name)
  ),
  updated_at = NOW()
FROM order_item_source src
LEFT JOIN price_list_campaign plc
  ON plc.price_list_id = src.selected_price_list_id
LEFT JOIN campaign_catalog cc
  ON cc.campaign_id = COALESCE(src.campaign_id_snapshot, plc.campaign_id)
WHERE oi.id = src.order_item_id
  AND (
    (src.campaign_id_snapshot IS NULL AND plc.campaign_id IS NOT NULL)
    OR (
      (src.campaign_name_snapshot IS NULL OR BTRIM(src.campaign_name_snapshot) = '')
      AND COALESCE(plc.campaign_name, cc.campaign_name) IS NOT NULL
    )
  );

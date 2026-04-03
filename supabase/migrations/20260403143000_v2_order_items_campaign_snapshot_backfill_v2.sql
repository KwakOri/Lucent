-- v2_order_items campaign snapshot backfill v2
-- 목적
-- 1) campaign_id_snapshot 누락을 가격표/프로젝트-캠페인 매핑으로 복원
-- 2) campaign_name_snapshot 누락을 캠페인 이름으로 복원
--
-- 우선순위
-- - campaign_id: 기존값 > selected_price_list_id 매핑 > project+order_at 단일 ACTIVE 캠페인
-- - campaign_name: 기존값 > selected_price_list_id 매핑명 > project 후보명 > campaign_id 카탈로그명
--
-- 안전성
-- - 동일 SQL 재실행 가능(idempotent)
-- - 기존 campaign_id/name 값이 있으면 덮어쓰지 않음

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
    oi.campaign_id_snapshot AS current_campaign_id,
    oi.campaign_name_snapshot AS current_campaign_name,
    oi.project_id_snapshot,
    CASE
      WHEN (oi.display_snapshot #>> '{pricing,selected_price_list_id}')
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN (oi.display_snapshot #>> '{pricing,selected_price_list_id}')::uuid
      ELSE NULL::uuid
    END AS selected_price_list_id,
    COALESCE(o.placed_at, o.created_at) AS order_at
  FROM public.v2_order_items oi
  JOIN public.v2_orders o
    ON o.id = oi.order_id
  WHERE oi.line_status NOT IN ('CANCELED', 'REFUNDED')
),
project_campaign_candidates AS (
  SELECT
    src.order_item_id,
    c.id AS campaign_id,
    c.name AS campaign_name,
    COUNT(*) OVER (PARTITION BY src.order_item_id) AS candidate_count
  FROM order_item_source src
  JOIN public.v2_campaign_targets ct
    ON ct.target_type = 'PROJECT'
   AND ct.target_id = src.project_id_snapshot
   AND ct.deleted_at IS NULL
   AND ct.is_excluded = false
  JOIN public.v2_campaigns c
    ON c.id = ct.campaign_id
   AND c.deleted_at IS NULL
   AND c.status = 'ACTIVE'
  WHERE (c.starts_at IS NULL OR c.starts_at <= src.order_at)
    AND (c.ends_at IS NULL OR c.ends_at >= src.order_at)
),
project_campaign_unique AS (
  SELECT
    pcc.order_item_id,
    pcc.campaign_id,
    pcc.campaign_name
  FROM project_campaign_candidates pcc
  WHERE pcc.candidate_count = 1
),
resolved AS (
  SELECT
    src.order_item_id,
    COALESCE(src.current_campaign_id, plc.campaign_id, pcu.campaign_id) AS resolved_campaign_id,
    COALESCE(
      NULLIF(BTRIM(src.current_campaign_name), ''),
      plc.campaign_name,
      pcu.campaign_name,
      cc.campaign_name
    ) AS resolved_campaign_name
  FROM order_item_source src
  LEFT JOIN price_list_campaign plc
    ON plc.price_list_id = src.selected_price_list_id
  LEFT JOIN project_campaign_unique pcu
    ON pcu.order_item_id = src.order_item_id
  LEFT JOIN campaign_catalog cc
    ON cc.campaign_id = COALESCE(src.current_campaign_id, plc.campaign_id, pcu.campaign_id)
)
UPDATE public.v2_order_items oi
SET
  campaign_id_snapshot = COALESCE(oi.campaign_id_snapshot, rs.resolved_campaign_id),
  campaign_name_snapshot = COALESCE(
    NULLIF(BTRIM(oi.campaign_name_snapshot), ''),
    rs.resolved_campaign_name
  ),
  updated_at = NOW()
FROM resolved rs
WHERE oi.id = rs.order_item_id
  AND (
    (oi.campaign_id_snapshot IS NULL AND rs.resolved_campaign_id IS NOT NULL)
    OR (
      (oi.campaign_name_snapshot IS NULL OR BTRIM(oi.campaign_name_snapshot) = '')
      AND rs.resolved_campaign_name IS NOT NULL
    )
  );

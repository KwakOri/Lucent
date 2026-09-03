-- Add the fields needed by the admin stats detail tabs to the existing facts
-- view. Orders, items, product labels, and bundle amounts are returned by the
-- same facts query so the API does not issue one query per aggregate/tab.

CREATE INDEX IF NOT EXISTS idx_v2_order_items_sales_stats_filters
  ON public.v2_order_items(project_id_snapshot, campaign_id_snapshot, line_type, order_id);

CREATE INDEX IF NOT EXISTS idx_v2_campaign_targets_project_scope
  ON public.v2_campaign_targets(campaign_id, target_type, target_id, is_excluded)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.v2_admin_campaigns_for_project(
  p_project_id uuid
)
RETURNS SETOF public.v2_campaigns
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT c.*
  FROM public.v2_campaigns c
  WHERE c.deleted_at IS NULL
    AND (
      c.project_id = p_project_id
      OR EXISTS (
        SELECT 1
        FROM public.v2_campaign_targets ct
        WHERE ct.campaign_id = c.id
          AND ct.deleted_at IS NULL
          AND ct.is_excluded = false
          AND (
            (ct.target_type = 'PROJECT' AND ct.target_id = p_project_id)
            OR (
              ct.target_type = 'PRODUCT'
              AND EXISTS (
                SELECT 1
                FROM public.v2_products p
                WHERE p.id = ct.target_id
                  AND p.project_id = p_project_id
              )
            )
            OR (
              ct.target_type = 'VARIANT'
              AND EXISTS (
                SELECT 1
                FROM public.v2_product_variants v
                WHERE v.id = ct.target_id
                  AND v.product_id IN (
                    SELECT p.id
                    FROM public.v2_products p
                    WHERE p.project_id = p_project_id
                  )
              )
            )
            OR (
              ct.target_type = 'BUNDLE_DEFINITION'
              AND EXISTS (
                SELECT 1
                FROM public.v2_bundle_definitions bd
                JOIN public.v2_products p
                  ON p.id = bd.bundle_product_id
                WHERE bd.id = ct.target_id
                  AND p.project_id = p_project_id
              )
            )
          )
      )
    )
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE VIEW public.v2_admin_sales_item_facts_view AS
WITH bundle_component_totals AS (
  SELECT
    parent_order_item_id,
    SUM(final_line_total) AS component_final_line_total
  FROM public.v2_order_items
  WHERE line_type = 'BUNDLE_COMPONENT'
  GROUP BY parent_order_item_id
)
SELECT
  oi.id AS order_item_id,
  oi.order_id,
  o.order_no,
  o.sales_channel_id,
  o.order_status,
  o.payment_status,
  o.currency_code,
  o.placed_at,
  (o.placed_at AT TIME ZONE 'UTC')::date AS placed_date,
  oi.line_type,
  oi.quantity,
  CAST(
    CASE
      WHEN oi.line_type = 'BUNDLE_PARENT'
        AND COALESCE(oi.final_line_total, 0) <= 0
        THEN COALESCE(bct.component_final_line_total, oi.final_line_total, 0)
      ELSE oi.final_line_total
    END AS integer
  ) AS final_line_total,
  oi.project_id_snapshot,
  oi.project_name_snapshot,
  oi.campaign_id_snapshot,
  oi.campaign_name_snapshot,
  c.campaign_type,
  o.grand_total AS order_grand_total,
  oi.product_id,
  oi.variant_id,
  oi.product_name_snapshot,
  oi.variant_name_snapshot
FROM public.v2_order_items oi
JOIN public.v2_orders o
  ON o.id = oi.order_id
LEFT JOIN bundle_component_totals bct
  ON bct.parent_order_item_id = oi.id
LEFT JOIN public.v2_campaigns c
  ON c.id = oi.campaign_id_snapshot
WHERE oi.line_type IN ('STANDARD', 'BUNDLE_PARENT');

COMMENT ON VIEW public.v2_admin_sales_item_facts_view IS
  'Admin sales facts and detail-tab fields, including one-row-per-order-item bundle reconciliation';

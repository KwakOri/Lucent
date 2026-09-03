-- Add order-level shipping amounts to the admin sales facts used by reports.
-- The report needs to distinguish product gross from the amount charged at
-- checkout, especially when a shipping surcharge is present.

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
  oi.variant_name_snapshot,
  o.shipping_amount AS order_shipping_amount,
  o.shipping_discount_total AS order_shipping_discount_total
FROM public.v2_order_items oi
JOIN public.v2_orders o
  ON o.id = oi.order_id
LEFT JOIN bundle_component_totals bct
  ON bct.parent_order_item_id = oi.id
LEFT JOIN public.v2_campaigns c
  ON c.id = oi.campaign_id_snapshot
WHERE oi.line_type IN ('STANDARD', 'BUNDLE_PARENT');

COMMENT ON VIEW public.v2_admin_sales_item_facts_view IS
  'Admin sales facts with bundle reconciliation and order-level shipping breakdown';

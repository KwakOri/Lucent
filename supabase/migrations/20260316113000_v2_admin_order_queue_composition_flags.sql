-- V2 Admin order queue composition flags
-- Created: 2026-03-16
-- Description: add bundle/physical/digital composition flags to admin order queue view

CREATE OR REPLACE VIEW public.v2_admin_order_queue_view AS
SELECT
  o.id AS order_id,
  o.order_no,
  o.sales_channel_id,
  o.order_status,
  o.payment_status,
  o.fulfillment_status,
  o.grand_total,
  o.placed_at,
  o.created_at,
  COUNT(DISTINCT fg.id) AS fulfillment_group_count,
  COUNT(DISTINCT sh.id) FILTER (
    WHERE sh.status IN ('READY_TO_PACK', 'PACKING', 'SHIPPED', 'IN_TRANSIT')
  ) AS active_shipment_count,
  COUNT(DISTINCT sh.id) FILTER (
    WHERE sh.status IN ('READY_TO_PACK', 'PACKING')
  ) AS waiting_shipment_count,
  COUNT(DISTINCT sh.id) FILTER (
    WHERE sh.status IN ('SHIPPED', 'IN_TRANSIT')
  ) AS in_transit_shipment_count,
  COUNT(DISTINCT sh.id) FILTER (
    WHERE sh.status = 'DELIVERED'
  ) AS delivered_shipment_count,
  COUNT(DISTINCT de.id) FILTER (
    WHERE de.status IN ('PENDING', 'GRANTED')
  ) AS active_entitlement_count,
  EXISTS (
    SELECT 1
    FROM public.v2_order_items oi
    WHERE oi.order_id = o.id
      AND oi.line_status NOT IN ('CANCELED', 'REFUNDED')
      AND oi.line_type IN ('BUNDLE_PARENT', 'BUNDLE_COMPONENT')
  ) AS has_bundle,
  EXISTS (
    SELECT 1
    FROM public.v2_order_items oi
    WHERE oi.order_id = o.id
      AND oi.line_status NOT IN ('CANCELED', 'REFUNDED')
      AND oi.line_type <> 'BUNDLE_PARENT'
      AND (
        oi.fulfillment_type_snapshot = 'PHYSICAL'
        OR oi.requires_shipping_snapshot IS TRUE
      )
  ) AS has_physical,
  EXISTS (
    SELECT 1
    FROM public.v2_order_items oi
    WHERE oi.order_id = o.id
      AND oi.line_status NOT IN ('CANCELED', 'REFUNDED')
      AND oi.line_type <> 'BUNDLE_PARENT'
      AND (
        oi.fulfillment_type_snapshot = 'DIGITAL'
        OR oi.requires_shipping_snapshot IS FALSE
      )
  ) AS has_digital
FROM public.v2_orders o
LEFT JOIN public.v2_fulfillment_groups fg
  ON fg.order_id = o.id
LEFT JOIN public.v2_fulfillments f
  ON f.fulfillment_group_id = fg.id
LEFT JOIN public.v2_shipments sh
  ON sh.fulfillment_id = f.id
LEFT JOIN public.v2_digital_entitlements de
  ON de.order_id = o.id
GROUP BY o.id;

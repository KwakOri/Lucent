-- V2 Order/Fulfillment Legacy Backfill
-- Created: 2026-03-22
-- Description:
--   Backfill legacy orders/order_items/shipments into v2 order + fulfillment structures.
--   cart_items is intentionally excluded from migration scope.
-- Scope:
--   - public.orders -> public.v2_orders
--   - public.order_items -> public.v2_order_items
--   - public.shipments -> public.v2_fulfillment_groups / public.v2_fulfillments / public.v2_shipments / public.v2_shipment_items
--   - digital lines -> public.v2_digital_entitlements
--   - mapping trace -> public.v2_cutover_legacy_mappings

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 0. Legacy base snapshots
-- =====================================================

WITH legacy_order_totals AS (
  SELECT
    oi.order_id,
    COALESCE(SUM(GREATEST(oi.price_snapshot, 0) * GREATEST(oi.quantity, 0)), 0) AS item_total
  FROM public.order_items oi
  GROUP BY oi.order_id
),
legacy_orders_base AS (
  SELECT
    o.id AS legacy_order_id,
    o.user_id,
    o.order_number,
    o.status AS legacy_status,
    o.total_price,
    o.created_at,
    o.updated_at,
    o.buyer_name,
    o.buyer_email,
    o.buyer_phone,
    o.shipping_name,
    o.shipping_phone,
    o.shipping_main_address,
    o.shipping_detail_address,
    o.shipping_memo,
    o.admin_memo,
    COALESCE(lot.item_total, 0) AS item_total
  FROM public.orders o
  LEFT JOIN legacy_order_totals lot
    ON lot.order_id = o.id
),
legacy_orders_mapped AS (
  SELECT
    lob.*,
    CASE
      WHEN lob.legacy_status::text = 'DONE' THEN 'COMPLETED'::v2_order_status_enum
      WHEN lob.legacy_status::text IN ('PAID', 'MAKING', 'SHIPPING') THEN 'CONFIRMED'::v2_order_status_enum
      ELSE 'PENDING'::v2_order_status_enum
    END AS v2_order_status,
    CASE
      WHEN lob.legacy_status::text IN ('PAID', 'MAKING', 'SHIPPING', 'DONE') THEN 'CAPTURED'::v2_payment_status_enum
      ELSE 'PENDING'::v2_payment_status_enum
    END AS v2_payment_status,
    CASE
      WHEN lob.legacy_status::text = 'DONE' THEN 'FULFILLED'::v2_fulfillment_status_enum
      WHEN lob.legacy_status::text IN ('MAKING', 'SHIPPING') THEN 'PARTIAL'::v2_fulfillment_status_enum
      ELSE 'UNFULFILLED'::v2_fulfillment_status_enum
    END AS v2_fulfillment_status,
    GREATEST(lob.total_price - lob.item_total, 0) AS shipping_amount
  FROM legacy_orders_base lob
)
INSERT INTO public.v2_orders (
  id,
  order_no,
  profile_id,
  guest_email_snapshot,
  sales_channel_id,
  currency_code,
  order_status,
  payment_status,
  fulfillment_status,
  source_cart_id,
  idempotency_key,
  subtotal_amount,
  item_discount_total,
  order_discount_total,
  shipping_amount,
  shipping_discount_total,
  tax_total,
  grand_total,
  customer_snapshot,
  billing_address_snapshot,
  shipping_address_snapshot,
  pricing_snapshot,
  placed_at,
  confirmed_at,
  canceled_at,
  completed_at,
  cancel_reason,
  metadata,
  created_at,
  updated_at
)
SELECT
  lom.legacy_order_id AS id,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM public.v2_orders vo
      WHERE vo.order_no = lom.order_number
        AND vo.id <> lom.legacy_order_id
    ) THEN LEFT('LEGACY-' || lom.order_number, 80)
    ELSE lom.order_number
  END AS order_no,
  lom.user_id AS profile_id,
  NULL::VARCHAR(255) AS guest_email_snapshot,
  'WEB' AS sales_channel_id,
  'KRW' AS currency_code,
  lom.v2_order_status,
  lom.v2_payment_status,
  lom.v2_fulfillment_status,
  NULL::UUID AS source_cart_id,
  'legacy-order-' || lom.legacy_order_id::text AS idempotency_key,
  GREATEST(lom.item_total, 0) AS subtotal_amount,
  0 AS item_discount_total,
  0 AS order_discount_total,
  GREATEST(lom.shipping_amount, 0) AS shipping_amount,
  0 AS shipping_discount_total,
  0 AS tax_total,
  GREATEST(lom.total_price, 0) AS grand_total,
  jsonb_strip_nulls(
    jsonb_build_object(
      'name', lom.buyer_name,
      'email', lom.buyer_email,
      'phone', lom.buyer_phone
    )
  ) AS customer_snapshot,
  NULL::JSONB AS billing_address_snapshot,
  jsonb_strip_nulls(
    jsonb_build_object(
      'recipient_name', lom.shipping_name,
      'recipient_phone', lom.shipping_phone,
      'main_address', lom.shipping_main_address,
      'detail_address', lom.shipping_detail_address,
      'memo', lom.shipping_memo
    )
  ) AS shipping_address_snapshot,
  jsonb_build_object(
    'source', 'legacy.orders',
    'legacy_status', lom.legacy_status::text,
    'legacy_total_price', lom.total_price,
    'legacy_item_total', lom.item_total
  ) AS pricing_snapshot,
  lom.created_at AS placed_at,
  CASE
    WHEN lom.legacy_status::text IN ('PAID', 'MAKING', 'SHIPPING', 'DONE')
      THEN COALESCE(lom.updated_at, lom.created_at)
    ELSE NULL
  END AS confirmed_at,
  NULL::TIMESTAMPTZ AS canceled_at,
  CASE
    WHEN lom.legacy_status::text = 'DONE'
      THEN COALESCE(lom.updated_at, lom.created_at)
    ELSE NULL
  END AS completed_at,
  NULL::TEXT AS cancel_reason,
  jsonb_build_object(
    'source', 'legacy.orders',
    'legacy_order_id', lom.legacy_order_id,
    'legacy_order_number', lom.order_number,
    'legacy_admin_memo', lom.admin_memo,
    'backfilled_at', NOW()
  ) AS metadata,
  lom.created_at,
  COALESCE(lom.updated_at, lom.created_at) AS updated_at
FROM legacy_orders_mapped lom
ON CONFLICT (id) DO UPDATE
SET
  order_no = EXCLUDED.order_no,
  profile_id = EXCLUDED.profile_id,
  guest_email_snapshot = EXCLUDED.guest_email_snapshot,
  sales_channel_id = EXCLUDED.sales_channel_id,
  currency_code = EXCLUDED.currency_code,
  order_status = EXCLUDED.order_status,
  payment_status = EXCLUDED.payment_status,
  fulfillment_status = EXCLUDED.fulfillment_status,
  source_cart_id = EXCLUDED.source_cart_id,
  idempotency_key = EXCLUDED.idempotency_key,
  subtotal_amount = EXCLUDED.subtotal_amount,
  item_discount_total = EXCLUDED.item_discount_total,
  order_discount_total = EXCLUDED.order_discount_total,
  shipping_amount = EXCLUDED.shipping_amount,
  shipping_discount_total = EXCLUDED.shipping_discount_total,
  tax_total = EXCLUDED.tax_total,
  grand_total = EXCLUDED.grand_total,
  customer_snapshot = EXCLUDED.customer_snapshot,
  billing_address_snapshot = EXCLUDED.billing_address_snapshot,
  shipping_address_snapshot = EXCLUDED.shipping_address_snapshot,
  pricing_snapshot = EXCLUDED.pricing_snapshot,
  placed_at = EXCLUDED.placed_at,
  confirmed_at = EXCLUDED.confirmed_at,
  canceled_at = EXCLUDED.canceled_at,
  completed_at = EXCLUDED.completed_at,
  cancel_reason = EXCLUDED.cancel_reason,
  metadata = EXCLUDED.metadata,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- 1. Legacy order items -> v2_order_items
-- =====================================================

WITH legacy_order_items_enriched AS (
  SELECT
    oi.id AS legacy_order_item_id,
    oi.order_id AS legacy_order_id,
    oi.parent_order_item_id,
    oi.product_id AS legacy_product_id,
    oi.product_name,
    oi.product_type::text AS legacy_product_type,
    oi.price_snapshot,
    oi.quantity,
    oi.download_url,
    oi.download_count,
    oi.last_downloaded_at,
    oi.item_status::text AS legacy_item_status,
    oi.line_type::text AS legacy_line_type,
    oi.bundle_definition_id_snapshot,
    oi.bundle_component_id_snapshot,
    oi.allocated_unit_amount,
    oi.allocated_discount_amount,
    oi.created_at
  FROM public.order_items oi
),
legacy_order_items_mapped AS (
  SELECT
    loie.*,
    vp.id AS v2_product_id,
    vp.project_id AS v2_project_id,
    vp.title AS v2_product_title,
    vpr.name AS v2_project_name,
    vv.id AS v2_variant_id,
    vv.sku AS v2_variant_sku,
    vv.title AS v2_variant_title,
    vv.fulfillment_type AS v2_fulfillment_type,
    vv.requires_shipping AS v2_requires_shipping,
    CASE
      WHEN loie.legacy_line_type = 'BUNDLE_COMPONENT'
           AND loie.parent_order_item_id IS NULL THEN 'STANDARD'::v2_order_line_type_enum
      WHEN loie.legacy_line_type IN ('STANDARD', 'BUNDLE_PARENT', 'BUNDLE_COMPONENT')
           THEN loie.legacy_line_type::v2_order_line_type_enum
      ELSE 'STANDARD'::v2_order_line_type_enum
    END AS v2_line_type,
    CASE
      WHEN loie.legacy_item_status IN ('SHIPPED', 'DELIVERED', 'COMPLETED') THEN 'FULFILLED'::v2_order_line_status_enum
      WHEN loie.legacy_item_status IN ('PROCESSING', 'READY') THEN 'CONFIRMED'::v2_order_line_status_enum
      ELSE 'PENDING'::v2_order_line_status_enum
    END AS v2_line_status
  FROM legacy_order_items_enriched loie
  LEFT JOIN public.v2_products vp
    ON vp.legacy_product_id = loie.legacy_product_id
   AND vp.deleted_at IS NULL
  LEFT JOIN public.v2_projects vpr
    ON vpr.id = vp.project_id
   AND vpr.deleted_at IS NULL
  LEFT JOIN LATERAL (
    SELECT
      vv_inner.id,
      vv_inner.sku,
      vv_inner.title,
      vv_inner.fulfillment_type,
      vv_inner.requires_shipping
    FROM public.v2_product_variants vv_inner
    WHERE vv_inner.product_id = vp.id
      AND vv_inner.deleted_at IS NULL
    ORDER BY
      CASE
        WHEN vv_inner.sku = 'LEGACY-' || REPLACE(loie.legacy_product_id::text, '-', '') THEN 0
        ELSE 1
      END,
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
INSERT INTO public.v2_order_items (
  id,
  order_id,
  parent_order_item_id,
  line_type,
  product_id,
  variant_id,
  bundle_definition_id,
  bundle_component_id_snapshot,
  allocated_unit_amount,
  allocated_discount_amount,
  quantity,
  line_status,
  currency_code,
  list_unit_price,
  sale_unit_price,
  final_unit_price,
  line_subtotal,
  discount_total,
  tax_total,
  final_line_total,
  sku_snapshot,
  product_name_snapshot,
  variant_name_snapshot,
  project_id_snapshot,
  project_name_snapshot,
  fulfillment_type_snapshot,
  requires_shipping_snapshot,
  campaign_id_snapshot,
  campaign_name_snapshot,
  display_snapshot,
  metadata,
  created_at,
  updated_at
)
SELECT
  loim.legacy_order_item_id AS id,
  loim.legacy_order_id AS order_id,
  CASE
    WHEN loim.v2_line_type = 'BUNDLE_COMPONENT'
      THEN loim.parent_order_item_id
    ELSE NULL::UUID
  END AS parent_order_item_id,
  loim.v2_line_type AS line_type,
  loim.v2_product_id AS product_id,
  loim.v2_variant_id AS variant_id,
  loim.bundle_definition_id_snapshot AS bundle_definition_id,
  loim.bundle_component_id_snapshot,
  CASE
    WHEN loim.allocated_unit_amount IS NULL THEN NULL::INTEGER
    WHEN loim.allocated_unit_amount < 0 THEN 0
    ELSE loim.allocated_unit_amount
  END AS allocated_unit_amount,
  GREATEST(COALESCE(loim.allocated_discount_amount, 0), 0) AS allocated_discount_amount,
  GREATEST(loim.quantity, 1) AS quantity,
  loim.v2_line_status AS line_status,
  'KRW' AS currency_code,
  GREATEST(loim.price_snapshot, 0) AS list_unit_price,
  GREATEST(loim.price_snapshot, 0) AS sale_unit_price,
  GREATEST(loim.price_snapshot, 0) AS final_unit_price,
  GREATEST(loim.price_snapshot, 0) * GREATEST(loim.quantity, 1) AS line_subtotal,
  0 AS discount_total,
  0 AS tax_total,
  GREATEST(loim.price_snapshot, 0) * GREATEST(loim.quantity, 1) AS final_line_total,
  loim.v2_variant_sku AS sku_snapshot,
  COALESCE(loim.product_name, loim.v2_product_title) AS product_name_snapshot,
  loim.v2_variant_title AS variant_name_snapshot,
  loim.v2_project_id AS project_id_snapshot,
  loim.v2_project_name AS project_name_snapshot,
  COALESCE(
    loim.v2_fulfillment_type,
    CASE
      WHEN loim.legacy_product_type = 'VOICE_PACK' THEN 'DIGITAL'::v2_fulfillment_type_enum
      ELSE 'PHYSICAL'::v2_fulfillment_type_enum
    END
  ) AS fulfillment_type_snapshot,
  COALESCE(
    loim.v2_requires_shipping,
    CASE WHEN loim.legacy_product_type = 'PHYSICAL_GOODS' THEN true ELSE false END
  ) AS requires_shipping_snapshot,
  NULL::UUID AS campaign_id_snapshot,
  NULL::VARCHAR(255) AS campaign_name_snapshot,
  jsonb_strip_nulls(
    jsonb_build_object(
      'legacy_item_status', loim.legacy_item_status,
      'legacy_download_count', loim.download_count,
      'legacy_download_url', loim.download_url
    )
  ) AS display_snapshot,
  jsonb_build_object(
    'source', 'legacy.order_items',
    'legacy_order_item_id', loim.legacy_order_item_id,
    'legacy_product_id', loim.legacy_product_id,
    'legacy_product_type', loim.legacy_product_type,
    'legacy_last_downloaded_at', loim.last_downloaded_at,
    'backfilled_at', NOW()
  ) AS metadata,
  loim.created_at,
  loim.created_at AS updated_at
FROM legacy_order_items_mapped loim
ON CONFLICT (id) DO UPDATE
SET
  order_id = EXCLUDED.order_id,
  parent_order_item_id = EXCLUDED.parent_order_item_id,
  line_type = EXCLUDED.line_type,
  product_id = EXCLUDED.product_id,
  variant_id = EXCLUDED.variant_id,
  bundle_definition_id = EXCLUDED.bundle_definition_id,
  bundle_component_id_snapshot = EXCLUDED.bundle_component_id_snapshot,
  allocated_unit_amount = EXCLUDED.allocated_unit_amount,
  allocated_discount_amount = EXCLUDED.allocated_discount_amount,
  quantity = EXCLUDED.quantity,
  line_status = EXCLUDED.line_status,
  currency_code = EXCLUDED.currency_code,
  list_unit_price = EXCLUDED.list_unit_price,
  sale_unit_price = EXCLUDED.sale_unit_price,
  final_unit_price = EXCLUDED.final_unit_price,
  line_subtotal = EXCLUDED.line_subtotal,
  discount_total = EXCLUDED.discount_total,
  tax_total = EXCLUDED.tax_total,
  final_line_total = EXCLUDED.final_line_total,
  sku_snapshot = EXCLUDED.sku_snapshot,
  product_name_snapshot = EXCLUDED.product_name_snapshot,
  variant_name_snapshot = EXCLUDED.variant_name_snapshot,
  project_id_snapshot = EXCLUDED.project_id_snapshot,
  project_name_snapshot = EXCLUDED.project_name_snapshot,
  fulfillment_type_snapshot = EXCLUDED.fulfillment_type_snapshot,
  requires_shipping_snapshot = EXCLUDED.requires_shipping_snapshot,
  campaign_id_snapshot = EXCLUDED.campaign_id_snapshot,
  campaign_name_snapshot = EXCLUDED.campaign_name_snapshot,
  display_snapshot = EXCLUDED.display_snapshot,
  metadata = EXCLUDED.metadata,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- 2. Legacy shipments -> v2 fulfillment/shipment structures
-- =====================================================

WITH legacy_shipment_latest AS (
  SELECT DISTINCT ON (s.order_item_id)
    s.*
  FROM public.shipments s
  ORDER BY s.order_item_id, s.created_at DESC, s.id DESC
),
v2_shippable_lines AS (
  SELECT
    oi.id AS v2_order_item_id,
    oi.order_id AS v2_order_id,
    oi.quantity,
    oi.requires_shipping_snapshot,
    oi.fulfillment_type_snapshot,
    oi.line_type,
    oi.line_status,
    o.shipping_address_snapshot,
    o.placed_at
  FROM public.v2_order_items oi
  JOIN public.v2_orders o
    ON o.id = oi.order_id
  WHERE oi.line_type <> 'BUNDLE_PARENT'
    AND (
      oi.requires_shipping_snapshot IS TRUE
      OR oi.fulfillment_type_snapshot = 'PHYSICAL'
    )
),
legacy_shipping_joined AS (
  SELECT
    vsl.*,
    ls.id AS legacy_shipment_id,
    UPPER(COALESCE(ls.shipping_status, 'PREPARING')) AS legacy_shipping_status,
    ls.carrier,
    ls.tracking_number,
    ls.recipient_name,
    ls.recipient_phone,
    ls.recipient_address,
    ls.delivery_memo,
    ls.admin_memo,
    ls.shipped_at,
    ls.delivered_at,
    ls.created_at AS shipment_created_at,
    ls.updated_at AS shipment_updated_at
  FROM v2_shippable_lines vsl
  LEFT JOIN legacy_shipment_latest ls
    ON ls.order_item_id = vsl.v2_order_item_id
)
INSERT INTO public.v2_fulfillment_groups (
  id,
  order_id,
  kind,
  status,
  stock_location_id,
  shipping_profile_id,
  shipping_method_id,
  shipping_zone_id,
  currency_code,
  shipping_amount,
  shipping_address_snapshot,
  pickup_location_snapshot,
  planned_at,
  fulfilled_at,
  canceled_at,
  failure_reason,
  metadata,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:fulfillment_group:order_item:' || lsj.v2_order_item_id::text
  ) AS id,
  lsj.v2_order_id AS order_id,
  'SHIPMENT'::v2_fulfillment_group_kind_enum AS kind,
  CASE
    WHEN lsj.legacy_shipping_status = 'CANCELED' THEN 'CANCELED'::v2_fulfillment_group_status_enum
    WHEN lsj.legacy_shipping_status = 'DELIVERED' THEN 'FULFILLED'::v2_fulfillment_group_status_enum
    WHEN lsj.legacy_shipping_status IN ('SHIPPED', 'IN_TRANSIT', 'RETURNED') THEN 'PARTIALLY_FULFILLED'::v2_fulfillment_group_status_enum
    WHEN lsj.legacy_shipping_status IN ('PREPARING', 'PACKING') THEN 'ALLOCATED'::v2_fulfillment_group_status_enum
    WHEN lsj.legacy_shipment_id IS NULL AND lsj.line_status IN ('CONFIRMED', 'FULFILLED') THEN 'ALLOCATED'::v2_fulfillment_group_status_enum
    ELSE 'PLANNED'::v2_fulfillment_group_status_enum
  END AS status,
  NULL::UUID AS stock_location_id,
  NULL::UUID AS shipping_profile_id,
  NULL::UUID AS shipping_method_id,
  NULL::UUID AS shipping_zone_id,
  'KRW' AS currency_code,
  0 AS shipping_amount,
  COALESCE(
    lsj.shipping_address_snapshot,
    jsonb_strip_nulls(
      jsonb_build_object(
        'recipient_name', lsj.recipient_name,
        'recipient_phone', lsj.recipient_phone,
        'main_address', lsj.recipient_address,
        'memo', lsj.delivery_memo
      )
    )
  ) AS shipping_address_snapshot,
  NULL::JSONB AS pickup_location_snapshot,
  COALESCE(lsj.shipment_created_at, lsj.placed_at, NOW()) AS planned_at,
  CASE
    WHEN lsj.legacy_shipping_status = 'DELIVERED' THEN COALESCE(lsj.delivered_at, lsj.shipped_at)
    ELSE NULL::TIMESTAMPTZ
  END AS fulfilled_at,
  CASE
    WHEN lsj.legacy_shipping_status = 'CANCELED' THEN COALESCE(lsj.shipment_updated_at, lsj.shipment_created_at)
    ELSE NULL::TIMESTAMPTZ
  END AS canceled_at,
  NULL::TEXT AS failure_reason,
  jsonb_build_object(
    'source', 'legacy.shipments',
    'legacy_shipment_id', lsj.legacy_shipment_id,
    'legacy_order_item_id', lsj.v2_order_item_id,
    'legacy_shipping_status', lsj.legacy_shipping_status,
    'backfilled_at', NOW()
  ) AS metadata,
  COALESCE(lsj.shipment_created_at, lsj.placed_at, NOW()) AS created_at,
  COALESCE(lsj.shipment_updated_at, lsj.shipment_created_at, lsj.placed_at, NOW()) AS updated_at
FROM legacy_shipping_joined lsj
ON CONFLICT (id) DO UPDATE
SET
  order_id = EXCLUDED.order_id,
  kind = EXCLUDED.kind,
  status = EXCLUDED.status,
  stock_location_id = EXCLUDED.stock_location_id,
  shipping_profile_id = EXCLUDED.shipping_profile_id,
  shipping_method_id = EXCLUDED.shipping_method_id,
  shipping_zone_id = EXCLUDED.shipping_zone_id,
  currency_code = EXCLUDED.currency_code,
  shipping_amount = EXCLUDED.shipping_amount,
  shipping_address_snapshot = EXCLUDED.shipping_address_snapshot,
  pickup_location_snapshot = EXCLUDED.pickup_location_snapshot,
  planned_at = EXCLUDED.planned_at,
  fulfilled_at = EXCLUDED.fulfilled_at,
  canceled_at = EXCLUDED.canceled_at,
  failure_reason = EXCLUDED.failure_reason,
  metadata = EXCLUDED.metadata,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

WITH legacy_shipment_latest AS (
  SELECT DISTINCT ON (s.order_item_id)
    s.*
  FROM public.shipments s
  ORDER BY s.order_item_id, s.created_at DESC, s.id DESC
),
group_item_base AS (
  SELECT
    oi.id AS order_item_id,
    oi.quantity,
    oi.line_status,
    ls.id AS legacy_shipment_id,
    UPPER(COALESCE(ls.shipping_status, 'PREPARING')) AS legacy_shipping_status
  FROM public.v2_order_items oi
  LEFT JOIN legacy_shipment_latest ls
    ON ls.order_item_id = oi.id
  WHERE oi.line_type <> 'BUNDLE_PARENT'
    AND (
      oi.requires_shipping_snapshot IS TRUE
      OR oi.fulfillment_type_snapshot = 'PHYSICAL'
    )
)
INSERT INTO public.v2_fulfillment_group_items (
  id,
  fulfillment_group_id,
  order_item_id,
  quantity_planned,
  quantity_fulfilled,
  status,
  metadata,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:fulfillment_group_item:order_item:' || gib.order_item_id::text
  ) AS id,
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:fulfillment_group:order_item:' || gib.order_item_id::text
  ) AS fulfillment_group_id,
  gib.order_item_id,
  GREATEST(gib.quantity, 1) AS quantity_planned,
  CASE
    WHEN gib.legacy_shipping_status IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED') THEN GREATEST(gib.quantity, 1)
    WHEN gib.line_status = 'FULFILLED' THEN GREATEST(gib.quantity, 1)
    ELSE 0
  END AS quantity_fulfilled,
  CASE
    WHEN gib.legacy_shipping_status = 'CANCELED' THEN 'CANCELED'::v2_fulfillment_group_item_status_enum
    WHEN gib.legacy_shipping_status = 'DELIVERED' OR gib.line_status = 'FULFILLED' THEN 'FULFILLED'::v2_fulfillment_group_item_status_enum
    WHEN gib.legacy_shipping_status IN ('SHIPPED', 'IN_TRANSIT', 'RETURNED') THEN 'PARTIAL'::v2_fulfillment_group_item_status_enum
    WHEN gib.legacy_shipment_id IS NULL AND gib.line_status IN ('CONFIRMED', 'FULFILLED') THEN 'ALLOCATED'::v2_fulfillment_group_item_status_enum
    ELSE 'PLANNED'::v2_fulfillment_group_item_status_enum
  END AS status,
  jsonb_build_object(
    'source', 'legacy.shipments',
    'legacy_shipment_id', gib.legacy_shipment_id,
    'legacy_order_item_id', gib.order_item_id,
    'backfilled_at', NOW()
  ) AS metadata,
  NOW() AS created_at,
  NOW() AS updated_at
FROM group_item_base gib
ON CONFLICT (fulfillment_group_id, order_item_id) DO UPDATE
SET
  quantity_planned = EXCLUDED.quantity_planned,
  quantity_fulfilled = EXCLUDED.quantity_fulfilled,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

WITH legacy_shipment_latest AS (
  SELECT DISTINCT ON (s.order_item_id)
    s.*
  FROM public.shipments s
  ORDER BY s.order_item_id, s.created_at DESC, s.id DESC
),
fulfillment_base AS (
  SELECT
    oi.id AS order_item_id,
    ls.id AS legacy_shipment_id,
    UPPER(COALESCE(ls.shipping_status, 'PREPARING')) AS legacy_shipping_status,
    ls.shipped_at,
    ls.delivered_at,
    ls.created_at AS shipment_created_at,
    ls.updated_at AS shipment_updated_at
  FROM public.v2_order_items oi
  LEFT JOIN legacy_shipment_latest ls
    ON ls.order_item_id = oi.id
  WHERE oi.line_type <> 'BUNDLE_PARENT'
    AND (
      oi.requires_shipping_snapshot IS TRUE
      OR oi.fulfillment_type_snapshot = 'PHYSICAL'
    )
)
INSERT INTO public.v2_fulfillments (
  id,
  fulfillment_group_id,
  kind,
  status,
  provider_type,
  provider_ref,
  requested_at,
  started_at,
  completed_at,
  failed_at,
  canceled_at,
  failure_reason,
  created_by,
  metadata,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:fulfillment:order_item:' || fb.order_item_id::text
  ) AS id,
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:fulfillment_group:order_item:' || fb.order_item_id::text
  ) AS fulfillment_group_id,
  'SHIPMENT'::v2_fulfillment_group_kind_enum AS kind,
  CASE
    WHEN fb.legacy_shipping_status = 'CANCELED' THEN 'CANCELED'::v2_fulfillment_execution_status_enum
    WHEN fb.legacy_shipping_status IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED') THEN 'COMPLETED'::v2_fulfillment_execution_status_enum
    WHEN fb.legacy_shipping_status IN ('PREPARING', 'PACKING') THEN 'IN_PROGRESS'::v2_fulfillment_execution_status_enum
    ELSE 'REQUESTED'::v2_fulfillment_execution_status_enum
  END AS status,
  'LEGACY' AS provider_type,
  COALESCE(fb.legacy_shipment_id::text, 'legacy-order-item-' || fb.order_item_id::text) AS provider_ref,
  COALESCE(fb.shipment_created_at, NOW()) AS requested_at,
  CASE
    WHEN fb.legacy_shipping_status IN ('PREPARING', 'PACKING') THEN COALESCE(fb.shipment_created_at, NOW())
    WHEN fb.legacy_shipping_status IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED') THEN COALESCE(fb.shipped_at, fb.shipment_created_at, NOW())
    ELSE NULL::TIMESTAMPTZ
  END AS started_at,
  CASE
    WHEN fb.legacy_shipping_status IN ('SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED')
      THEN COALESCE(fb.delivered_at, fb.shipped_at, fb.shipment_updated_at, fb.shipment_created_at, NOW())
    ELSE NULL::TIMESTAMPTZ
  END AS completed_at,
  NULL::TIMESTAMPTZ AS failed_at,
  CASE
    WHEN fb.legacy_shipping_status = 'CANCELED'
      THEN COALESCE(fb.shipment_updated_at, fb.shipment_created_at, NOW())
    ELSE NULL::TIMESTAMPTZ
  END AS canceled_at,
  NULL::TEXT AS failure_reason,
  NULL::UUID AS created_by,
  jsonb_build_object(
    'source', 'legacy.shipments',
    'legacy_shipment_id', fb.legacy_shipment_id,
    'legacy_order_item_id', fb.order_item_id,
    'backfilled_at', NOW()
  ) AS metadata,
  COALESCE(fb.shipment_created_at, NOW()) AS created_at,
  COALESCE(fb.shipment_updated_at, fb.shipment_created_at, NOW()) AS updated_at
FROM fulfillment_base fb
ON CONFLICT (id) DO UPDATE
SET
  fulfillment_group_id = EXCLUDED.fulfillment_group_id,
  kind = EXCLUDED.kind,
  status = EXCLUDED.status,
  provider_type = EXCLUDED.provider_type,
  provider_ref = EXCLUDED.provider_ref,
  requested_at = EXCLUDED.requested_at,
  started_at = EXCLUDED.started_at,
  completed_at = EXCLUDED.completed_at,
  failed_at = EXCLUDED.failed_at,
  canceled_at = EXCLUDED.canceled_at,
  failure_reason = EXCLUDED.failure_reason,
  created_by = EXCLUDED.created_by,
  metadata = EXCLUDED.metadata,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

WITH legacy_shipment_latest AS (
  SELECT DISTINCT ON (s.order_item_id)
    s.*
  FROM public.shipments s
  ORDER BY s.order_item_id, s.created_at DESC, s.id DESC
),
shipment_base AS (
  SELECT
    ls.id AS legacy_shipment_id,
    ls.order_item_id,
    UPPER(COALESCE(ls.shipping_status, 'PREPARING')) AS legacy_shipping_status,
    ls.carrier,
    ls.tracking_number,
    ls.recipient_name,
    ls.recipient_phone,
    ls.recipient_address,
    ls.delivery_memo,
    ls.admin_memo,
    ls.shipped_at,
    ls.delivered_at,
    ls.created_at,
    ls.updated_at
  FROM legacy_shipment_latest ls
)
INSERT INTO public.v2_shipments (
  id,
  fulfillment_id,
  carrier,
  service_level,
  tracking_no,
  tracking_url,
  label_ref,
  status,
  packed_at,
  shipped_at,
  in_transit_at,
  delivered_at,
  returned_at,
  canceled_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:v2_shipment:' || sb.legacy_shipment_id::text
  ) AS id,
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:fulfillment:order_item:' || sb.order_item_id::text
  ) AS fulfillment_id,
  sb.carrier,
  NULL::VARCHAR(100) AS service_level,
  sb.tracking_number AS tracking_no,
  NULL::VARCHAR(1000) AS tracking_url,
  NULL::VARCHAR(255) AS label_ref,
  CASE
    WHEN sb.legacy_shipping_status = 'CANCELED' THEN 'CANCELED'::v2_shipment_status_enum
    WHEN sb.legacy_shipping_status = 'RETURNED' THEN 'RETURNED'::v2_shipment_status_enum
    WHEN sb.legacy_shipping_status = 'DELIVERED' THEN 'DELIVERED'::v2_shipment_status_enum
    WHEN sb.legacy_shipping_status = 'IN_TRANSIT' THEN 'IN_TRANSIT'::v2_shipment_status_enum
    WHEN sb.legacy_shipping_status = 'SHIPPED' THEN 'SHIPPED'::v2_shipment_status_enum
    WHEN sb.legacy_shipping_status = 'PACKING' THEN 'PACKING'::v2_shipment_status_enum
    ELSE 'READY_TO_PACK'::v2_shipment_status_enum
  END AS status,
  NULL::TIMESTAMPTZ AS packed_at,
  sb.shipped_at,
  CASE
    WHEN sb.legacy_shipping_status IN ('IN_TRANSIT', 'DELIVERED', 'RETURNED')
      THEN COALESCE(sb.shipped_at, sb.created_at)
    ELSE NULL::TIMESTAMPTZ
  END AS in_transit_at,
  sb.delivered_at,
  NULL::TIMESTAMPTZ AS returned_at,
  CASE
    WHEN sb.legacy_shipping_status = 'CANCELED' THEN COALESCE(sb.updated_at, sb.created_at)
    ELSE NULL::TIMESTAMPTZ
  END AS canceled_at,
  jsonb_build_object(
    'source', 'legacy.shipments',
    'legacy_shipment_id', sb.legacy_shipment_id,
    'recipient_name', sb.recipient_name,
    'recipient_phone', sb.recipient_phone,
    'recipient_address', sb.recipient_address,
    'delivery_memo', sb.delivery_memo,
    'legacy_admin_memo', sb.admin_memo,
    'backfilled_at', NOW()
  ) AS metadata,
  sb.created_at,
  COALESCE(sb.updated_at, sb.created_at) AS updated_at
FROM shipment_base sb
ON CONFLICT (id) DO UPDATE
SET
  fulfillment_id = EXCLUDED.fulfillment_id,
  carrier = EXCLUDED.carrier,
  service_level = EXCLUDED.service_level,
  tracking_no = EXCLUDED.tracking_no,
  tracking_url = EXCLUDED.tracking_url,
  label_ref = EXCLUDED.label_ref,
  status = EXCLUDED.status,
  packed_at = EXCLUDED.packed_at,
  shipped_at = EXCLUDED.shipped_at,
  in_transit_at = EXCLUDED.in_transit_at,
  delivered_at = EXCLUDED.delivered_at,
  returned_at = EXCLUDED.returned_at,
  canceled_at = EXCLUDED.canceled_at,
  metadata = EXCLUDED.metadata,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

WITH legacy_shipment_latest AS (
  SELECT DISTINCT ON (s.order_item_id)
    s.*
  FROM public.shipments s
  ORDER BY s.order_item_id, s.created_at DESC, s.id DESC
)
INSERT INTO public.v2_shipment_items (
  id,
  shipment_id,
  order_item_id,
  fulfillment_group_item_id,
  quantity,
  created_at
)
SELECT
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:shipment_item:order_item:' || ls.order_item_id::text
  ) AS id,
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:v2_shipment:' || ls.id::text
  ) AS shipment_id,
  ls.order_item_id AS order_item_id,
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:fulfillment_group_item:order_item:' || ls.order_item_id::text
  ) AS fulfillment_group_item_id,
  GREATEST(COALESCE(oi.quantity, 1), 1) AS quantity,
  ls.created_at AS created_at
FROM legacy_shipment_latest ls
JOIN public.v2_order_items oi
  ON oi.id = ls.order_item_id
ON CONFLICT (id) DO UPDATE
SET
  shipment_id = EXCLUDED.shipment_id,
  order_item_id = EXCLUDED.order_item_id,
  fulfillment_group_item_id = EXCLUDED.fulfillment_group_item_id,
  quantity = EXCLUDED.quantity,
  created_at = EXCLUDED.created_at;

-- =====================================================
-- 3. Digital entitlement minimal backfill
-- =====================================================

WITH digital_line_base AS (
  SELECT
    oi.id AS v2_order_item_id,
    oi.order_id AS v2_order_id,
    oi.variant_id,
    oi.line_status,
    o.payment_status,
    o.placed_at,
    o.confirmed_at,
    loi.download_url,
    loi.download_count,
    loi.last_downloaded_at
  FROM public.v2_order_items oi
  JOIN public.v2_orders o
    ON o.id = oi.order_id
  LEFT JOIN public.order_items loi
    ON loi.id = oi.id
  WHERE oi.line_type <> 'BUNDLE_PARENT'
    AND oi.fulfillment_type_snapshot = 'DIGITAL'
    AND oi.line_status NOT IN ('CANCELED', 'REFUNDED')
),
digital_line_asset AS (
  SELECT
    dlb.*,
    da.id AS digital_asset_id
  FROM digital_line_base dlb
  LEFT JOIN LATERAL (
    SELECT da_inner.id
    FROM public.v2_digital_assets da_inner
    WHERE da_inner.variant_id = dlb.variant_id
      AND da_inner.deleted_at IS NULL
    ORDER BY
      CASE da_inner.status
        WHEN 'READY' THEN 0
        WHEN 'DRAFT' THEN 1
        WHEN 'RETIRED' THEN 2
        ELSE 3
      END,
      da_inner.version_no DESC,
      da_inner.created_at DESC
    LIMIT 1
  ) da ON TRUE
)
INSERT INTO public.v2_digital_entitlements (
  id,
  order_id,
  order_item_id,
  digital_asset_id,
  fulfillment_id,
  status,
  access_type,
  token_hash,
  token_reference,
  granted_at,
  expires_at,
  max_downloads,
  download_count,
  revoked_at,
  revoke_reason,
  failed_at,
  metadata,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v5(
    uuid_ns_url(),
    'legacy:digital_entitlement:order_item:' || dla.v2_order_item_id::text
  ) AS id,
  dla.v2_order_id AS order_id,
  dla.v2_order_item_id AS order_item_id,
  dla.digital_asset_id,
  NULL::UUID AS fulfillment_id,
  CASE
    WHEN (
      dla.payment_status IN ('CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED')
      OR COALESCE(dla.download_count, 0) > 0
      OR COALESCE(NULLIF(dla.download_url, ''), '') <> ''
      OR dla.line_status = 'FULFILLED'
    ) THEN 'GRANTED'::v2_digital_entitlement_status_enum
    ELSE 'PENDING'::v2_digital_entitlement_status_enum
  END AS status,
  'DOWNLOAD'::v2_digital_access_type_enum AS access_type,
  NULL::VARCHAR(255) AS token_hash,
  NULL::VARCHAR(255) AS token_reference,
  CASE
    WHEN (
      dla.payment_status IN ('CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED')
      OR COALESCE(dla.download_count, 0) > 0
      OR COALESCE(NULLIF(dla.download_url, ''), '') <> ''
      OR dla.line_status = 'FULFILLED'
    ) THEN COALESCE(dla.confirmed_at, dla.placed_at)
    ELSE NULL::TIMESTAMPTZ
  END AS granted_at,
  NULL::TIMESTAMPTZ AS expires_at,
  NULL::INTEGER AS max_downloads,
  GREATEST(COALESCE(dla.download_count, 0), 0) AS download_count,
  NULL::TIMESTAMPTZ AS revoked_at,
  NULL::TEXT AS revoke_reason,
  NULL::TIMESTAMPTZ AS failed_at,
  jsonb_build_object(
    'source', 'legacy.order_items',
    'legacy_order_item_id', dla.v2_order_item_id,
    'legacy_download_url', dla.download_url,
    'legacy_last_downloaded_at', dla.last_downloaded_at,
    'backfilled_at', NOW()
  ) AS metadata,
  COALESCE(dla.placed_at, NOW()) AS created_at,
  COALESCE(dla.confirmed_at, dla.placed_at, NOW()) AS updated_at
FROM digital_line_asset dla
ON CONFLICT (id) DO UPDATE
SET
  order_id = EXCLUDED.order_id,
  order_item_id = EXCLUDED.order_item_id,
  digital_asset_id = EXCLUDED.digital_asset_id,
  fulfillment_id = EXCLUDED.fulfillment_id,
  status = EXCLUDED.status,
  access_type = EXCLUDED.access_type,
  token_hash = EXCLUDED.token_hash,
  token_reference = EXCLUDED.token_reference,
  granted_at = EXCLUDED.granted_at,
  expires_at = EXCLUDED.expires_at,
  max_downloads = EXCLUDED.max_downloads,
  download_count = EXCLUDED.download_count,
  revoked_at = EXCLUDED.revoked_at,
  revoke_reason = EXCLUDED.revoke_reason,
  failed_at = EXCLUDED.failed_at,
  metadata = EXCLUDED.metadata,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

-- =====================================================
-- 4. Legacy-v2 mapping trace
-- =====================================================

WITH domain_checkout AS (
  SELECT id FROM public.v2_cutover_domains WHERE domain_key = 'CHECKOUT' LIMIT 1
),
domain_fulfillment AS (
  SELECT id FROM public.v2_cutover_domains WHERE domain_key = 'FULFILLMENT' LIMIT 1
)
INSERT INTO public.v2_cutover_legacy_mappings (
  domain_id,
  legacy_resource_type,
  legacy_resource_id,
  v2_resource_type,
  v2_resource_id,
  mapping_status,
  confidence_score,
  metadata
)
SELECT
  dc.id AS domain_id,
  'ORDER' AS legacy_resource_type,
  o.id::text AS legacy_resource_id,
  'V2_ORDER' AS v2_resource_type,
  o.id AS v2_resource_id,
  'ACTIVE' AS mapping_status,
  1.00 AS confidence_score,
  jsonb_build_object(
    'source', '20260322020000_v2_order_fulfillment_legacy_backfill.sql',
    'backfilled_at', NOW()
  ) AS metadata
FROM public.orders o
CROSS JOIN domain_checkout dc
ON CONFLICT (
  domain_id,
  legacy_resource_type,
  legacy_resource_id,
  v2_resource_type
) DO UPDATE
SET
  v2_resource_id = EXCLUDED.v2_resource_id,
  mapping_status = EXCLUDED.mapping_status,
  confidence_score = EXCLUDED.confidence_score,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

WITH domain_checkout AS (
  SELECT id FROM public.v2_cutover_domains WHERE domain_key = 'CHECKOUT' LIMIT 1
)
INSERT INTO public.v2_cutover_legacy_mappings (
  domain_id,
  legacy_resource_type,
  legacy_resource_id,
  v2_resource_type,
  v2_resource_id,
  mapping_status,
  confidence_score,
  metadata
)
SELECT
  dc.id AS domain_id,
  'ORDER_ITEM' AS legacy_resource_type,
  oi.id::text AS legacy_resource_id,
  'V2_ORDER_ITEM' AS v2_resource_type,
  oi.id AS v2_resource_id,
  'ACTIVE' AS mapping_status,
  1.00 AS confidence_score,
  jsonb_build_object(
    'source', '20260322020000_v2_order_fulfillment_legacy_backfill.sql',
    'backfilled_at', NOW()
  ) AS metadata
FROM public.order_items oi
CROSS JOIN domain_checkout dc
ON CONFLICT (
  domain_id,
  legacy_resource_type,
  legacy_resource_id,
  v2_resource_type
) DO UPDATE
SET
  v2_resource_id = EXCLUDED.v2_resource_id,
  mapping_status = EXCLUDED.mapping_status,
  confidence_score = EXCLUDED.confidence_score,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

WITH domain_fulfillment AS (
  SELECT id FROM public.v2_cutover_domains WHERE domain_key = 'FULFILLMENT' LIMIT 1
)
INSERT INTO public.v2_cutover_legacy_mappings (
  domain_id,
  legacy_resource_type,
  legacy_resource_id,
  v2_resource_type,
  v2_resource_id,
  mapping_status,
  confidence_score,
  metadata
)
SELECT
  df.id AS domain_id,
  'SHIPMENT' AS legacy_resource_type,
  s.id::text AS legacy_resource_id,
  'V2_SHIPMENT' AS v2_resource_type,
  uuid_generate_v5(uuid_ns_url(), 'legacy:v2_shipment:' || s.id::text) AS v2_resource_id,
  'ACTIVE' AS mapping_status,
  1.00 AS confidence_score,
  jsonb_build_object(
    'source', '20260322020000_v2_order_fulfillment_legacy_backfill.sql',
    'legacy_order_item_id', s.order_item_id,
    'backfilled_at', NOW()
  ) AS metadata
FROM public.shipments s
CROSS JOIN domain_fulfillment df
ON CONFLICT (
  domain_id,
  legacy_resource_type,
  legacy_resource_id,
  v2_resource_type
) DO UPDATE
SET
  v2_resource_id = EXCLUDED.v2_resource_id,
  mapping_status = EXCLUDED.mapping_status,
  confidence_score = EXCLUDED.confidence_score,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

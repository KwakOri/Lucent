-- One-off repair for the two legacy production orders that were skipped by the
-- item-scoped production completion check after the 2026-04-03 migration.
--
-- This script only repairs the item-scoped production records and the
-- order-level completion result. It deliberately does not write order stage or
-- shipment rows; the existing admin transition API performs shipment
-- bootstrap and derives READY_TO_SHIP from the resulting shipment.

BEGIN;

DO $$
DECLARE
  target_order_nos CONSTANT TEXT[] := ARRAY[
    'ORD-1773495251822-WF5EQ',
    'ORD-1773565129913-J42H7R'
  ];
  target_order_count INTEGER;
  target_batch_count INTEGER;
  target_batch_order_count INTEGER;
  target_batch_id UUID;
  target_batch_status TEXT;
  invalid_physical_order_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO target_order_count
  FROM public.v2_orders o
  WHERE o.order_no = ANY (target_order_nos);

  IF target_order_count <> 2 THEN
    RAISE EXCEPTION
      'legacy production repair expected exactly 2 orders, found %',
      target_order_count;
  END IF;

  SELECT
    COUNT(DISTINCT bo.batch_id),
    COUNT(*),
    MIN(bo.batch_id::TEXT)::UUID
  INTO target_batch_count, target_batch_order_count, target_batch_id
  FROM public.v2_admin_production_batch_orders bo
  JOIN public.v2_orders o ON o.id = bo.order_id
  WHERE o.order_no = ANY (target_order_nos);

  IF target_batch_count <> 1 OR target_batch_order_count <> 2 THEN
    RAISE EXCEPTION
      'legacy production repair expected 2 orders in one production batch, found batches=% orders=%',
      target_batch_count,
      target_batch_order_count;
  END IF;

  SELECT b.status
  INTO target_batch_status
  FROM public.v2_admin_production_batches b
  WHERE b.id = target_batch_id;

  IF target_batch_status <> 'COMPLETED' THEN
    RAISE EXCEPTION
      'legacy production repair requires a COMPLETED batch, found %',
      COALESCE(target_batch_status, '<missing>');
  END IF;

  SELECT COUNT(*)
  INTO invalid_physical_order_count
  FROM (
    SELECT
      o.id,
      COUNT(oi.id) FILTER (
        WHERE oi.line_status NOT IN ('CANCELED', 'REFUNDED')
          AND oi.line_type <> 'BUNDLE_PARENT'
          AND (
            oi.requires_shipping_snapshot IS TRUE
            OR oi.fulfillment_type_snapshot = 'PHYSICAL'
          )
      ) AS physical_item_count
    FROM public.v2_orders o
    LEFT JOIN public.v2_order_items oi ON oi.order_id = o.id
    WHERE o.order_no = ANY (target_order_nos)
    GROUP BY o.id
  ) scoped
  WHERE scoped.physical_item_count <> 1;

  IF invalid_physical_order_count <> 0 THEN
    RAISE EXCEPTION
      'legacy production repair requires exactly one physical item per target order, invalid orders=%',
      invalid_physical_order_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.v2_admin_production_batch_orders bo
    JOIN public.v2_orders o ON o.id = bo.order_id
    WHERE bo.batch_id = target_batch_id
      AND o.order_no = ANY (target_order_nos)
      AND (
        COALESCE(bo.is_excluded, FALSE)
        OR bo.transition_activate_status <> 'SUCCEEDED'
        OR bo.transition_complete_status NOT IN ('SKIPPED', 'SUCCEEDED')
      )
  ) THEN
    RAISE EXCEPTION
      'legacy production repair found an unexpected production batch order state';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.v2_admin_production_batch_items bi
    JOIN public.v2_orders o ON o.id = bi.order_id
    WHERE bi.batch_id = target_batch_id
      AND o.order_no = ANY (target_order_nos)
      AND (
        bi.production_status <> 'COMPLETED'
        OR bi.transition_activate_status <> 'SUCCEEDED'
        OR bi.transition_complete_status <> 'SUCCEEDED'
      )
  ) THEN
    RAISE EXCEPTION
      'legacy production repair found an unexpected existing production batch item state';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.v2_admin_order_item_production_state ps
    JOIN public.v2_order_items oi ON oi.id = ps.order_item_id
    JOIN public.v2_orders o ON o.id = oi.order_id
    WHERE o.order_no = ANY (target_order_nos)
      AND (
        ps.current_status <> 'COMPLETED'
        OR ps.last_batch_id IS DISTINCT FROM target_batch_id
      )
  ) THEN
    RAISE EXCEPTION
      'legacy production repair found an unexpected existing order item production state';
  END IF;
END
$$;

WITH target_orders AS (
  SELECT
    o.id AS order_id,
    o.order_no,
    bo.batch_id,
    b.created_at AS batch_created_at,
    COALESCE(b.completed_at, b.updated_at, b.created_at) AS batch_completed_at,
    COALESCE(b.activated_at, b.created_at) AS batch_activated_at
  FROM public.v2_orders o
  JOIN public.v2_admin_production_batch_orders bo ON bo.order_id = o.id
  JOIN public.v2_admin_production_batches b ON b.id = bo.batch_id
  WHERE o.order_no IN (
    'ORD-1773495251822-WF5EQ',
    'ORD-1773565129913-J42H7R'
  )
), physical_items AS (
  SELECT
    t.*,
    oi.id AS order_item_id,
    oi.product_id,
    oi.variant_id,
    oi.project_id_snapshot,
    oi.project_name_snapshot,
    oi.campaign_id_snapshot,
    oi.campaign_name_snapshot,
    oi.product_name_snapshot,
    oi.variant_name_snapshot,
    GREATEST(1, COALESCE(oi.quantity, 0)) AS quantity
  FROM target_orders t
  JOIN public.v2_order_items oi ON oi.order_id = t.order_id
  WHERE oi.line_status NOT IN ('CANCELED', 'REFUNDED')
    AND oi.line_type <> 'BUNDLE_PARENT'
    AND (
      oi.requires_shipping_snapshot IS TRUE
      OR oi.fulfillment_type_snapshot = 'PHYSICAL'
    )
)
INSERT INTO public.v2_admin_production_batch_items (
  batch_id,
  order_id,
  order_item_id,
  project_id_snapshot,
  project_name_snapshot,
  campaign_id_snapshot,
  campaign_name_snapshot,
  product_id,
  variant_id,
  product_name_snapshot,
  variant_name_snapshot,
  quantity,
  production_status,
  transition_activate_status,
  transition_complete_status,
  activated_at,
  completed_at,
  error_message,
  metadata,
  created_at,
  updated_at
)
SELECT
  p.batch_id,
  p.order_id,
  p.order_item_id,
  p.project_id_snapshot,
  p.project_name_snapshot,
  p.campaign_id_snapshot,
  p.campaign_name_snapshot,
  p.product_id,
  p.variant_id,
  p.product_name_snapshot,
  p.variant_name_snapshot,
  p.quantity,
  'COMPLETED',
  'SUCCEEDED',
  'SUCCEEDED',
  p.batch_activated_at,
  p.batch_completed_at,
  NULL,
  jsonb_build_object(
    'repair_source', 'LEGACY_PRODUCTION_BATCH_ITEM_REPAIR',
    'repair_reason', 'legacy batch had no item-scoped production rows',
    'order_no', p.order_no,
    'repaired_at', NOW()
  ),
  p.batch_created_at,
  NOW()
FROM physical_items p
ON CONFLICT (batch_id, order_item_id) DO NOTHING;

WITH target_orders AS (
  SELECT o.id AS order_id, o.order_no, bo.batch_id
  FROM public.v2_orders o
  JOIN public.v2_admin_production_batch_orders bo ON bo.order_id = o.id
  WHERE o.order_no IN (
    'ORD-1773495251822-WF5EQ',
    'ORD-1773565129913-J42H7R'
  )
), target_items AS (
  SELECT
    t.batch_id,
    t.order_id,
    t.order_no,
    oi.id AS order_item_id
  FROM target_orders t
  JOIN public.v2_order_items oi ON oi.order_id = t.order_id
  WHERE oi.line_status NOT IN ('CANCELED', 'REFUNDED')
    AND oi.line_type <> 'BUNDLE_PARENT'
    AND (
      oi.requires_shipping_snapshot IS TRUE
      OR oi.fulfillment_type_snapshot = 'PHYSICAL'
    )
)
UPDATE public.v2_admin_production_batch_orders bo
SET
  transition_complete_status = 'SUCCEEDED',
  error_message = NULL,
  metadata = COALESCE(bo.metadata, '{}'::jsonb) || jsonb_build_object(
    'repair_source', 'LEGACY_PRODUCTION_BATCH_ITEM_REPAIR',
    'repaired_at', NOW()
  )
FROM target_items t
WHERE bo.batch_id = t.batch_id
  AND bo.order_id = t.order_id;

WITH target_orders AS (
  SELECT o.id AS order_id, o.order_no, bo.batch_id
  FROM public.v2_orders o
  JOIN public.v2_admin_production_batch_orders bo ON bo.order_id = o.id
  WHERE o.order_no IN (
    'ORD-1773495251822-WF5EQ',
    'ORD-1773565129913-J42H7R'
  )
), target_items AS (
  SELECT
    t.batch_id,
    t.order_id,
    t.order_no,
    oi.id AS order_item_id
  FROM target_orders t
  JOIN public.v2_order_items oi ON oi.order_id = t.order_id
  WHERE oi.line_status NOT IN ('CANCELED', 'REFUNDED')
    AND oi.line_type <> 'BUNDLE_PARENT'
    AND (
      oi.requires_shipping_snapshot IS TRUE
      OR oi.fulfillment_type_snapshot = 'PHYSICAL'
    )
), repair_items AS (
  SELECT
    t.*,
    bi.id AS batch_item_id
  FROM target_items t
  JOIN public.v2_admin_production_batch_items bi
    ON bi.batch_id = t.batch_id
   AND bi.order_item_id = t.order_item_id
)
INSERT INTO public.v2_admin_order_item_production_state (
  order_item_id,
  current_status,
  last_batch_id,
  last_batch_item_id,
  metadata
)
SELECT
  r.order_item_id,
  'COMPLETED',
  r.batch_id,
  r.batch_item_id,
  jsonb_build_object(
    'updated_by', 'LEGACY_PRODUCTION_BATCH_ITEM_REPAIR',
    'repair_source', 'LEGACY_PRODUCTION_BATCH_ITEM_REPAIR',
    'order_no', r.order_no,
    'updated_at', NOW()
  )
FROM repair_items r
ON CONFLICT (order_item_id) DO UPDATE
SET
  current_status = EXCLUDED.current_status,
  last_batch_id = EXCLUDED.last_batch_id,
  last_batch_item_id = EXCLUDED.last_batch_item_id,
  metadata = COALESCE(v2_admin_order_item_production_state.metadata, '{}'::jsonb)
    || EXCLUDED.metadata,
  updated_at = NOW();

DO $$
DECLARE
  target_order_nos CONSTANT TEXT[] := ARRAY[
    'ORD-1773495251822-WF5EQ',
    'ORD-1773565129913-J42H7R'
  ];
  target_fulfillment_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO target_fulfillment_count
  FROM public.v2_orders o
  JOIN public.v2_fulfillment_groups fg
    ON fg.order_id = o.id
   AND fg.kind = 'SHIPMENT'
   AND fg.status <> 'CANCELED'
  JOIN public.v2_fulfillments f
    ON f.fulfillment_group_id = fg.id
   AND f.status <> 'CANCELED'
  WHERE o.order_no = ANY (target_order_nos);

  IF target_fulfillment_count <> 2 THEN
    RAISE EXCEPTION
      'legacy production repair expected one active shipment fulfillment per target order, found %',
      target_fulfillment_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.v2_orders o
    JOIN public.v2_fulfillment_groups fg
      ON fg.order_id = o.id
     AND fg.kind = 'SHIPMENT'
     AND fg.status <> 'CANCELED'
    JOIN public.v2_fulfillments f
      ON f.fulfillment_group_id = fg.id
     AND f.status <> 'CANCELED'
    JOIN public.v2_shipments s ON s.fulfillment_id = f.id
    WHERE o.order_no = ANY (target_order_nos)
      AND s.status <> 'READY_TO_PACK'
  ) THEN
    RAISE EXCEPTION
      'legacy production repair found an existing target shipment outside READY_TO_PACK';
  END IF;
END
$$;

UPDATE public.v2_fulfillments f
SET
  status = 'IN_PROGRESS',
  started_at = COALESCE(f.started_at, NOW())
FROM public.v2_fulfillment_groups fg
JOIN public.v2_orders o ON o.id = fg.order_id
WHERE f.fulfillment_group_id = fg.id
  AND fg.kind = 'SHIPMENT'
  AND fg.status <> 'CANCELED'
  AND f.status IN ('REQUESTED', 'IN_PROGRESS')
  AND o.order_no IN (
    'ORD-1773495251822-WF5EQ',
    'ORD-1773565129913-J42H7R'
  );

WITH target_fulfillments AS (
  SELECT
    o.order_no,
    f.id AS fulfillment_id,
    fg.id AS fulfillment_group_id
  FROM public.v2_orders o
  JOIN public.v2_fulfillment_groups fg
    ON fg.order_id = o.id
   AND fg.kind = 'SHIPMENT'
   AND fg.status <> 'CANCELED'
  JOIN public.v2_fulfillments f
    ON f.fulfillment_group_id = fg.id
   AND f.status <> 'CANCELED'
  WHERE o.order_no IN (
    'ORD-1773495251822-WF5EQ',
    'ORD-1773565129913-J42H7R'
  )
)
INSERT INTO public.v2_shipments (
  fulfillment_id,
  status,
  metadata
)
SELECT
  t.fulfillment_id,
  'READY_TO_PACK',
  jsonb_build_object(
    'source', 'FULFILLMENT_SHIPMENT_BOOTSTRAP',
    'order_id', o.id,
    'order_no', t.order_no,
    'fulfillment_group_id', t.fulfillment_group_id,
    'target_stage', 'READY_TO_SHIP',
    'repair_source', 'LEGACY_PRODUCTION_BATCH_ITEM_REPAIR',
    'created_at', NOW()
  )
FROM target_fulfillments t
JOIN public.v2_orders o ON o.order_no = t.order_no
WHERE NOT EXISTS (
  SELECT 1
  FROM public.v2_shipments s
  WHERE s.fulfillment_id = t.fulfillment_id
)
ON CONFLICT (fulfillment_id) DO NOTHING;

COMMIT;

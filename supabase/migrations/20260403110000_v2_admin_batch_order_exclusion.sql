BEGIN;

ALTER TABLE public.v2_admin_production_batch_orders
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS excluded_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS excluded_by JSONB;

ALTER TABLE public.v2_admin_shipping_batch_orders
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS excluded_reason TEXT,
  ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS excluded_by JSONB;

CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_orders_excluded
  ON public.v2_admin_production_batch_orders(batch_id, is_excluded, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_orders_excluded
  ON public.v2_admin_shipping_batch_orders(batch_id, is_excluded, created_at ASC);

CREATE OR REPLACE VIEW public.v2_admin_production_batch_queue_view AS
SELECT
  b.id,
  b.batch_no,
  b.status,
  b.title,
  b.order_count,
  b.item_quantity_total,
  b.activated_at,
  b.completed_at,
  b.created_at,
  b.updated_at,
  COALESCE(cnt.activate_failed_count, 0) AS activate_failed_count,
  COALESCE(cnt.complete_failed_count, 0) AS complete_failed_count,
  COALESCE(cnt.excluded_count, 0) AS excluded_count
FROM public.v2_admin_production_batches b
LEFT JOIN (
  SELECT
    bo.batch_id,
    COUNT(*) FILTER (WHERE bo.transition_activate_status = 'FAILED') AS activate_failed_count,
    COUNT(*) FILTER (WHERE bo.transition_complete_status = 'FAILED') AS complete_failed_count,
    COUNT(*) FILTER (WHERE bo.is_excluded = TRUE) AS excluded_count
  FROM public.v2_admin_production_batch_orders bo
  GROUP BY bo.batch_id
) cnt ON cnt.batch_id = b.id;

CREATE OR REPLACE VIEW public.v2_admin_shipping_batch_queue_view AS
SELECT
  b.id,
  b.batch_no,
  b.status,
  b.title,
  b.order_count,
  b.package_count,
  b.dispatched_at,
  b.completed_at,
  b.created_at,
  b.updated_at,
  COALESCE(cnt.dispatch_failed_count, 0) AS dispatch_failed_count,
  COALESCE(cnt.delivery_failed_count, 0) AS delivery_failed_count,
  COALESCE(cnt.excluded_count, 0) AS excluded_count
FROM public.v2_admin_shipping_batches b
LEFT JOIN (
  SELECT
    bo.batch_id,
    COUNT(*) FILTER (WHERE bo.dispatch_transition_status = 'FAILED') AS dispatch_failed_count,
    COUNT(*) FILTER (WHERE bo.delivery_transition_status = 'FAILED') AS delivery_failed_count,
    COUNT(*) FILTER (WHERE bo.is_excluded = TRUE) AS excluded_count
  FROM public.v2_admin_shipping_batch_orders bo
  GROUP BY bo.batch_id
) cnt ON cnt.batch_id = b.id;

COMMIT;

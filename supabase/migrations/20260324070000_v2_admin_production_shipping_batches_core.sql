-- V2 Admin Production/Shipping Batch Core
-- Created: 2026-03-24
-- Description: Add production/shipping batch snapshot tables for admin operations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1) Production batch
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_admin_production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_no VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  title VARCHAR(255) NOT NULL,
  source_stage VARCHAR(40) NOT NULL DEFAULT 'PAYMENT_CONFIRMED',
  target_stage_on_activate VARCHAR(40) NOT NULL DEFAULT 'PRODUCTION',
  target_stage_on_complete VARCHAR(40) NOT NULL DEFAULT 'READY_TO_SHIP',
  order_count INTEGER NOT NULL DEFAULT 0,
  item_quantity_total INTEGER NOT NULL DEFAULT 0,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  activate_request_id VARCHAR(120),
  complete_request_id VARCHAR(120),
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_production_batches_batch_no_unique UNIQUE (batch_no),
  CONSTRAINT v2_admin_production_batches_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELED')),
  CONSTRAINT v2_admin_production_batches_order_count_non_negative CHECK (order_count >= 0),
  CONSTRAINT v2_admin_production_batches_item_qty_non_negative CHECK (item_quantity_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batches_status
  ON public.v2_admin_production_batches(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batches_created_by
  ON public.v2_admin_production_batches(created_by, created_at DESC);

CREATE TABLE IF NOT EXISTS public.v2_admin_production_batch_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES public.v2_admin_production_batches(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE RESTRICT,
  order_no VARCHAR(80) NOT NULL,
  stage_at_snapshot VARCHAR(40) NOT NULL,
  customer_snapshot JSONB,
  pricing_snapshot JSONB,
  line_items_snapshot JSONB,
  transition_activate_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  transition_complete_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  activate_action_log_id UUID REFERENCES public.v2_admin_action_logs(id) ON DELETE SET NULL,
  complete_action_log_id UUID REFERENCES public.v2_admin_action_logs(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_production_batch_orders_unique UNIQUE (batch_id, order_id),
  CONSTRAINT v2_admin_production_batch_orders_activate_status_check
    CHECK (transition_activate_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED')),
  CONSTRAINT v2_admin_production_batch_orders_complete_status_check
    CHECK (transition_complete_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_orders_batch
  ON public.v2_admin_production_batch_orders(batch_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_orders_order
  ON public.v2_admin_production_batch_orders(order_id);

CREATE TABLE IF NOT EXISTS public.v2_admin_production_batch_item_aggregates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES public.v2_admin_production_batches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.v2_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.v2_product_variants(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  variant_name VARCHAR(255),
  quantity_total INTEGER NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_production_batch_agg_unique UNIQUE (batch_id, variant_id),
  CONSTRAINT v2_admin_production_batch_agg_qty_non_negative CHECK (quantity_total >= 0),
  CONSTRAINT v2_admin_production_batch_agg_order_count_non_negative CHECK (order_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_agg_batch
  ON public.v2_admin_production_batch_item_aggregates(batch_id, quantity_total DESC);

-- =====================================================
-- 2) Shipping batch
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_admin_shipping_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_no VARCHAR(40) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  title VARCHAR(255) NOT NULL,
  source_stage VARCHAR(40) NOT NULL DEFAULT 'READY_TO_SHIP',
  target_stage_on_dispatch VARCHAR(40) NOT NULL DEFAULT 'IN_TRANSIT',
  target_stage_on_complete VARCHAR(40) NOT NULL DEFAULT 'DELIVERED',
  order_count INTEGER NOT NULL DEFAULT 0,
  package_count INTEGER NOT NULL DEFAULT 0,
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  dispatch_request_id VARCHAR(120),
  complete_request_id VARCHAR(120),
  dispatched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_shipping_batches_batch_no_unique UNIQUE (batch_no),
  CONSTRAINT v2_admin_shipping_batches_status_check
    CHECK (status IN ('DRAFT', 'ACTIVE', 'DISPATCHED', 'COMPLETED', 'CANCELED')),
  CONSTRAINT v2_admin_shipping_batches_order_count_non_negative CHECK (order_count >= 0),
  CONSTRAINT v2_admin_shipping_batches_package_count_non_negative CHECK (package_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batches_status
  ON public.v2_admin_shipping_batches(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.v2_admin_shipping_batch_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES public.v2_admin_shipping_batches(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE RESTRICT,
  order_no VARCHAR(80) NOT NULL,
  stage_at_snapshot VARCHAR(40) NOT NULL,
  recipient_name VARCHAR(120),
  recipient_phone VARCHAR(60),
  shipping_address_snapshot JSONB,
  line_items_snapshot JSONB,
  dispatch_transition_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  delivery_transition_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  dispatch_action_log_id UUID REFERENCES public.v2_admin_action_logs(id) ON DELETE SET NULL,
  delivery_action_log_id UUID REFERENCES public.v2_admin_action_logs(id) ON DELETE SET NULL,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_shipping_batch_orders_unique UNIQUE (batch_id, order_id),
  CONSTRAINT v2_admin_shipping_batch_orders_dispatch_status_check
    CHECK (dispatch_transition_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED')),
  CONSTRAINT v2_admin_shipping_batch_orders_delivery_status_check
    CHECK (delivery_transition_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_orders_batch
  ON public.v2_admin_shipping_batch_orders(batch_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_orders_order
  ON public.v2_admin_shipping_batch_orders(order_id);

CREATE TABLE IF NOT EXISTS public.v2_admin_shipping_batch_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES public.v2_admin_shipping_batches(id) ON DELETE CASCADE,
  batch_order_id UUID NOT NULL REFERENCES public.v2_admin_shipping_batch_orders(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.v2_shipments(id) ON DELETE SET NULL,
  carrier_code VARCHAR(80),
  tracking_no VARCHAR(200),
  label_printed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_shipping_batch_packages_tracking_unique UNIQUE (batch_id, tracking_no)
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_packages_batch
  ON public.v2_admin_shipping_batch_packages(batch_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_packages_shipment
  ON public.v2_admin_shipping_batch_packages(shipment_id);

-- =====================================================
-- 3) Updated_at triggers
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_admin_production_batches_updated_at ON public.v2_admin_production_batches;
CREATE TRIGGER update_v2_admin_production_batches_updated_at
  BEFORE UPDATE ON public.v2_admin_production_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_production_batch_orders_updated_at ON public.v2_admin_production_batch_orders;
CREATE TRIGGER update_v2_admin_production_batch_orders_updated_at
  BEFORE UPDATE ON public.v2_admin_production_batch_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_production_batch_item_aggregates_updated_at ON public.v2_admin_production_batch_item_aggregates;
CREATE TRIGGER update_v2_admin_production_batch_item_aggregates_updated_at
  BEFORE UPDATE ON public.v2_admin_production_batch_item_aggregates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_shipping_batches_updated_at ON public.v2_admin_shipping_batches;
CREATE TRIGGER update_v2_admin_shipping_batches_updated_at
  BEFORE UPDATE ON public.v2_admin_shipping_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_shipping_batch_orders_updated_at ON public.v2_admin_shipping_batch_orders;
CREATE TRIGGER update_v2_admin_shipping_batch_orders_updated_at
  BEFORE UPDATE ON public.v2_admin_shipping_batch_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_shipping_batch_packages_updated_at ON public.v2_admin_shipping_batch_packages;
CREATE TRIGGER update_v2_admin_shipping_batch_packages_updated_at
  BEFORE UPDATE ON public.v2_admin_shipping_batch_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4) Active batch lock guards
-- =====================================================

CREATE OR REPLACE FUNCTION public.v2_admin_production_batch_active_lock_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  IF NEW.status = 'ACTIVE' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.v2_admin_production_batch_orders me
      JOIN public.v2_admin_production_batch_orders other
        ON other.order_id = me.order_id
       AND other.batch_id <> me.batch_id
      JOIN public.v2_admin_production_batches b_other
        ON b_other.id = other.batch_id
      WHERE me.batch_id = NEW.id
        AND b_other.status = 'ACTIVE'
    )
    INTO conflict_exists;

    IF conflict_exists THEN
      RAISE EXCEPTION '주문이 이미 다른 ACTIVE 제작 배치에 포함되어 있습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_v2_admin_production_batch_active_lock_guard ON public.v2_admin_production_batches;
CREATE TRIGGER trg_v2_admin_production_batch_active_lock_guard
  BEFORE INSERT OR UPDATE ON public.v2_admin_production_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.v2_admin_production_batch_active_lock_guard();

CREATE OR REPLACE FUNCTION public.v2_admin_shipping_batch_active_lock_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_exists BOOLEAN;
BEGIN
  IF NEW.status IN ('ACTIVE', 'DISPATCHED') AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.v2_admin_shipping_batch_orders me
      JOIN public.v2_admin_shipping_batch_orders other
        ON other.order_id = me.order_id
       AND other.batch_id <> me.batch_id
      JOIN public.v2_admin_shipping_batches b_other
        ON b_other.id = other.batch_id
      WHERE me.batch_id = NEW.id
        AND b_other.status IN ('ACTIVE', 'DISPATCHED')
    )
    INTO conflict_exists;

    IF conflict_exists THEN
      RAISE EXCEPTION '주문이 이미 다른 ACTIVE/DISPATCHED 배송 배치에 포함되어 있습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_v2_admin_shipping_batch_active_lock_guard ON public.v2_admin_shipping_batches;
CREATE TRIGGER trg_v2_admin_shipping_batch_active_lock_guard
  BEFORE INSERT OR UPDATE ON public.v2_admin_shipping_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.v2_admin_shipping_batch_active_lock_guard();

-- =====================================================
-- 5) Read-model views
-- =====================================================

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
  COALESCE(cnt.complete_failed_count, 0) AS complete_failed_count
FROM public.v2_admin_production_batches b
LEFT JOIN (
  SELECT
    bo.batch_id,
    COUNT(*) FILTER (WHERE bo.transition_activate_status = 'FAILED') AS activate_failed_count,
    COUNT(*) FILTER (WHERE bo.transition_complete_status = 'FAILED') AS complete_failed_count
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
  COALESCE(cnt.delivery_failed_count, 0) AS delivery_failed_count
FROM public.v2_admin_shipping_batches b
LEFT JOIN (
  SELECT
    bo.batch_id,
    COUNT(*) FILTER (WHERE bo.dispatch_transition_status = 'FAILED') AS dispatch_failed_count,
    COUNT(*) FILTER (WHERE bo.delivery_transition_status = 'FAILED') AS delivery_failed_count
  FROM public.v2_admin_shipping_batch_orders bo
  GROUP BY bo.batch_id
) cnt ON cnt.batch_id = b.id;

COMMENT ON TABLE public.v2_admin_production_batches IS 'Production batch snapshot for PAYMENT_CONFIRMED -> PRODUCTION -> READY_TO_SHIP ops';
COMMENT ON TABLE public.v2_admin_shipping_batches IS 'Shipping batch snapshot for READY_TO_SHIP -> IN_TRANSIT -> DELIVERED ops';
COMMENT ON VIEW public.v2_admin_production_batch_queue_view IS 'Admin read model for production batch queue';
COMMENT ON VIEW public.v2_admin_shipping_batch_queue_view IS 'Admin read model for shipping batch queue';

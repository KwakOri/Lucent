-- V2 Admin batch item-scoped core
-- Created: 2026-04-03
-- Description:
--   - Add order-item scoped production/shipping batch tables
--   - Add order-item production state cache table
--   - Relax production ACTIVE conflict from order-level to order_item-level

-- =====================================================
-- 1) Production item-scoped tables
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_admin_production_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.v2_admin_production_batches(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE RESTRICT,
  project_id_snapshot UUID,
  project_name_snapshot VARCHAR(255),
  campaign_id_snapshot UUID,
  campaign_name_snapshot VARCHAR(255),
  product_id UUID REFERENCES public.v2_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.v2_product_variants(id) ON DELETE SET NULL,
  product_name_snapshot VARCHAR(255),
  variant_name_snapshot VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  production_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  transition_activate_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  transition_complete_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  activated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_production_batch_items_unique UNIQUE (batch_id, order_item_id),
  CONSTRAINT v2_admin_production_batch_items_qty_positive CHECK (quantity > 0),
  CONSTRAINT v2_admin_production_batch_items_status_check
    CHECK (production_status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'FAILED')),
  CONSTRAINT v2_admin_production_batch_items_activate_status_check
    CHECK (transition_activate_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED')),
  CONSTRAINT v2_admin_production_batch_items_complete_status_check
    CHECK (transition_complete_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_items_batch
  ON public.v2_admin_production_batch_items(batch_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_items_order
  ON public.v2_admin_production_batch_items(order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_items_order_item
  ON public.v2_admin_production_batch_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_v2_admin_production_batch_items_campaign
  ON public.v2_admin_production_batch_items(campaign_id_snapshot, created_at ASC);

-- same order_item must not be in-progress in multiple ACTIVE production batches
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_admin_production_batch_items_active_order_item
  ON public.v2_admin_production_batch_items(order_item_id)
  WHERE production_status = 'IN_PROGRESS';

CREATE TABLE IF NOT EXISTS public.v2_admin_order_item_production_state (
  order_item_id UUID PRIMARY KEY REFERENCES public.v2_order_items(id) ON DELETE CASCADE,
  current_status VARCHAR(20) NOT NULL DEFAULT 'READY',
  last_batch_id UUID REFERENCES public.v2_admin_production_batches(id) ON DELETE SET NULL,
  last_batch_item_id UUID REFERENCES public.v2_admin_production_batch_items(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_order_item_production_state_status_check
    CHECK (current_status IN ('READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_order_item_production_state_status
  ON public.v2_admin_order_item_production_state(current_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_order_item_production_state_batch
  ON public.v2_admin_order_item_production_state(last_batch_id, updated_at DESC);

-- =====================================================
-- 2) Shipping item-scoped table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_admin_shipping_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.v2_admin_shipping_batches(id) ON DELETE CASCADE,
  batch_order_id UUID NOT NULL REFERENCES public.v2_admin_shipping_batch_orders(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE RESTRICT,
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  shipment_item_id UUID REFERENCES public.v2_shipment_items(id) ON DELETE SET NULL,
  dispatch_transition_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  delivery_transition_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_shipping_batch_items_unique UNIQUE (batch_id, order_item_id),
  CONSTRAINT v2_admin_shipping_batch_items_qty_positive CHECK (quantity > 0),
  CONSTRAINT v2_admin_shipping_batch_items_dispatch_status_check
    CHECK (dispatch_transition_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED')),
  CONSTRAINT v2_admin_shipping_batch_items_delivery_status_check
    CHECK (delivery_transition_status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'SKIPPED'))
);

CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_items_batch
  ON public.v2_admin_shipping_batch_items(batch_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_items_batch_order
  ON public.v2_admin_shipping_batch_items(batch_order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_items_order
  ON public.v2_admin_shipping_batch_items(order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_v2_admin_shipping_batch_items_order_item
  ON public.v2_admin_shipping_batch_items(order_item_id);

-- =====================================================
-- 3) updated_at triggers
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_admin_production_batch_items_updated_at ON public.v2_admin_production_batch_items;
CREATE TRIGGER update_v2_admin_production_batch_items_updated_at
  BEFORE UPDATE ON public.v2_admin_production_batch_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_order_item_production_state_updated_at ON public.v2_admin_order_item_production_state;
CREATE TRIGGER update_v2_admin_order_item_production_state_updated_at
  BEFORE UPDATE ON public.v2_admin_order_item_production_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_admin_shipping_batch_items_updated_at ON public.v2_admin_shipping_batch_items;
CREATE TRIGGER update_v2_admin_shipping_batch_items_updated_at
  BEFORE UPDATE ON public.v2_admin_shipping_batch_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4) Production ACTIVE lock guard (order_item scoped)
-- =====================================================

CREATE OR REPLACE FUNCTION public.v2_admin_production_batch_active_lock_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  conflict_exists BOOLEAN := false;
  has_item_rows BOOLEAN := false;
BEGIN
  IF NEW.status = 'ACTIVE' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.v2_admin_production_batch_items bi
      WHERE bi.batch_id = NEW.id
    )
    INTO has_item_rows;

    IF has_item_rows THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.v2_admin_production_batch_items me
        JOIN public.v2_admin_production_batch_items other
          ON other.order_item_id = me.order_item_id
         AND other.batch_id <> me.batch_id
        JOIN public.v2_admin_production_batches b_other
          ON b_other.id = other.batch_id
        WHERE me.batch_id = NEW.id
          AND b_other.status = 'ACTIVE'
      )
      INTO conflict_exists;
    ELSE
      -- legacy fallback for old batches without item rows
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
    END IF;

    IF conflict_exists THEN
      RAISE EXCEPTION '주문 상품이 이미 다른 ACTIVE 제작 배치에 포함되어 있습니다.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON TABLE public.v2_admin_production_batch_items IS 'Item-scoped production execution rows (campaign-aware)';
COMMENT ON TABLE public.v2_admin_order_item_production_state IS 'Latest item-level production status cache for shipping eligibility';
COMMENT ON TABLE public.v2_admin_shipping_batch_items IS 'Item-scoped shipping execution rows';

-- V2 Checkout / Order Core Schema Migration
-- Created: 2026-03-14
-- Description: Add v2 cart, checkout order, adjustment, payment tables
-- Reference: docs/v2-plans/04/*

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_cart_status_enum AS ENUM ('ACTIVE', 'CONVERTED', 'EXPIRED', 'ABANDONED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_order_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_payment_status_enum AS ENUM (
    'PENDING',
    'AUTHORIZED',
    'CAPTURED',
    'FAILED',
    'CANCELED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_fulfillment_status_enum AS ENUM (
    'UNFULFILLED',
    'PARTIAL',
    'FULFILLED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_order_line_type_enum AS ENUM ('STANDARD', 'BUNDLE_PARENT', 'BUNDLE_COMPONENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_order_line_status_enum AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELED',
    'FULFILLED',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_adjustment_scope_enum AS ENUM ('ORDER', 'SHIPPING');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_adjustment_source_enum AS ENUM (
    'PRICE_LIST',
    'PROMOTION',
    'COUPON',
    'BUNDLE_ALLOC',
    'MANUAL',
    'ETC'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_carts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status v2_cart_status_enum NOT NULL DEFAULT 'ACTIVE',
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_key VARCHAR(255),
  sales_channel_id VARCHAR(100) NOT NULL DEFAULT 'WEB',
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  converted_order_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_carts_owner_required CHECK (profile_id IS NOT NULL OR session_key IS NOT NULL),
  CONSTRAINT v2_carts_currency_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE INDEX IF NOT EXISTS idx_v2_carts_profile_id ON public.v2_carts(profile_id);
CREATE INDEX IF NOT EXISTS idx_v2_carts_status ON public.v2_carts(status);
CREATE INDEX IF NOT EXISTS idx_v2_carts_last_activity_at ON public.v2_carts(last_activity_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_carts_active_profile
  ON public.v2_carts(profile_id)
  WHERE profile_id IS NOT NULL AND status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_carts_active_session
  ON public.v2_carts(session_key)
  WHERE session_key IS NOT NULL AND status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS public.v2_cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cart_id UUID NOT NULL REFERENCES public.v2_carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.v2_products(id) ON DELETE SET NULL,
  variant_id UUID NOT NULL REFERENCES public.v2_product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  campaign_id UUID REFERENCES public.v2_campaigns(id) ON DELETE SET NULL,
  product_kind_snapshot v2_product_kind_enum NOT NULL DEFAULT 'STANDARD',
  bundle_configuration_snapshot JSONB,
  display_price_snapshot JSONB,
  added_via VARCHAR(50) NOT NULL DEFAULT 'STOREFRONT',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_cart_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_cart_items_cart_id ON public.v2_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_v2_cart_items_variant_id ON public.v2_cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_v2_cart_items_campaign_id ON public.v2_cart_items(campaign_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_cart_items_cart_variant_campaign
  ON public.v2_cart_items(cart_id, variant_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.v2_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no VARCHAR(80) NOT NULL,
  profile_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email_snapshot VARCHAR(255),
  sales_channel_id VARCHAR(100) NOT NULL DEFAULT 'WEB',
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  order_status v2_order_status_enum NOT NULL DEFAULT 'PENDING',
  payment_status v2_payment_status_enum NOT NULL DEFAULT 'PENDING',
  fulfillment_status v2_fulfillment_status_enum NOT NULL DEFAULT 'UNFULFILLED',
  source_cart_id UUID REFERENCES public.v2_carts(id) ON DELETE SET NULL,
  idempotency_key VARCHAR(255) NOT NULL,
  subtotal_amount INTEGER NOT NULL DEFAULT 0,
  item_discount_total INTEGER NOT NULL DEFAULT 0,
  order_discount_total INTEGER NOT NULL DEFAULT 0,
  shipping_amount INTEGER NOT NULL DEFAULT 0,
  shipping_discount_total INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  grand_total INTEGER NOT NULL DEFAULT 0,
  customer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_address_snapshot JSONB,
  shipping_address_snapshot JSONB,
  pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancel_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_orders_order_no_unique UNIQUE (order_no),
  CONSTRAINT v2_orders_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT v2_orders_subtotal_non_negative CHECK (subtotal_amount >= 0),
  CONSTRAINT v2_orders_item_discount_non_negative CHECK (item_discount_total >= 0),
  CONSTRAINT v2_orders_order_discount_non_negative CHECK (order_discount_total >= 0),
  CONSTRAINT v2_orders_shipping_non_negative CHECK (shipping_amount >= 0),
  CONSTRAINT v2_orders_shipping_discount_non_negative CHECK (shipping_discount_total >= 0),
  CONSTRAINT v2_orders_tax_non_negative CHECK (tax_total >= 0),
  CONSTRAINT v2_orders_grand_total_non_negative CHECK (grand_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_orders_profile_id ON public.v2_orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_v2_orders_statuses ON public.v2_orders(order_status, payment_status, fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_v2_orders_source_cart_id ON public.v2_orders(source_cart_id);
CREATE INDEX IF NOT EXISTS idx_v2_orders_placed_at ON public.v2_orders(placed_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_orders_profile_idempotency
  ON public.v2_orders(profile_id, idempotency_key)
  WHERE profile_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_orders_guest_email_idempotency
  ON public.v2_orders(guest_email_snapshot, idempotency_key)
  WHERE profile_id IS NULL AND guest_email_snapshot IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.v2_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  parent_order_item_id UUID REFERENCES public.v2_order_items(id) ON DELETE SET NULL,
  line_type v2_order_line_type_enum NOT NULL DEFAULT 'STANDARD',
  product_id UUID REFERENCES public.v2_products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.v2_product_variants(id) ON DELETE SET NULL,
  bundle_definition_id UUID REFERENCES public.v2_bundle_definitions(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_status v2_order_line_status_enum NOT NULL DEFAULT 'PENDING',
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  list_unit_price INTEGER NOT NULL DEFAULT 0,
  sale_unit_price INTEGER NOT NULL DEFAULT 0,
  final_unit_price INTEGER NOT NULL DEFAULT 0,
  line_subtotal INTEGER NOT NULL DEFAULT 0,
  discount_total INTEGER NOT NULL DEFAULT 0,
  tax_total INTEGER NOT NULL DEFAULT 0,
  final_line_total INTEGER NOT NULL DEFAULT 0,
  sku_snapshot VARCHAR(120),
  product_name_snapshot VARCHAR(255),
  variant_name_snapshot VARCHAR(255),
  project_id_snapshot UUID,
  project_name_snapshot VARCHAR(255),
  fulfillment_type_snapshot v2_fulfillment_type_enum,
  requires_shipping_snapshot BOOLEAN,
  campaign_id_snapshot UUID,
  campaign_name_snapshot VARCHAR(255),
  display_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT v2_order_items_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT v2_order_items_list_unit_non_negative CHECK (list_unit_price >= 0),
  CONSTRAINT v2_order_items_sale_unit_non_negative CHECK (sale_unit_price >= 0),
  CONSTRAINT v2_order_items_final_unit_non_negative CHECK (final_unit_price >= 0),
  CONSTRAINT v2_order_items_line_subtotal_non_negative CHECK (line_subtotal >= 0),
  CONSTRAINT v2_order_items_discount_non_negative CHECK (discount_total >= 0),
  CONSTRAINT v2_order_items_tax_non_negative CHECK (tax_total >= 0),
  CONSTRAINT v2_order_items_final_line_non_negative CHECK (final_line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_order_items_order_id ON public.v2_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_items_parent_order_item_id ON public.v2_order_items(parent_order_item_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_items_variant_id ON public.v2_order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_items_line_type ON public.v2_order_items(line_type);
CREATE INDEX IF NOT EXISTS idx_v2_order_items_line_status ON public.v2_order_items(line_status);

CREATE TABLE IF NOT EXISTS public.v2_order_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  target_scope v2_adjustment_scope_enum NOT NULL,
  source_type v2_adjustment_source_enum NOT NULL,
  source_id UUID,
  code_snapshot VARCHAR(120),
  label_snapshot VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  sequence_no INTEGER NOT NULL DEFAULT 1,
  calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_order_adjustments_sequence_positive CHECK (sequence_no > 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_order_adjustments_order_id ON public.v2_order_adjustments(order_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_adjustments_target_scope ON public.v2_order_adjustments(target_scope);
CREATE INDEX IF NOT EXISTS idx_v2_order_adjustments_source_type ON public.v2_order_adjustments(source_type);

CREATE TABLE IF NOT EXISTS public.v2_order_item_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE CASCADE,
  source_type v2_adjustment_source_enum NOT NULL,
  source_id UUID,
  label_snapshot VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  sequence_no INTEGER NOT NULL DEFAULT 1,
  calculation_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_order_item_adjustments_sequence_positive CHECK (sequence_no > 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_order_item_adjustments_order_item_id ON public.v2_order_item_adjustments(order_item_id);
CREATE INDEX IF NOT EXISTS idx_v2_order_item_adjustments_source_type ON public.v2_order_item_adjustments(source_type);

CREATE TABLE IF NOT EXISTS public.v2_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  provider VARCHAR(100) NOT NULL DEFAULT 'MANUAL',
  method VARCHAR(100),
  status v2_payment_status_enum NOT NULL DEFAULT 'PENDING',
  amount INTEGER NOT NULL DEFAULT 0,
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  external_reference VARCHAR(255) NOT NULL,
  authorized_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_total INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_payments_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT v2_payments_refunded_total_non_negative CHECK (refunded_total >= 0),
  CONSTRAINT v2_payments_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT v2_payments_order_external_reference_unique UNIQUE (order_id, external_reference)
);

CREATE INDEX IF NOT EXISTS idx_v2_payments_order_id ON public.v2_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_v2_payments_status ON public.v2_payments(status);
CREATE INDEX IF NOT EXISTS idx_v2_payments_external_reference ON public.v2_payments(external_reference);

ALTER TABLE public.v2_carts
  ADD CONSTRAINT v2_carts_converted_order_id_fkey
  FOREIGN KEY (converted_order_id)
  REFERENCES public.v2_orders(id)
  ON DELETE SET NULL;

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_carts_updated_at ON public.v2_carts;
CREATE TRIGGER update_v2_carts_updated_at
  BEFORE UPDATE ON public.v2_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_cart_items_updated_at ON public.v2_cart_items;
CREATE TRIGGER update_v2_cart_items_updated_at
  BEFORE UPDATE ON public.v2_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_orders_updated_at ON public.v2_orders;
CREATE TRIGGER update_v2_orders_updated_at
  BEFORE UPDATE ON public.v2_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_order_items_updated_at ON public.v2_order_items;
CREATE TRIGGER update_v2_order_items_updated_at
  BEFORE UPDATE ON public.v2_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_payments_updated_at ON public.v2_payments;
CREATE TRIGGER update_v2_payments_updated_at
  BEFORE UPDATE ON public.v2_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_carts IS 'Mutable cart workspace for v2 checkout flow';
COMMENT ON TABLE public.v2_cart_items IS 'Variant-based cart lines for v2';
COMMENT ON TABLE public.v2_orders IS 'Immutable v2 order header snapshot';
COMMENT ON TABLE public.v2_order_items IS 'Immutable v2 order lines for fulfillment handoff';
COMMENT ON TABLE public.v2_order_adjustments IS 'Order/shipping level discount and adjustment records';
COMMENT ON TABLE public.v2_order_item_adjustments IS 'Line-level adjustment explainability records';
COMMENT ON TABLE public.v2_payments IS 'Payment attempts and callback state linked to v2 orders';


-- V2 Fulfillment / Inventory / Shipping / Digital Entitlement Core Schema
-- Created: 2026-03-14
-- Description: Add v2 post-order execution model for physical/digital fulfillment
-- Reference: docs/v2-plans/05/*

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_fulfillment_group_kind_enum AS ENUM ('DIGITAL', 'SHIPMENT', 'PICKUP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_fulfillment_group_status_enum AS ENUM (
    'PLANNED',
    'ALLOCATED',
    'PARTIALLY_FULFILLED',
    'FULFILLED',
    'CANCELED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_fulfillment_group_item_status_enum AS ENUM (
    'PLANNED',
    'ALLOCATED',
    'PARTIAL',
    'FULFILLED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_fulfillment_execution_status_enum AS ENUM (
    'REQUESTED',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_shipment_status_enum AS ENUM (
    'READY_TO_PACK',
    'PACKING',
    'SHIPPED',
    'IN_TRANSIT',
    'DELIVERED',
    'RETURNED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_stock_location_type_enum AS ENUM ('WAREHOUSE', 'POPUP', 'STORE', 'VENDOR');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_inventory_reservation_status_enum AS ENUM (
    'ACTIVE',
    'RELEASED',
    'CONSUMED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_ship_mode_enum AS ENUM ('TOGETHER', 'SEPARATELY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_shipping_method_type_enum AS ENUM ('STANDARD', 'EXPRESS', 'PICKUP');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_shipping_condition_type_enum AS ENUM (
    'FLAT',
    'ORDER_AMOUNT',
    'WEIGHT',
    'ITEM_COUNT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_digital_entitlement_status_enum AS ENUM (
    'PENDING',
    'GRANTED',
    'EXPIRED',
    'REVOKED',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_digital_access_type_enum AS ENUM ('DOWNLOAD', 'STREAM', 'LICENSE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_digital_entitlement_event_type_enum AS ENUM (
    'GRANTED',
    'DOWNLOADED',
    'REISSUED',
    'REVOKED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  location_type v2_stock_location_type_enum NOT NULL DEFAULT 'WAREHOUSE',
  country_code CHAR(2) NOT NULL DEFAULT 'KR',
  region_code VARCHAR(100),
  address_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_stock_locations_code_unique UNIQUE (code),
  CONSTRAINT v2_stock_locations_priority_non_negative CHECK (priority >= 0),
  CONSTRAINT v2_stock_locations_country_format CHECK (country_code ~ '^[A-Z]{2}$')
);

CREATE INDEX IF NOT EXISTS idx_v2_stock_locations_type ON public.v2_stock_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_v2_stock_locations_active ON public.v2_stock_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_v2_stock_locations_priority ON public.v2_stock_locations(priority ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS public.v2_shipping_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method_type v2_shipping_method_type_enum NOT NULL DEFAULT 'STANDARD',
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  carrier VARCHAR(100),
  service_code VARCHAR(100),
  supports_tracking BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_shipping_methods_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_v2_shipping_methods_type ON public.v2_shipping_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_v2_shipping_methods_active ON public.v2_shipping_methods(is_active);

CREATE TABLE IF NOT EXISTS public.v2_shipping_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  country_codes TEXT[] NOT NULL DEFAULT ARRAY['KR']::text[],
  region_codes TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  postal_code_patterns TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_shipping_zones_code_unique UNIQUE (code),
  CONSTRAINT v2_shipping_zones_priority_non_negative CHECK (priority >= 0),
  CONSTRAINT v2_shipping_zones_country_not_empty CHECK (COALESCE(array_length(country_codes, 1), 0) > 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_shipping_zones_active ON public.v2_shipping_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_v2_shipping_zones_priority ON public.v2_shipping_zones(priority ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS public.v2_shipping_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(80) NOT NULL,
  name VARCHAR(255) NOT NULL,
  ship_mode v2_ship_mode_enum NOT NULL DEFAULT 'TOGETHER',
  default_method_id UUID REFERENCES public.v2_shipping_methods(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_shipping_profiles_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_v2_shipping_profiles_active ON public.v2_shipping_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_v2_shipping_profiles_ship_mode ON public.v2_shipping_profiles(ship_mode);

CREATE TABLE IF NOT EXISTS public.v2_shipping_rate_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipping_method_id UUID NOT NULL REFERENCES public.v2_shipping_methods(id) ON DELETE CASCADE,
  shipping_zone_id UUID NOT NULL REFERENCES public.v2_shipping_zones(id) ON DELETE CASCADE,
  shipping_profile_id UUID REFERENCES public.v2_shipping_profiles(id) ON DELETE SET NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  condition_type v2_shipping_condition_type_enum NOT NULL DEFAULT 'FLAT',
  min_value INTEGER,
  max_value INTEGER,
  amount INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 100,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_shipping_rate_rules_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT v2_shipping_rate_rules_min_non_negative CHECK (min_value IS NULL OR min_value >= 0),
  CONSTRAINT v2_shipping_rate_rules_max_non_negative CHECK (max_value IS NULL OR max_value >= 0),
  CONSTRAINT v2_shipping_rate_rules_min_max_check CHECK (
    min_value IS NULL OR max_value IS NULL OR min_value <= max_value
  ),
  CONSTRAINT v2_shipping_rate_rules_amount_non_negative CHECK (amount >= 0),
  CONSTRAINT v2_shipping_rate_rules_priority_non_negative CHECK (priority >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_shipping_rate_rules_method_zone
  ON public.v2_shipping_rate_rules(shipping_method_id, shipping_zone_id, priority ASC);
CREATE INDEX IF NOT EXISTS idx_v2_shipping_rate_rules_profile
  ON public.v2_shipping_rate_rules(shipping_profile_id);
CREATE INDEX IF NOT EXISTS idx_v2_shipping_rate_rules_active
  ON public.v2_shipping_rate_rules(is_active, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS public.v2_fulfillment_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  kind v2_fulfillment_group_kind_enum NOT NULL,
  status v2_fulfillment_group_status_enum NOT NULL DEFAULT 'PLANNED',
  stock_location_id UUID REFERENCES public.v2_stock_locations(id) ON DELETE SET NULL,
  shipping_profile_id UUID REFERENCES public.v2_shipping_profiles(id) ON DELETE SET NULL,
  shipping_method_id UUID REFERENCES public.v2_shipping_methods(id) ON DELETE SET NULL,
  shipping_zone_id UUID REFERENCES public.v2_shipping_zones(id) ON DELETE SET NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  shipping_amount INTEGER NOT NULL DEFAULT 0,
  shipping_address_snapshot JSONB,
  pickup_location_snapshot JSONB,
  planned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_fulfillment_groups_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT v2_fulfillment_groups_shipping_non_negative CHECK (shipping_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_fulfillment_groups_order_id ON public.v2_fulfillment_groups(order_id);
CREATE INDEX IF NOT EXISTS idx_v2_fulfillment_groups_kind_status
  ON public.v2_fulfillment_groups(kind, status, planned_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_fulfillment_groups_stock_location_id
  ON public.v2_fulfillment_groups(stock_location_id);

CREATE TABLE IF NOT EXISTS public.v2_fulfillment_group_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_group_id UUID NOT NULL REFERENCES public.v2_fulfillment_groups(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE CASCADE,
  quantity_planned INTEGER NOT NULL DEFAULT 1,
  quantity_fulfilled INTEGER NOT NULL DEFAULT 0,
  status v2_fulfillment_group_item_status_enum NOT NULL DEFAULT 'PLANNED',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_fulfillment_group_items_quantity_planned_positive CHECK (quantity_planned > 0),
  CONSTRAINT v2_fulfillment_group_items_quantity_fulfilled_non_negative CHECK (quantity_fulfilled >= 0),
  CONSTRAINT v2_fulfillment_group_items_quantity_fulfilled_le_planned CHECK (quantity_fulfilled <= quantity_planned),
  CONSTRAINT v2_fulfillment_group_items_unique UNIQUE (fulfillment_group_id, order_item_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_fulfillment_group_items_order_item_id
  ON public.v2_fulfillment_group_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_v2_fulfillment_group_items_status
  ON public.v2_fulfillment_group_items(status);

CREATE TABLE IF NOT EXISTS public.v2_fulfillments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_group_id UUID NOT NULL REFERENCES public.v2_fulfillment_groups(id) ON DELETE CASCADE,
  kind v2_fulfillment_group_kind_enum NOT NULL,
  status v2_fulfillment_execution_status_enum NOT NULL DEFAULT 'REQUESTED',
  provider_type VARCHAR(80) NOT NULL DEFAULT 'MANUAL',
  provider_ref VARCHAR(255),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_fulfillments_group_id ON public.v2_fulfillments(fulfillment_group_id);
CREATE INDEX IF NOT EXISTS idx_v2_fulfillments_status_requested_at
  ON public.v2_fulfillments(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_fulfillments_provider_ref
  ON public.v2_fulfillments(provider_type, provider_ref);

CREATE TABLE IF NOT EXISTS public.v2_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_id UUID NOT NULL REFERENCES public.v2_fulfillments(id) ON DELETE CASCADE,
  carrier VARCHAR(100),
  service_level VARCHAR(100),
  tracking_no VARCHAR(200),
  tracking_url VARCHAR(1000),
  label_ref VARCHAR(255),
  status v2_shipment_status_enum NOT NULL DEFAULT 'READY_TO_PACK',
  packed_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_shipments_fulfillment_unique UNIQUE (fulfillment_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_shipments_status ON public.v2_shipments(status, shipped_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_shipments_tracking_no ON public.v2_shipments(tracking_no);

CREATE TABLE IF NOT EXISTS public.v2_shipment_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_id UUID NOT NULL REFERENCES public.v2_shipments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE CASCADE,
  fulfillment_group_item_id UUID REFERENCES public.v2_fulfillment_group_items(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_shipment_items_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_shipment_items_order_item_id ON public.v2_shipment_items(order_item_id);
CREATE INDEX IF NOT EXISTS idx_v2_shipment_items_group_item_id ON public.v2_shipment_items(fulfillment_group_item_id);

CREATE TABLE IF NOT EXISTS public.v2_inventory_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES public.v2_product_variants(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.v2_stock_locations(id) ON DELETE CASCADE,
  on_hand_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  available_quantity INTEGER NOT NULL DEFAULT 0,
  safety_stock_quantity INTEGER NOT NULL DEFAULT 0,
  updated_reason VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_inventory_levels_variant_location_unique UNIQUE (variant_id, location_id),
  CONSTRAINT v2_inventory_levels_on_hand_non_negative CHECK (on_hand_quantity >= 0),
  CONSTRAINT v2_inventory_levels_reserved_non_negative CHECK (reserved_quantity >= 0),
  CONSTRAINT v2_inventory_levels_safety_non_negative CHECK (safety_stock_quantity >= 0),
  CONSTRAINT v2_inventory_levels_reserved_le_on_hand CHECK (reserved_quantity <= on_hand_quantity),
  CONSTRAINT v2_inventory_levels_available_non_negative CHECK (available_quantity >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_inventory_levels_location_id ON public.v2_inventory_levels(location_id);
CREATE INDEX IF NOT EXISTS idx_v2_inventory_levels_available_quantity ON public.v2_inventory_levels(available_quantity DESC);

CREATE TABLE IF NOT EXISTS public.v2_inventory_reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES public.v2_product_variants(id) ON DELETE RESTRICT,
  location_id UUID NOT NULL REFERENCES public.v2_stock_locations(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE CASCADE,
  fulfillment_group_id UUID REFERENCES public.v2_fulfillment_groups(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status v2_inventory_reservation_status_enum NOT NULL DEFAULT 'ACTIVE',
  reason VARCHAR(120),
  idempotency_key VARCHAR(255),
  expires_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_inventory_reservations_quantity_positive CHECK (quantity > 0),
  CONSTRAINT v2_inventory_reservations_status_timestamp_check CHECK (
    (status = 'ACTIVE' AND released_at IS NULL AND consumed_at IS NULL AND canceled_at IS NULL)
    OR (status = 'RELEASED' AND released_at IS NOT NULL AND consumed_at IS NULL AND canceled_at IS NULL)
    OR (status = 'CONSUMED' AND consumed_at IS NOT NULL AND released_at IS NULL AND canceled_at IS NULL)
    OR (status = 'CANCELED' AND canceled_at IS NOT NULL AND released_at IS NULL AND consumed_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_inventory_reservations_variant_location_status
  ON public.v2_inventory_reservations(variant_id, location_id, status);
CREATE INDEX IF NOT EXISTS idx_v2_inventory_reservations_order_id ON public.v2_inventory_reservations(order_id);
CREATE INDEX IF NOT EXISTS idx_v2_inventory_reservations_order_item_id
  ON public.v2_inventory_reservations(order_item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_inventory_reservations_active_line
  ON public.v2_inventory_reservations(order_item_id, variant_id, location_id)
  WHERE status = 'ACTIVE';
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_inventory_reservations_idempotency_key
  ON public.v2_inventory_reservations(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.v2_digital_entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.v2_orders(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.v2_order_items(id) ON DELETE CASCADE,
  digital_asset_id UUID REFERENCES public.v2_digital_assets(id) ON DELETE SET NULL,
  fulfillment_id UUID REFERENCES public.v2_fulfillments(id) ON DELETE SET NULL,
  status v2_digital_entitlement_status_enum NOT NULL DEFAULT 'PENDING',
  access_type v2_digital_access_type_enum,
  token_hash VARCHAR(255),
  token_reference VARCHAR(255),
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  max_downloads INTEGER,
  download_count INTEGER NOT NULL DEFAULT 0,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  failed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_digital_entitlements_download_count_non_negative CHECK (download_count >= 0),
  CONSTRAINT v2_digital_entitlements_max_downloads_positive CHECK (
    max_downloads IS NULL OR max_downloads > 0
  ),
  CONSTRAINT v2_digital_entitlements_download_count_le_max CHECK (
    max_downloads IS NULL OR download_count <= max_downloads
  ),
  CONSTRAINT v2_digital_entitlements_status_timestamp_check CHECK (
    (status = 'PENDING' AND granted_at IS NULL AND revoked_at IS NULL AND failed_at IS NULL)
    OR (status = 'GRANTED' AND granted_at IS NOT NULL AND revoked_at IS NULL AND failed_at IS NULL)
    OR (status = 'EXPIRED' AND granted_at IS NOT NULL AND revoked_at IS NULL AND failed_at IS NULL)
    OR (status = 'REVOKED' AND revoked_at IS NOT NULL AND failed_at IS NULL)
    OR (status = 'FAILED' AND failed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_digital_entitlements_order_item_id
  ON public.v2_digital_entitlements(order_item_id);
CREATE INDEX IF NOT EXISTS idx_v2_digital_entitlements_status
  ON public.v2_digital_entitlements(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_digital_entitlements_expires_at
  ON public.v2_digital_entitlements(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_digital_entitlements_token_hash
  ON public.v2_digital_entitlements(token_hash)
  WHERE token_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.v2_digital_entitlement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entitlement_id UUID NOT NULL REFERENCES public.v2_digital_entitlements(id) ON DELETE CASCADE,
  event_type v2_digital_entitlement_event_type_enum NOT NULL,
  actor_type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_digital_entitlement_events_entitlement_id
  ON public.v2_digital_entitlement_events(entitlement_id);
CREATE INDEX IF NOT EXISTS idx_v2_digital_entitlement_events_type_time
  ON public.v2_digital_entitlement_events(event_type, event_at DESC);

-- =====================================================
-- 3. TRIGGERS / FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION public.sync_v2_inventory_available_quantity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.on_hand_quantity := COALESCE(NEW.on_hand_quantity, 0);
  NEW.reserved_quantity := COALESCE(NEW.reserved_quantity, 0);

  IF NEW.reserved_quantity > NEW.on_hand_quantity THEN
    RAISE EXCEPTION
      'reserved_quantity(%) cannot exceed on_hand_quantity(%)',
      NEW.reserved_quantity,
      NEW.on_hand_quantity;
  END IF;

  NEW.available_quantity := NEW.on_hand_quantity - NEW.reserved_quantity;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_v2_inventory_levels_available_quantity ON public.v2_inventory_levels;
CREATE TRIGGER sync_v2_inventory_levels_available_quantity
  BEFORE INSERT OR UPDATE ON public.v2_inventory_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_v2_inventory_available_quantity();

DROP TRIGGER IF EXISTS update_v2_stock_locations_updated_at ON public.v2_stock_locations;
CREATE TRIGGER update_v2_stock_locations_updated_at
  BEFORE UPDATE ON public.v2_stock_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_shipping_methods_updated_at ON public.v2_shipping_methods;
CREATE TRIGGER update_v2_shipping_methods_updated_at
  BEFORE UPDATE ON public.v2_shipping_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_shipping_zones_updated_at ON public.v2_shipping_zones;
CREATE TRIGGER update_v2_shipping_zones_updated_at
  BEFORE UPDATE ON public.v2_shipping_zones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_shipping_profiles_updated_at ON public.v2_shipping_profiles;
CREATE TRIGGER update_v2_shipping_profiles_updated_at
  BEFORE UPDATE ON public.v2_shipping_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_shipping_rate_rules_updated_at ON public.v2_shipping_rate_rules;
CREATE TRIGGER update_v2_shipping_rate_rules_updated_at
  BEFORE UPDATE ON public.v2_shipping_rate_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_fulfillment_groups_updated_at ON public.v2_fulfillment_groups;
CREATE TRIGGER update_v2_fulfillment_groups_updated_at
  BEFORE UPDATE ON public.v2_fulfillment_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_fulfillment_group_items_updated_at ON public.v2_fulfillment_group_items;
CREATE TRIGGER update_v2_fulfillment_group_items_updated_at
  BEFORE UPDATE ON public.v2_fulfillment_group_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_fulfillments_updated_at ON public.v2_fulfillments;
CREATE TRIGGER update_v2_fulfillments_updated_at
  BEFORE UPDATE ON public.v2_fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_shipments_updated_at ON public.v2_shipments;
CREATE TRIGGER update_v2_shipments_updated_at
  BEFORE UPDATE ON public.v2_shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_inventory_levels_updated_at ON public.v2_inventory_levels;
CREATE TRIGGER update_v2_inventory_levels_updated_at
  BEFORE UPDATE ON public.v2_inventory_levels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_inventory_reservations_updated_at ON public.v2_inventory_reservations;
CREATE TRIGGER update_v2_inventory_reservations_updated_at
  BEFORE UPDATE ON public.v2_inventory_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_digital_entitlements_updated_at ON public.v2_digital_entitlements;
CREATE TRIGGER update_v2_digital_entitlements_updated_at
  BEFORE UPDATE ON public.v2_digital_entitlements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_fulfillment_groups IS 'Order-level fulfillment planning groups (DIGITAL/SHIPMENT/PICKUP)';
COMMENT ON TABLE public.v2_fulfillment_group_items IS 'Join table from v2_order_items to v2_fulfillment_groups';
COMMENT ON TABLE public.v2_fulfillments IS 'Execution attempts and operation traces for each fulfillment group';
COMMENT ON TABLE public.v2_shipments IS 'Physical shipment details attached to fulfillment execution';
COMMENT ON TABLE public.v2_shipment_items IS 'Physical packed line items included in each shipment';
COMMENT ON TABLE public.v2_stock_locations IS 'Stock source locations (warehouse, popup, store, vendor)';
COMMENT ON TABLE public.v2_inventory_levels IS 'Current stock balance per variant/location';
COMMENT ON TABLE public.v2_inventory_reservations IS 'Reservation ledger with ACTIVE/RELEASED/CONSUMED/CANCELED transitions';
COMMENT ON TABLE public.v2_shipping_profiles IS 'Shipping policy sets assigned to catalog variants/products';
COMMENT ON TABLE public.v2_shipping_methods IS 'Available shipping or pickup methods';
COMMENT ON TABLE public.v2_shipping_zones IS 'Logical shipping zones used by rate rules';
COMMENT ON TABLE public.v2_shipping_rate_rules IS 'Shipping amount rules by method, zone, and optional profile';
COMMENT ON TABLE public.v2_digital_entitlements IS 'Digital access grants linked to orders/order-items';
COMMENT ON TABLE public.v2_digital_entitlement_events IS 'Audit events for entitlement grant/download/reissue/revoke';
COMMENT ON COLUMN public.v2_digital_entitlements.token_hash IS 'Store token hash only; do not persist raw downloadable tokens';
COMMENT ON COLUMN public.v2_digital_entitlements.token_reference IS 'External provider reference for token/signature tracking';

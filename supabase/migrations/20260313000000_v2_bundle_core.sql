-- V2 Bundle Core Schema Migration
-- Created: 2026-03-13
-- Description: Add v2 bundle definitions/components and order_items bundle snapshot fields
-- Reference: docs/v2-plans/02/*

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_bundle_mode_enum AS ENUM ('FIXED', 'CUSTOMIZABLE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_bundle_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_bundle_pricing_strategy_enum AS ENUM ('WEIGHTED', 'FIXED_AMOUNT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE order_item_line_type AS ENUM ('STANDARD', 'BUNDLE_PARENT', 'BUNDLE_COMPONENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_bundle_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_product_id UUID NOT NULL REFERENCES public.v2_products(id) ON DELETE CASCADE,
  anchor_product_id UUID NOT NULL REFERENCES public.v2_products(id) ON DELETE RESTRICT,
  version_no INTEGER NOT NULL DEFAULT 1,
  mode v2_bundle_mode_enum NOT NULL DEFAULT 'FIXED',
  status v2_bundle_status_enum NOT NULL DEFAULT 'DRAFT',
  pricing_strategy v2_bundle_pricing_strategy_enum NOT NULL DEFAULT 'WEIGHTED',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_bundle_definitions_version_positive CHECK (version_no > 0),
  CONSTRAINT v2_bundle_definitions_anchor_matches_bundle CHECK (
    anchor_product_id = bundle_product_id
  ),
  CONSTRAINT v2_bundle_definitions_product_version_unique UNIQUE (
    bundle_product_id,
    version_no
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_bundle_definitions_bundle_product_id
  ON public.v2_bundle_definitions(bundle_product_id);
CREATE INDEX IF NOT EXISTS idx_v2_bundle_definitions_status
  ON public.v2_bundle_definitions(status);
CREATE INDEX IF NOT EXISTS idx_v2_bundle_definitions_mode
  ON public.v2_bundle_definitions(mode);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_bundle_definitions_live_per_product
  ON public.v2_bundle_definitions(bundle_product_id)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.v2_bundle_components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_definition_id UUID NOT NULL REFERENCES public.v2_bundle_definitions(id) ON DELETE CASCADE,
  component_variant_id UUID NOT NULL REFERENCES public.v2_product_variants(id) ON DELETE RESTRICT,
  is_required BOOLEAN NOT NULL DEFAULT true,
  min_quantity INTEGER NOT NULL DEFAULT 1,
  max_quantity INTEGER NOT NULL DEFAULT 1,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  price_allocation_weight NUMERIC(12, 6) NOT NULL DEFAULT 1.0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_bundle_components_quantity_non_negative CHECK (
    min_quantity >= 0 AND max_quantity >= 1
  ),
  CONSTRAINT v2_bundle_components_quantity_range_valid CHECK (
    min_quantity <= max_quantity
  ),
  CONSTRAINT v2_bundle_components_default_within_range CHECK (
    default_quantity >= min_quantity AND default_quantity <= max_quantity
  ),
  CONSTRAINT v2_bundle_components_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT v2_bundle_components_allocation_weight_non_negative CHECK (
    price_allocation_weight >= 0
  ),
  CONSTRAINT v2_bundle_components_definition_variant_unique UNIQUE (
    bundle_definition_id,
    component_variant_id
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_bundle_components_definition_id
  ON public.v2_bundle_components(bundle_definition_id);
CREATE INDEX IF NOT EXISTS idx_v2_bundle_components_variant_id
  ON public.v2_bundle_components(component_variant_id);

CREATE TABLE IF NOT EXISTS public.v2_bundle_component_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bundle_component_id UUID NOT NULL REFERENCES public.v2_bundle_components(id) ON DELETE CASCADE,
  option_key VARCHAR(120) NOT NULL,
  option_value VARCHAR(255) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_bundle_component_options_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT v2_bundle_component_options_unique UNIQUE (
    bundle_component_id,
    option_key,
    option_value
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_bundle_component_options_component_id
  ON public.v2_bundle_component_options(bundle_component_id);

-- =====================================================
-- 3. VALIDATION FUNCTIONS / TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION public.validate_v2_bundle_definition_product_kind()
RETURNS TRIGGER AS $$
DECLARE
  bundle_kind v2_product_kind_enum;
BEGIN
  SELECT product_kind
    INTO bundle_kind
  FROM public.v2_products
  WHERE id = NEW.bundle_product_id
    AND deleted_at IS NULL;

  IF bundle_kind IS NULL THEN
    RAISE EXCEPTION 'Bundle product not found: %', NEW.bundle_product_id;
  END IF;

  IF bundle_kind <> 'BUNDLE' THEN
    RAISE EXCEPTION 'v2_bundle_definitions.bundle_product_id must reference BUNDLE product';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_v2_bundle_definition_product_kind
  ON public.v2_bundle_definitions;
CREATE TRIGGER validate_v2_bundle_definition_product_kind
  BEFORE INSERT OR UPDATE ON public.v2_bundle_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_v2_bundle_definition_product_kind();

-- Keep component_variant_id aligned with component product fulfillment boundary.
CREATE OR REPLACE FUNCTION public.validate_v2_bundle_component_variant()
RETURNS TRIGGER AS $$
DECLARE
  target_product_kind v2_product_kind_enum;
BEGIN
  SELECT p.product_kind
    INTO target_product_kind
  FROM public.v2_product_variants v
  JOIN public.v2_products p ON p.id = v.product_id
  WHERE v.id = NEW.component_variant_id
    AND v.deleted_at IS NULL
    AND p.deleted_at IS NULL;

  IF target_product_kind IS NULL THEN
    RAISE EXCEPTION 'Component variant not found: %', NEW.component_variant_id;
  END IF;

  IF target_product_kind = 'BUNDLE' THEN
    RAISE EXCEPTION 'Nested bundle component is not allowed in v1 rollout';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_v2_bundle_component_variant
  ON public.v2_bundle_components;
CREATE TRIGGER validate_v2_bundle_component_variant
  BEFORE INSERT OR UPDATE ON public.v2_bundle_components
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_v2_bundle_component_variant();

DROP TRIGGER IF EXISTS update_v2_bundle_definitions_updated_at
  ON public.v2_bundle_definitions;
CREATE TRIGGER update_v2_bundle_definitions_updated_at
  BEFORE UPDATE ON public.v2_bundle_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_bundle_components_updated_at
  ON public.v2_bundle_components;
CREATE TRIGGER update_v2_bundle_components_updated_at
  BEFORE UPDATE ON public.v2_bundle_components
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_bundle_component_options_updated_at
  ON public.v2_bundle_component_options;
CREATE TRIGGER update_v2_bundle_component_options_updated_at
  BEFORE UPDATE ON public.v2_bundle_component_options
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ORDER ITEM SNAPSHOT CONTRACT
-- =====================================================

DO $$ BEGIN
  ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS line_type order_item_line_type NOT NULL DEFAULT 'STANDARD';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS parent_order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS bundle_definition_id_snapshot UUID REFERENCES public.v2_bundle_definitions(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS bundle_component_id_snapshot UUID REFERENCES public.v2_bundle_components(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS allocated_unit_amount INTEGER;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS allocated_discount_amount INTEGER NOT NULL DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_line_type_parent_required;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_line_type_parent_required CHECK (
    line_type <> 'BUNDLE_COMPONENT' OR parent_order_item_id IS NOT NULL
  );

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_allocated_amount_non_negative;
ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_allocated_amount_non_negative CHECK (
    (allocated_unit_amount IS NULL OR allocated_unit_amount >= 0)
    AND allocated_discount_amount >= 0
  );

CREATE INDEX IF NOT EXISTS idx_order_items_line_type
  ON public.order_items(line_type);
CREATE INDEX IF NOT EXISTS idx_order_items_parent_order_item_id
  ON public.order_items(parent_order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_items_bundle_definition_snapshot
  ON public.order_items(bundle_definition_id_snapshot);
CREATE INDEX IF NOT EXISTS idx_order_items_bundle_component_snapshot
  ON public.order_items(bundle_component_id_snapshot);

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_bundle_definitions IS
  'Bundle composition definition with versioning and lifecycle';
COMMENT ON TABLE public.v2_bundle_components IS
  'Bundle component rows pointing to sellable component variants';
COMMENT ON TABLE public.v2_bundle_component_options IS
  'Optional option values for CUSTOMIZABLE bundle components';

COMMENT ON COLUMN public.order_items.line_type IS
  'Order line kind: STANDARD, BUNDLE_PARENT, BUNDLE_COMPONENT';
COMMENT ON COLUMN public.order_items.bundle_definition_id_snapshot IS
  'Bundle definition snapshot used to create this order line';
COMMENT ON COLUMN public.order_items.bundle_component_id_snapshot IS
  'Bundle component snapshot used to create this order line';
COMMENT ON COLUMN public.order_items.allocated_unit_amount IS
  'Allocated unit amount for component lines';
COMMENT ON COLUMN public.order_items.allocated_discount_amount IS
  'Allocated discount amount for component lines';


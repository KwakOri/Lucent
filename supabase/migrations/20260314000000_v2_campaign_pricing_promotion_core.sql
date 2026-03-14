-- V2 Campaign / Pricing / Promotion Core Schema Migration
-- Created: 2026-03-14
-- Description: Add v2 campaign, price list, promotion, coupon tables
-- Reference: docs/v2-plans/03/*

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_campaign_type_enum AS ENUM ('POPUP', 'EVENT', 'SALE', 'DROP', 'ALWAYS_ON');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_campaign_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_campaign_target_type_enum AS ENUM ('PROJECT', 'PRODUCT', 'VARIANT', 'BUNDLE_DEFINITION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_price_list_scope_enum AS ENUM ('BASE', 'OVERRIDE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_price_list_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'ROLLED_BACK', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_price_item_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_promotion_type_enum AS ENUM (
    'ITEM_PERCENT',
    'ITEM_FIXED',
    'ORDER_PERCENT',
    'ORDER_FIXED',
    'SHIPPING_PERCENT',
    'SHIPPING_FIXED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_promotion_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_combinability_mode_enum AS ENUM ('STACKABLE', 'EXCLUSIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_promotion_rule_type_enum AS ENUM (
    'MIN_ORDER_AMOUNT',
    'MIN_ITEM_QUANTITY',
    'TARGET_PROJECT',
    'TARGET_PRODUCT',
    'TARGET_VARIANT',
    'TARGET_BUNDLE',
    'CHANNEL',
    'USER_SEGMENT'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_coupon_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXHAUSTED', 'EXPIRED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_coupon_redemption_status_enum AS ENUM ('RESERVED', 'APPLIED', 'RELEASED', 'CANCELED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type v2_campaign_type_enum NOT NULL DEFAULT 'EVENT',
  status v2_campaign_status_enum NOT NULL DEFAULT 'DRAFT',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  channel_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  purchase_limit_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_campaigns_code_unique UNIQUE (code),
  CONSTRAINT v2_campaigns_period_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_v2_campaigns_campaign_type ON public.v2_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_v2_campaigns_status ON public.v2_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_v2_campaigns_starts_at ON public.v2_campaigns(starts_at);
CREATE INDEX IF NOT EXISTS idx_v2_campaigns_source ON public.v2_campaigns(source_type, source_id);

CREATE TABLE IF NOT EXISTS public.v2_campaign_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.v2_campaigns(id) ON DELETE CASCADE,
  target_type v2_campaign_target_type_enum NOT NULL,
  target_id UUID NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_excluded BOOLEAN NOT NULL DEFAULT false,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_campaign_targets_sort_order_non_negative CHECK (sort_order >= 0),
  CONSTRAINT v2_campaign_targets_unique UNIQUE (campaign_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_campaign_targets_campaign_id ON public.v2_campaign_targets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_v2_campaign_targets_target_ref ON public.v2_campaign_targets(target_type, target_id);

CREATE TABLE IF NOT EXISTS public.v2_price_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.v2_campaigns(id) ON DELETE SET NULL,
  rollback_of_price_list_id UUID REFERENCES public.v2_price_lists(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  scope_type v2_price_list_scope_enum NOT NULL DEFAULT 'BASE',
  status v2_price_list_status_enum NOT NULL DEFAULT 'DRAFT',
  currency_code CHAR(3) NOT NULL DEFAULT 'KRW',
  priority INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  channel_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_price_lists_priority_non_negative CHECK (priority >= 0),
  CONSTRAINT v2_price_lists_currency_format CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT v2_price_lists_period_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_v2_price_lists_campaign_id ON public.v2_price_lists(campaign_id);
CREATE INDEX IF NOT EXISTS idx_v2_price_lists_scope_status ON public.v2_price_lists(scope_type, status);
CREATE INDEX IF NOT EXISTS idx_v2_price_lists_priority ON public.v2_price_lists(priority);
CREATE INDEX IF NOT EXISTS idx_v2_price_lists_source ON public.v2_price_lists(source_type, source_id);

CREATE TABLE IF NOT EXISTS public.v2_price_list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  price_list_id UUID NOT NULL REFERENCES public.v2_price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.v2_products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.v2_product_variants(id) ON DELETE SET NULL,
  status v2_price_item_status_enum NOT NULL DEFAULT 'ACTIVE',
  unit_amount INTEGER NOT NULL,
  compare_at_amount INTEGER,
  min_purchase_quantity INTEGER NOT NULL DEFAULT 1,
  max_purchase_quantity INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  channel_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_price_list_items_amount_non_negative CHECK (unit_amount >= 0),
  CONSTRAINT v2_price_list_items_compare_amount_valid CHECK (
    compare_at_amount IS NULL OR compare_at_amount >= unit_amount
  ),
  CONSTRAINT v2_price_list_items_purchase_limit_valid CHECK (
    min_purchase_quantity > 0
    AND (max_purchase_quantity IS NULL OR max_purchase_quantity >= min_purchase_quantity)
  ),
  CONSTRAINT v2_price_list_items_period_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT v2_price_list_items_unique UNIQUE (price_list_id, product_id, variant_id)
);

CREATE INDEX IF NOT EXISTS idx_v2_price_list_items_price_list_id ON public.v2_price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_v2_price_list_items_product_variant ON public.v2_price_list_items(product_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_v2_price_list_items_status ON public.v2_price_list_items(status);
CREATE INDEX IF NOT EXISTS idx_v2_price_list_items_source ON public.v2_price_list_items(source_type, source_id);

CREATE TABLE IF NOT EXISTS public.v2_promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES public.v2_campaigns(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  promotion_type v2_promotion_type_enum NOT NULL DEFAULT 'ORDER_PERCENT',
  status v2_promotion_status_enum NOT NULL DEFAULT 'DRAFT',
  combinability_mode v2_combinability_mode_enum NOT NULL DEFAULT 'STACKABLE',
  coupon_required BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 100,
  discount_value NUMERIC(12, 4) NOT NULL,
  max_discount_amount INTEGER,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  channel_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  purchase_limit_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_promotions_priority_non_negative CHECK (priority >= 0),
  CONSTRAINT v2_promotions_discount_value_non_negative CHECK (discount_value >= 0),
  CONSTRAINT v2_promotions_max_discount_non_negative CHECK (
    max_discount_amount IS NULL OR max_discount_amount >= 0
  ),
  CONSTRAINT v2_promotions_period_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX IF NOT EXISTS idx_v2_promotions_campaign_id ON public.v2_promotions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_v2_promotions_type_status ON public.v2_promotions(promotion_type, status);
CREATE INDEX IF NOT EXISTS idx_v2_promotions_priority ON public.v2_promotions(priority);
CREATE INDEX IF NOT EXISTS idx_v2_promotions_source ON public.v2_promotions(source_type, source_id);

CREATE TABLE IF NOT EXISTS public.v2_promotion_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID NOT NULL REFERENCES public.v2_promotions(id) ON DELETE CASCADE,
  rule_type v2_promotion_rule_type_enum NOT NULL,
  status v2_price_item_status_enum NOT NULL DEFAULT 'ACTIVE',
  sort_order INTEGER NOT NULL DEFAULT 0,
  rule_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_promotion_rules_sort_order_non_negative CHECK (sort_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_promotion_rules_promotion_id ON public.v2_promotion_rules(promotion_id);
CREATE INDEX IF NOT EXISTS idx_v2_promotion_rules_type ON public.v2_promotion_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_v2_promotion_rules_status ON public.v2_promotion_rules(status);

CREATE TABLE IF NOT EXISTS public.v2_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id UUID REFERENCES public.v2_promotions(id) ON DELETE SET NULL,
  code VARCHAR(80) NOT NULL,
  status v2_coupon_status_enum NOT NULL DEFAULT 'DRAFT',
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_issuance INTEGER,
  max_redemptions_per_user INTEGER NOT NULL DEFAULT 1,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  redeemed_count INTEGER NOT NULL DEFAULT 0,
  channel_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  purchase_limit_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_coupons_code_unique UNIQUE (code),
  CONSTRAINT v2_coupons_period_valid CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at),
  CONSTRAINT v2_coupons_max_issuance_non_negative CHECK (max_issuance IS NULL OR max_issuance >= 0),
  CONSTRAINT v2_coupons_max_redemptions_positive CHECK (max_redemptions_per_user > 0),
  CONSTRAINT v2_coupons_counters_non_negative CHECK (reserved_count >= 0 AND redeemed_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_v2_coupons_promotion_id ON public.v2_coupons(promotion_id);
CREATE INDEX IF NOT EXISTS idx_v2_coupons_status ON public.v2_coupons(status);
CREATE INDEX IF NOT EXISTS idx_v2_coupons_source ON public.v2_coupons(source_type, source_id);

CREATE TABLE IF NOT EXISTS public.v2_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coupon_id UUID NOT NULL REFERENCES public.v2_coupons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  status v2_coupon_redemption_status_enum NOT NULL DEFAULT 'RESERVED',
  quote_reference VARCHAR(120),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  source_type VARCHAR(80),
  source_id VARCHAR(120),
  source_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_coupon_redemptions_release_after_reserve CHECK (
    released_at IS NULL OR released_at >= reserved_at
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_coupon_redemptions_coupon_id ON public.v2_coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_v2_coupon_redemptions_user_id ON public.v2_coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_v2_coupon_redemptions_status ON public.v2_coupon_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_v2_coupon_redemptions_order_id ON public.v2_coupon_redemptions(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_coupon_redemptions_coupon_order
  ON public.v2_coupon_redemptions(coupon_id, order_id)
  WHERE order_id IS NOT NULL AND deleted_at IS NULL;

-- =====================================================
-- 3. UPDATED_AT TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_campaigns_updated_at ON public.v2_campaigns;
CREATE TRIGGER update_v2_campaigns_updated_at
  BEFORE UPDATE ON public.v2_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_campaign_targets_updated_at ON public.v2_campaign_targets;
CREATE TRIGGER update_v2_campaign_targets_updated_at
  BEFORE UPDATE ON public.v2_campaign_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_price_lists_updated_at ON public.v2_price_lists;
CREATE TRIGGER update_v2_price_lists_updated_at
  BEFORE UPDATE ON public.v2_price_lists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_price_list_items_updated_at ON public.v2_price_list_items;
CREATE TRIGGER update_v2_price_list_items_updated_at
  BEFORE UPDATE ON public.v2_price_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_promotions_updated_at ON public.v2_promotions;
CREATE TRIGGER update_v2_promotions_updated_at
  BEFORE UPDATE ON public.v2_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_promotion_rules_updated_at ON public.v2_promotion_rules;
CREATE TRIGGER update_v2_promotion_rules_updated_at
  BEFORE UPDATE ON public.v2_promotion_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_coupons_updated_at ON public.v2_coupons;
CREATE TRIGGER update_v2_coupons_updated_at
  BEFORE UPDATE ON public.v2_coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_coupon_redemptions_updated_at ON public.v2_coupon_redemptions;
CREATE TRIGGER update_v2_coupon_redemptions_updated_at
  BEFORE UPDATE ON public.v2_coupon_redemptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_campaigns IS 'Sales context (popup/event/drop) root table';
COMMENT ON TABLE public.v2_campaign_targets IS 'Campaign target bindings (project/product/variant/bundle)';
COMMENT ON TABLE public.v2_price_lists IS 'Published/rollbackable price list headers';
COMMENT ON TABLE public.v2_price_list_items IS 'Variant/product level price rows for quote pipeline';
COMMENT ON TABLE public.v2_promotions IS 'Discount definition objects evaluated after base/override pricing';
COMMENT ON TABLE public.v2_promotion_rules IS 'Rule payload rows for promotion eligibility checks';
COMMENT ON TABLE public.v2_coupons IS 'Coupon issuance and lifecycle metadata';
COMMENT ON TABLE public.v2_coupon_redemptions IS 'Coupon reserve/apply/release history by user/order';

COMMENT ON COLUMN public.v2_campaigns.source_type IS 'Upstream source namespace (legacy/manual/import)';
COMMENT ON COLUMN public.v2_campaigns.source_id IS 'Upstream source identifier';
COMMENT ON COLUMN public.v2_price_list_items.channel_scope_json IS 'Channel scope policy payload';
COMMENT ON COLUMN public.v2_promotions.combinability_mode IS 'Promotion stackability mode';
COMMENT ON COLUMN public.v2_coupon_redemptions.quote_reference IS 'Quote/calc pipeline reference id';

-- V2 Migration / Cutover Control Core
-- Created: 2026-03-14
-- Description: domain-level cutover status board, gate reports, migration batches, legacy mapping, routing flags
-- Reference: docs/v2-plans/07/*

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_cutover_status_enum AS ENUM (
    'NOT_STARTED',
    'SCHEMA_READY',
    'BACKFILL_DONE',
    'SHADOW_VERIFIED',
    'LIMITED_CUTOVER',
    'WRITE_DEFAULT_V2',
    'LEGACY_READONLY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_cutover_gate_type_enum AS ENUM (
    'DATA_CONSISTENCY',
    'BEHAVIORAL',
    'OPERATIONS',
    'ROLLBACK_READY'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_cutover_gate_result_enum AS ENUM (
    'PASS',
    'FAIL',
    'WARN',
    'SKIP'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_cutover_batch_status_enum AS ENUM (
    'PENDING',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_cutover_route_target_enum AS ENUM (
    'LEGACY',
    'V2',
    'SHADOW'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_cutover_domains (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_key VARCHAR(80) NOT NULL,
  domain_name VARCHAR(120) NOT NULL,
  status v2_cutover_status_enum NOT NULL DEFAULT 'NOT_STARTED',
  current_stage SMALLINT NOT NULL DEFAULT 0,
  next_action TEXT,
  owner_role_code VARCHAR(80),
  last_gate_result v2_cutover_gate_result_enum NOT NULL DEFAULT 'SKIP',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_cutover_domains_domain_key_unique UNIQUE (domain_key),
  CONSTRAINT v2_cutover_domains_stage_check CHECK (current_stage >= 0 AND current_stage <= 8)
);

CREATE INDEX IF NOT EXISTS idx_v2_cutover_domains_status
  ON public.v2_cutover_domains(status);
CREATE INDEX IF NOT EXISTS idx_v2_cutover_domains_stage
  ON public.v2_cutover_domains(current_stage);

CREATE TABLE IF NOT EXISTS public.v2_cutover_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id UUID NOT NULL REFERENCES public.v2_cutover_domains(id) ON DELETE CASCADE,
  batch_key VARCHAR(120) NOT NULL,
  run_type VARCHAR(80) NOT NULL,
  status v2_cutover_batch_status_enum NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(120),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_cutover_batches_batch_key_unique UNIQUE (batch_key)
);

CREATE INDEX IF NOT EXISTS idx_v2_cutover_batches_domain_status
  ON public.v2_cutover_batches(domain_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_cutover_batches_run_type
  ON public.v2_cutover_batches(run_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_cutover_batches_domain_idempotency
  ON public.v2_cutover_batches(domain_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.v2_cutover_legacy_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id UUID NOT NULL REFERENCES public.v2_cutover_domains(id) ON DELETE CASCADE,
  legacy_resource_type VARCHAR(80) NOT NULL,
  legacy_resource_id VARCHAR(120) NOT NULL,
  v2_resource_type VARCHAR(80) NOT NULL,
  v2_resource_id UUID,
  mapping_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 1.00,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_cutover_legacy_mappings_status_check CHECK (
    mapping_status IN ('ACTIVE', 'DEPRECATED', 'BROKEN')
  ),
  CONSTRAINT v2_cutover_legacy_mappings_confidence_check CHECK (
    confidence_score >= 0 AND confidence_score <= 1
  ),
  CONSTRAINT v2_cutover_legacy_mappings_unique UNIQUE (
    domain_id,
    legacy_resource_type,
    legacy_resource_id,
    v2_resource_type
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_cutover_legacy_mappings_domain
  ON public.v2_cutover_legacy_mappings(domain_id, mapping_status);
CREATE INDEX IF NOT EXISTS idx_v2_cutover_legacy_mappings_v2_resource
  ON public.v2_cutover_legacy_mappings(v2_resource_type, v2_resource_id);

CREATE TABLE IF NOT EXISTS public.v2_cutover_gate_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id UUID NOT NULL REFERENCES public.v2_cutover_domains(id) ON DELETE CASCADE,
  gate_type v2_cutover_gate_type_enum NOT NULL,
  gate_key VARCHAR(120) NOT NULL,
  gate_result v2_cutover_gate_result_enum NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  threshold_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  detail TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_v2_cutover_gate_reports_domain_gate
  ON public.v2_cutover_gate_reports(domain_id, gate_type, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_cutover_gate_reports_result
  ON public.v2_cutover_gate_reports(gate_result);

CREATE TABLE IF NOT EXISTS public.v2_cutover_routing_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id UUID NOT NULL REFERENCES public.v2_cutover_domains(id) ON DELETE CASCADE,
  channel VARCHAR(80),
  campaign_id UUID,
  target v2_cutover_route_target_enum NOT NULL DEFAULT 'LEGACY',
  traffic_percent INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_cutover_routing_flags_traffic_percent_check CHECK (
    traffic_percent >= 0 AND traffic_percent <= 100
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_cutover_routing_flags_domain
  ON public.v2_cutover_routing_flags(domain_id, enabled, priority);
CREATE INDEX IF NOT EXISTS idx_v2_cutover_routing_flags_target
  ON public.v2_cutover_routing_flags(target, enabled);

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_cutover_domains_updated_at ON public.v2_cutover_domains;
CREATE TRIGGER update_v2_cutover_domains_updated_at
  BEFORE UPDATE ON public.v2_cutover_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_cutover_batches_updated_at ON public.v2_cutover_batches;
CREATE TRIGGER update_v2_cutover_batches_updated_at
  BEFORE UPDATE ON public.v2_cutover_batches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_cutover_legacy_mappings_updated_at ON public.v2_cutover_legacy_mappings;
CREATE TRIGGER update_v2_cutover_legacy_mappings_updated_at
  BEFORE UPDATE ON public.v2_cutover_legacy_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_cutover_gate_reports_updated_at ON public.v2_cutover_gate_reports;
CREATE TRIGGER update_v2_cutover_gate_reports_updated_at
  BEFORE UPDATE ON public.v2_cutover_gate_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_cutover_routing_flags_updated_at ON public.v2_cutover_routing_flags;
CREATE TRIGGER update_v2_cutover_routing_flags_updated_at
  BEFORE UPDATE ON public.v2_cutover_routing_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. SEED DOMAINS
-- =====================================================

INSERT INTO public.v2_cutover_domains (
  domain_key,
  domain_name,
  status,
  current_stage,
  next_action,
  owner_role_code,
  last_gate_result,
  metadata
)
VALUES
  ('CATALOG', 'Catalog Core', 'NOT_STARTED', 1, 'catalog compare report 기준 gate 정의', 'OPS_MANAGER', 'SKIP', jsonb_build_object('rollout_order', 1)),
  ('BUNDLE', 'Bundle', 'NOT_STARTED', 2, 'bundle shadow verify 기준 정리', 'OPS_MANAGER', 'SKIP', jsonb_build_object('rollout_order', 2)),
  ('PRICING', 'Campaign/Pricing', 'NOT_STARTED', 3, 'pricing/promotion gate 기준 정리', 'FINANCE_MANAGER', 'SKIP', jsonb_build_object('rollout_order', 3)),
  ('CHECKOUT', 'Checkout/Order', 'NOT_STARTED', 4, 'limited cutover campaign 선정', 'OPS_MANAGER', 'SKIP', jsonb_build_object('rollout_order', 4)),
  ('FULFILLMENT', 'Fulfillment/Inventory', 'NOT_STARTED', 5, 'fulfillment write allowlist 점검', 'OPS_MANAGER', 'SKIP', jsonb_build_object('rollout_order', 5)),
  ('ADMIN_OPS', 'Admin/Ops', 'NOT_STARTED', 6, 'action approval 정책 단계 조정', 'SUPER_ADMIN', 'SKIP', jsonb_build_object('rollout_order', 6)),
  ('MIGRATION_CORE', 'Migration Core', 'SCHEMA_READY', 0, 'gate 체계 연결', 'SUPER_ADMIN', 'SKIP', jsonb_build_object('rollout_order', 0))
ON CONFLICT (domain_key) DO UPDATE
SET
  domain_name = EXCLUDED.domain_name,
  current_stage = EXCLUDED.current_stage,
  next_action = EXCLUDED.next_action,
  owner_role_code = EXCLUDED.owner_role_code,
  metadata = EXCLUDED.metadata;

-- =====================================================
-- 5. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_cutover_domains IS 'Domain-level migration/cutover status board';
COMMENT ON TABLE public.v2_cutover_batches IS 'Idempotent migration/backfill/verify batch execution tracking';
COMMENT ON TABLE public.v2_cutover_legacy_mappings IS 'Legacy-v2 resource mapping table for traceability';
COMMENT ON TABLE public.v2_cutover_gate_reports IS 'Gate check reports for cutover decision';
COMMENT ON TABLE public.v2_cutover_routing_flags IS 'Traffic routing flags by campaign/channel/domain';

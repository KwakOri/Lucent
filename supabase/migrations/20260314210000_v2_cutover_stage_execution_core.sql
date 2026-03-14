-- V2 Migration / Cutover Stage Execution Core (P3)
-- Created: 2026-03-14
-- Description: stage 0~8 execution records + issue/recovery tracking
-- Reference: docs/v2-plans/07/execution_plan.md (P3)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE v2_cutover_stage_run_status_enum AS ENUM (
    'PLANNED',
    'RUNNING',
    'COMPLETED',
    'BLOCKED',
    'ROLLED_BACK',
    'CANCELED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_cutover_issue_status_enum AS ENUM (
    'OPEN',
    'MITIGATING',
    'RESOLVED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE v2_cutover_issue_severity_enum AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.v2_cutover_stage_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain_id UUID NOT NULL REFERENCES public.v2_cutover_domains(id) ON DELETE CASCADE,
  stage_no SMALLINT NOT NULL,
  run_key VARCHAR(120) NOT NULL,
  status v2_cutover_stage_run_status_enum NOT NULL DEFAULT 'PLANNED',
  transition_mode VARCHAR(30) NOT NULL DEFAULT 'LIMITED',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  limited_targets JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_cutover_stage_runs_stage_no_check CHECK (stage_no >= 0 AND stage_no <= 8),
  CONSTRAINT v2_cutover_stage_runs_transition_mode_check CHECK (
    transition_mode IN ('BASELINE', 'LIMITED', 'FULL', 'ROLLBACK')
  ),
  CONSTRAINT v2_cutover_stage_runs_run_key_unique UNIQUE (run_key)
);

CREATE INDEX IF NOT EXISTS idx_v2_cutover_stage_runs_domain_stage
  ON public.v2_cutover_stage_runs(domain_id, stage_no, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_cutover_stage_runs_status
  ON public.v2_cutover_stage_runs(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.v2_cutover_stage_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_run_id UUID REFERENCES public.v2_cutover_stage_runs(id) ON DELETE SET NULL,
  domain_id UUID NOT NULL REFERENCES public.v2_cutover_domains(id) ON DELETE CASCADE,
  stage_no SMALLINT NOT NULL,
  status v2_cutover_issue_status_enum NOT NULL DEFAULT 'OPEN',
  severity v2_cutover_issue_severity_enum NOT NULL DEFAULT 'MEDIUM',
  issue_type VARCHAR(50) NOT NULL DEFAULT 'INCIDENT',
  title VARCHAR(200) NOT NULL,
  detail TEXT,
  recovery_action TEXT,
  owner_role_code VARCHAR(80),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_cutover_stage_issues_stage_no_check CHECK (stage_no >= 0 AND stage_no <= 8)
);

CREATE INDEX IF NOT EXISTS idx_v2_cutover_stage_issues_domain_status
  ON public.v2_cutover_stage_issues(domain_id, status, severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_v2_cutover_stage_issues_stage_run
  ON public.v2_cutover_stage_issues(stage_run_id, created_at DESC);

-- =====================================================
-- 3. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_v2_cutover_stage_runs_updated_at ON public.v2_cutover_stage_runs;
CREATE TRIGGER update_v2_cutover_stage_runs_updated_at
  BEFORE UPDATE ON public.v2_cutover_stage_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_v2_cutover_stage_issues_updated_at ON public.v2_cutover_stage_issues;
CREATE TRIGGER update_v2_cutover_stage_issues_updated_at
  BEFORE UPDATE ON public.v2_cutover_stage_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. COMMENTS
-- =====================================================

COMMENT ON TABLE public.v2_cutover_stage_runs IS 'Execution records for cutover stages 0~8';
COMMENT ON TABLE public.v2_cutover_stage_issues IS 'Issue/recovery records linked to cutover stages';

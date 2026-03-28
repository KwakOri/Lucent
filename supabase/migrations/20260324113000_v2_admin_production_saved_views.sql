-- V2 Admin Production Saved Views
-- Created: 2026-03-24
-- Description: Persist production candidate filter views per admin account

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.v2_admin_production_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  filter_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT v2_admin_production_saved_views_filter_object_check
    CHECK (jsonb_typeof(filter_json) = 'object')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_admin_production_saved_views_owner_name
  ON public.v2_admin_production_saved_views(owner_admin_id, name);

CREATE INDEX IF NOT EXISTS idx_v2_admin_production_saved_views_owner_updated
  ON public.v2_admin_production_saved_views(owner_admin_id, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_admin_production_saved_views_owner_default
  ON public.v2_admin_production_saved_views(owner_admin_id)
  WHERE is_default = TRUE;

DROP TRIGGER IF EXISTS update_v2_admin_production_saved_views_updated_at
  ON public.v2_admin_production_saved_views;
CREATE TRIGGER update_v2_admin_production_saved_views_updated_at
  BEFORE UPDATE ON public.v2_admin_production_saved_views
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.v2_admin_production_saved_views IS
  'Saved production candidate views per admin account';

-- V2 Campaign / Pricing
-- Harden ALWAYS_ON campaign scope by syncing explicit project_id and target integrity
-- Created: 2026-03-28

ALTER TABLE public.v2_campaigns
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.v2_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_v2_campaigns_project_id ON public.v2_campaigns(project_id);

-- 1) Backfill campaign.project_id from include targets when the campaign scope resolves to a single project.
WITH target_project_candidates AS (
  SELECT
    t.campaign_id,
    CASE
      WHEN t.target_type = 'PROJECT'
        AND t.target_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN t.target_id
      WHEN t.target_type = 'PRODUCT'
      THEN p.project_id
      WHEN t.target_type = 'VARIANT'
      THEN vp.project_id
      WHEN t.target_type = 'BUNDLE_DEFINITION'
      THEN bp.project_id
      ELSE NULL::uuid
    END AS project_id
  FROM public.v2_campaign_targets t
  LEFT JOIN public.v2_products p
    ON t.target_type = 'PRODUCT'
   AND p.id = t.target_id
   AND p.deleted_at IS NULL
  LEFT JOIN (
    SELECT
      v.id,
      p.project_id
    FROM public.v2_product_variants v
    JOIN public.v2_products p
      ON p.id = v.product_id
     AND p.deleted_at IS NULL
    WHERE v.deleted_at IS NULL
  ) vp
    ON t.target_type = 'VARIANT'
   AND vp.id = t.target_id
  LEFT JOIN (
    SELECT
      bd.id,
      p.project_id
    FROM public.v2_bundle_definitions bd
    JOIN public.v2_products p
      ON p.id = bd.bundle_product_id
     AND p.deleted_at IS NULL
    WHERE bd.deleted_at IS NULL
  ) bp
    ON t.target_type = 'BUNDLE_DEFINITION'
   AND bp.id = t.target_id
  WHERE t.deleted_at IS NULL
    AND COALESCE(t.is_excluded, false) = false
),
single_target_project_campaigns AS (
  SELECT
    tpc.campaign_id,
    MIN(tpc.project_id::text)::uuid AS project_id
  FROM target_project_candidates tpc
  JOIN public.v2_projects p
    ON p.id = tpc.project_id
   AND p.deleted_at IS NULL
  WHERE tpc.project_id IS NOT NULL
  GROUP BY tpc.campaign_id
  HAVING COUNT(DISTINCT tpc.project_id) = 1
)
UPDATE public.v2_campaigns c
SET
  project_id = s.project_id,
  updated_at = NOW()
FROM single_target_project_campaigns s
WHERE c.id = s.campaign_id
  AND c.deleted_at IS NULL
  AND c.project_id IS NULL;

-- 2) Backfill campaign.project_id from source_id when source_id contains a valid project UUID.
WITH extracted_source_project AS (
  SELECT
    c.id AS campaign_id,
    CASE
      WHEN c.source_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN c.source_id
      ELSE substring(c.source_id FROM '([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})')
    END AS raw_project_id
  FROM public.v2_campaigns c
  WHERE c.deleted_at IS NULL
    AND c.project_id IS NULL
),
valid_source_project_campaigns AS (
  SELECT
    esp.campaign_id,
    p.id AS project_id
  FROM extracted_source_project esp
  JOIN public.v2_projects p
    ON p.id = esp.raw_project_id::uuid
   AND p.deleted_at IS NULL
  WHERE esp.raw_project_id IS NOT NULL
)
UPDATE public.v2_campaigns c
SET
  project_id = vsp.project_id,
  updated_at = NOW()
FROM valid_source_project_campaigns vsp
WHERE c.id = vsp.campaign_id
  AND c.deleted_at IS NULL
  AND c.project_id IS NULL;

-- 3) Ensure ALWAYS_ON campaigns with resolved project_id have an include PROJECT target.
INSERT INTO public.v2_campaign_targets (
  campaign_id,
  target_type,
  target_id,
  sort_order,
  is_excluded,
  source_type,
  source_id,
  source_snapshot_json,
  metadata,
  deleted_at
)
SELECT
  c.id,
  'PROJECT',
  c.project_id,
  0,
  false,
  'system',
  'campaign.project_id.sync',
  jsonb_build_object(
    'project_id', c.project_id,
    'backfill', '20260328110000_v2_campaign_project_scope_hardening.sql'
  ),
  jsonb_build_object(
    'created_by', '20260328110000_v2_campaign_project_scope_hardening.sql'
  ),
  NULL
FROM public.v2_campaigns c
WHERE c.deleted_at IS NULL
  AND c.campaign_type = 'ALWAYS_ON'
  AND c.project_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.v2_campaign_targets t
    WHERE t.campaign_id = c.id
      AND t.target_type = 'PROJECT'
      AND t.target_id = c.project_id
      AND COALESCE(t.is_excluded, false) = false
      AND t.deleted_at IS NULL
  )
ON CONFLICT (campaign_id, target_type, target_id) DO UPDATE
SET
  is_excluded = false,
  sort_order = LEAST(public.v2_campaign_targets.sort_order, 0),
  source_type = EXCLUDED.source_type,
  source_id = EXCLUDED.source_id,
  source_snapshot_json = EXCLUDED.source_snapshot_json,
  metadata = COALESCE(public.v2_campaign_targets.metadata, '{}'::jsonb) || jsonb_build_object(
    'updated_by', '20260328110000_v2_campaign_project_scope_hardening.sql'
  ),
  deleted_at = NULL,
  updated_at = NOW();

-- 4) Suspend invalid ACTIVE ALWAYS_ON campaigns that still do not resolve to a project.
UPDATE public.v2_campaigns c
SET
  status = 'SUSPENDED',
  metadata = COALESCE(c.metadata, '{}'::jsonb) || jsonb_build_object(
    'always_on_scope_hardening_reason', 'project_scope_unresolved',
    'always_on_scope_hardening_updated_by', '20260328110000_v2_campaign_project_scope_hardening.sql'
  ),
  updated_at = NOW()
WHERE c.deleted_at IS NULL
  AND c.campaign_type = 'ALWAYS_ON'
  AND c.status = 'ACTIVE'
  AND c.project_id IS NULL;

-- 5) Keep one ACTIVE ALWAYS_ON campaign per project (most recently updated wins).
WITH ranked_active_always_on AS (
  SELECT
    c.id,
    ROW_NUMBER() OVER (
      PARTITION BY c.project_id
      ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC
    ) AS rank_order
  FROM public.v2_campaigns c
  WHERE c.deleted_at IS NULL
    AND c.campaign_type = 'ALWAYS_ON'
    AND c.status = 'ACTIVE'
    AND c.project_id IS NOT NULL
)
UPDATE public.v2_campaigns c
SET
  status = 'SUSPENDED',
  metadata = COALESCE(c.metadata, '{}'::jsonb) || jsonb_build_object(
    'always_on_scope_hardening_reason', 'duplicate_active_project_scope',
    'always_on_scope_hardening_updated_by', '20260328110000_v2_campaign_project_scope_hardening.sql'
  ),
  updated_at = NOW()
FROM ranked_active_always_on r
WHERE c.id = r.id
  AND r.rank_order > 1;

-- 6) Enforce core invariants.
ALTER TABLE public.v2_campaigns
  DROP CONSTRAINT IF EXISTS v2_campaigns_always_on_active_requires_project;

ALTER TABLE public.v2_campaigns
  ADD CONSTRAINT v2_campaigns_always_on_active_requires_project
  CHECK (
    campaign_type <> 'ALWAYS_ON'
    OR status <> 'ACTIVE'
    OR project_id IS NOT NULL
  ) NOT VALID;

ALTER TABLE public.v2_campaigns
  VALIDATE CONSTRAINT v2_campaigns_always_on_active_requires_project;

CREATE UNIQUE INDEX IF NOT EXISTS uq_v2_campaigns_active_always_on_project
  ON public.v2_campaigns(project_id)
  WHERE campaign_type = 'ALWAYS_ON'
    AND status = 'ACTIVE'
    AND deleted_at IS NULL
    AND project_id IS NOT NULL;

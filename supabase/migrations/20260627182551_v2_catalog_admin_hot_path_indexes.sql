-- Composite partial indexes for v2 catalog admin list and bulk-map hot paths.

CREATE INDEX IF NOT EXISTS idx_v2_products_project_active_sort
  ON public.v2_products (project_id, sort_order, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_products_project_status_active_sort
  ON public.v2_products (project_id, status, sort_order, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_product_variants_product_active_created
  ON public.v2_product_variants (product_id, created_at, id)
  INCLUDE (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_product_media_product_active_sort
  ON public.v2_product_media (product_id, sort_order, created_at, id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_v2_product_media_cover_candidates
  ON public.v2_product_media (product_id, sort_order, created_at, id)
  WHERE deleted_at IS NULL
    AND status = 'ACTIVE'
    AND (is_primary = true OR media_role = 'PRIMARY');

CREATE INDEX IF NOT EXISTS idx_v2_campaign_targets_campaign_active_sort
  ON public.v2_campaign_targets (campaign_id, sort_order, created_at, id)
  INCLUDE (is_excluded)
  WHERE deleted_at IS NULL;

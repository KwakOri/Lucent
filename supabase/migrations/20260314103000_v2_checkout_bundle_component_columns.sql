-- V2 Checkout bundle component allocation columns
-- Created: 2026-03-14
-- Description: add component snapshot/allocation fields to v2_order_items

ALTER TABLE public.v2_order_items
  ADD COLUMN IF NOT EXISTS bundle_component_id_snapshot UUID
  REFERENCES public.v2_bundle_components(id)
  ON DELETE SET NULL;

ALTER TABLE public.v2_order_items
  ADD COLUMN IF NOT EXISTS allocated_unit_amount INTEGER;

ALTER TABLE public.v2_order_items
  ADD COLUMN IF NOT EXISTS allocated_discount_amount INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  ALTER TABLE public.v2_order_items
    ADD CONSTRAINT v2_order_items_allocated_amounts_valid
    CHECK (
      (allocated_unit_amount IS NULL OR allocated_unit_amount >= 0)
      AND allocated_discount_amount >= 0
    );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_v2_order_items_bundle_component_id_snapshot
  ON public.v2_order_items(bundle_component_id_snapshot);

COMMENT ON COLUMN public.v2_order_items.bundle_component_id_snapshot IS
  'Resolved bundle component snapshot id for BUNDLE_COMPONENT line';
COMMENT ON COLUMN public.v2_order_items.allocated_unit_amount IS
  'Allocated unit amount for bundle component line';
COMMENT ON COLUMN public.v2_order_items.allocated_discount_amount IS
  'Allocated rounding adjustment amount for bundle component line';

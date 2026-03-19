-- Add product-level fulfillment type for STANDARD products

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'v2_products'
      AND column_name = 'fulfillment_type'
  ) THEN
    ALTER TABLE public.v2_products
      ADD COLUMN fulfillment_type v2_fulfillment_type_enum;
  END IF;
END $$;

WITH picked_variant AS (
  SELECT DISTINCT ON (variant.product_id)
    variant.product_id,
    variant.fulfillment_type
  FROM public.v2_product_variants variant
  WHERE variant.deleted_at IS NULL
  ORDER BY
    variant.product_id,
    CASE WHEN variant.status = 'ACTIVE' THEN 0 ELSE 1 END,
    variant.created_at ASC
)
UPDATE public.v2_products product
SET fulfillment_type = picked_variant.fulfillment_type
FROM picked_variant
WHERE product.id = picked_variant.product_id
  AND product.product_kind = 'STANDARD'
  AND product.fulfillment_type IS NULL;

-- Change products.artist_id to products.project_id
-- Products should belong to projects, not artists
-- Created: 2025-12-31

-- Step 1: Drop existing constraints and indexes
ALTER TABLE products
DROP CONSTRAINT IF EXISTS products_artist_id_fkey,
DROP CONSTRAINT IF EXISTS products_slug_artist_unique;

DROP INDEX IF EXISTS idx_products_artist_id;

-- Step 2: Rename column from artist_id to project_id
ALTER TABLE products
RENAME COLUMN artist_id TO project_id;

-- Step 3: Convert existing values from legacy artist_id to project_id
UPDATE products p
SET project_id = a.project_id
FROM artists a
WHERE p.project_id = a.id;

-- Step 4: Add new foreign key constraint
ALTER TABLE products
ADD CONSTRAINT products_project_id_fkey
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Step 5: Add new unique constraint for slug
ALTER TABLE products
ADD CONSTRAINT products_slug_project_unique UNIQUE (project_id, slug);

-- Step 6: Create new index
CREATE INDEX idx_products_project_id ON products(project_id);

-- Update column comment
COMMENT ON COLUMN products.project_id IS '프로젝트 ID (products는 project에 속함)';

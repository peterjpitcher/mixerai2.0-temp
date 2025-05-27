-- Migration to rename global_claim_brands to master_claim_brands and related columns.
-- This script should run BEFORE the seed data script that uses these tables/columns.

BEGIN;

-- 1. Rename table global_claim_brands to master_claim_brands
ALTER TABLE public.global_claim_brands RENAME TO master_claim_brands;

-- 2. Rename foreign key column in 'products' table and update its unique constraint
-- First, drop the old unique constraint if it was named based on the old column name
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_name_global_brand_id_key;

-- Rename the column
ALTER TABLE public.products RENAME COLUMN global_brand_id TO master_brand_id;

-- Add the unique constraint with the new column name
-- This assumes the desired constraint is on (name, master_brand_id)
ALTER TABLE public.products ADD CONSTRAINT products_name_master_brand_id_key UNIQUE (name, master_brand_id);

-- 3. Rename foreign key column in 'claims' table
ALTER TABLE public.claims RENAME COLUMN global_brand_id TO master_brand_id;

-- 4. Update comments (optional but good for schema clarity)
COMMENT ON TABLE public.master_claim_brands IS 'Stores master brand entities for claims management. (Renamed from global_claim_brands)';
COMMENT ON COLUMN public.products.master_brand_id IS 'Foreign key referencing the master_claim_brands(id) this product belongs to. (Renamed from global_brand_id)';
COMMENT ON COLUMN public.claims.master_brand_id IS 'FK to master_claim_brands(id) if claim is at brand level. (Renamed from global_brand_id)';

-- Note on Foreign Key Constraints:
-- PostgreSQL typically renames the foreign key constraints automatically when the referenced table or columns are renamed.
-- If you have explicitly named FK constraints that include 'global_brand_id' or 'global_claim_brands' in their names,
-- you might want to rename them manually for consistency after this migration using:
-- ALTER TABLE public.products RENAME CONSTRAINT <old_fk_name> TO <new_fk_name>;
-- ALTER TABLE public.claims RENAME CONSTRAINT <old_fk_name> TO <new_fk_name>;

-- Note on Check Constraints in 'claims' table:
-- The chk_claim_level_reference constraint, if defined using the column name global_brand_id,
-- should also have its definition updated automatically upon column rename.
-- The CLAIMS_MANAGEMENT.md file already reflects this updated check constraint definition.

COMMIT; 
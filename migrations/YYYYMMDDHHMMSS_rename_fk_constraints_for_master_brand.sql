BEGIN;

-- Rename foreign key constraint on claims table
ALTER TABLE public.claims
DROP CONSTRAINT IF EXISTS claims_global_brand_id_fkey,
ADD CONSTRAINT claims_master_brand_id_fkey
  FOREIGN KEY (master_brand_id)
  REFERENCES public.master_claim_brands(id)
  ON DELETE SET NULL;

-- Rename foreign key constraint on products table
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_global_brand_id_fkey,
ADD CONSTRAINT products_master_brand_id_fkey
  FOREIGN KEY (master_brand_id)
  REFERENCES public.master_claim_brands(id)
  ON DELETE CASCADE;

-- Note: If the original constraints were named differently (e.g. by Supabase default naming),
-- you might need to find the actual constraint names first using a query like:
-- SELECT conname
-- FROM pg_constraint
-- WHERE conrelid = 'public.claims'::regclass
-- AND confrelid = 'public.master_claim_brands'::regclass;
-- And then use those names in the DROP CONSTRAINT statements.
-- This script assumes they were named claims_global_brand_id_fkey and products_global_brand_id_fkey respectively.

COMMIT; 
-- Migration to add master_claim_brand_id to brands table

-- Add the master_claim_brand_id column to the brands table
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS master_claim_brand_id UUID;

-- Add a foreign key constraint to master_claim_brands table
-- This assumes master_claim_brands table already exists.
-- If master_claim_brands might not exist, this part would need to be conditional or run after master_claim_brands is created.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'master_claim_brands' AND table_schema = 'public') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE table_name = 'brands' AND constraint_name = 'fk_brands_master_claim_brand'
    ) THEN
      ALTER TABLE public.brands
      ADD CONSTRAINT fk_brands_master_claim_brand
      FOREIGN KEY (master_claim_brand_id)
      REFERENCES public.master_claim_brands(id)
      ON DELETE SET NULL;
    END IF;
  ELSE
    RAISE NOTICE 'Table master_claim_brands does not exist. Skipping FK constraint creation for brands.master_claim_brand_id.';
  END IF;
END $$;

-- Optional: Add an index for performance if frequently queried
CREATE INDEX IF NOT EXISTS idx_brands_master_claim_brand_id ON public.brands(master_claim_brand_id); 
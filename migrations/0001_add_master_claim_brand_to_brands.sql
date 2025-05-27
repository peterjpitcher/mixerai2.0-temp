ALTER TABLE public.brands
ADD COLUMN master_claim_brand_id UUID NULL,
ADD CONSTRAINT fk_master_claim_brand
  FOREIGN KEY (master_claim_brand_id)
  REFERENCES public.master_claim_brands (id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.brands.master_claim_brand_id IS 'Foreign key to the master_claim_brands table, linking a brand to its corresponding master claim brand for claims management.'; 
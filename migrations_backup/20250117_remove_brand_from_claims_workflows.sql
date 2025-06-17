-- Migration: Remove Brand Association from Claims Workflows
-- Description: Claims workflows should be global and not associated with specific brands
-- Date: 2025-01-17

-- First, drop the unique constraint that includes brand_id
ALTER TABLE public.claims_workflows 
DROP CONSTRAINT IF EXISTS claims_workflows_name_brand_id_key;

-- Make brand_id nullable
ALTER TABLE public.claims_workflows 
ALTER COLUMN brand_id DROP NOT NULL;

-- Add a new unique constraint on name only (global uniqueness)
ALTER TABLE public.claims_workflows 
ADD CONSTRAINT claims_workflows_name_key UNIQUE(name);

-- Update the comment
COMMENT ON COLUMN public.claims_workflows.brand_id IS 'Optional brand association - claims workflows are typically global';

-- For existing workflows, you might want to set brand_id to NULL
-- UPDATE public.claims_workflows SET brand_id = NULL;
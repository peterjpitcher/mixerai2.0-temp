-- Migration: Remove Old Content Types System

BEGIN;

-- 1. Drop Foreign Key Constraints
ALTER TABLE public.content DROP CONSTRAINT IF EXISTS content_content_type_id_fkey;
ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_content_type_id_fkey;

-- 2. Drop Unique Constraint from workflows Table
-- Note: The exact name of this constraint might vary. 
-- 'workflows_brand_id_content_type_id_key' is a common pattern for UNIQUE(brand_id, content_type_id).
-- Please verify from your schema or pg_catalog.pg_constraint if this fails.
ALTER TABLE public.workflows DROP CONSTRAINT IF EXISTS workflows_brand_id_content_type_id_key;

-- 3. Drop Columns from Dependent Tables
ALTER TABLE public.content DROP COLUMN IF EXISTS content_type_id;
ALTER TABLE public.workflows DROP COLUMN IF EXISTS content_type_id;
ALTER TABLE public.brands DROP COLUMN IF EXISTS approved_content_types;

-- 4. Drop Row Level Security (RLS) Policies for content_types
DROP POLICY IF EXISTS content_types_view_policy ON public.content_types;
DROP POLICY IF EXISTS content_types_modify_policy ON public.content_types;
DROP POLICY IF EXISTS "Admins can manage content types" ON public.content_types;
-- Add any other RLS policies specific to content_types here if they exist

-- 5. Drop Trigger for content_types
DROP TRIGGER IF EXISTS update_content_types_modtime ON public.content_types;

-- 6. Drop content_types Table
DROP TABLE IF EXISTS public.content_types;

COMMIT; 
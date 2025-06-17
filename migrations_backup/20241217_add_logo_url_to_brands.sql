-- Migration: Add logo_url column to brands table
-- Description: Adds logo_url column for storing brand logo image URLs
-- Date: 2024-12-17

-- Add logo_url column to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment
COMMENT ON COLUMN public.brands.logo_url IS 'URL to brand logo image stored in Supabase Storage or external URL';

-- Update the updated_at timestamp for existing records (optional)
-- UPDATE public.brands SET updated_at = NOW() WHERE logo_url IS NULL;
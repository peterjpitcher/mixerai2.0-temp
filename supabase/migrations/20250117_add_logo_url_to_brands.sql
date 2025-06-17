-- Migration: Add logo_url column to brands table
-- Description: Adds logo_url column for storing brand logo image URLs
-- Date: 2025-01-17

-- Add logo_url column to brands table
ALTER TABLE public.brands 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment
COMMENT ON COLUMN public.brands.logo_url IS 'URL to brand logo image stored in Supabase Storage or external URL';
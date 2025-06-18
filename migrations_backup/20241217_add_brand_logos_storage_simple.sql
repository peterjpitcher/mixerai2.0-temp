-- Migration: Add Brand Logos Storage Bucket (Simplified)
-- Description: Creates storage bucket for brand logos
-- Date: 2024-12-17

-- Create brand-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-logos', 'brand-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies need to be created via Supabase Dashboard or API
-- as they require special permissions not available in regular migrations.
-- 
-- Recommended policies:
-- 1. Brand admins can upload/update/delete logos for their brands
-- 2. Public read access for all brand logos

-- Add comment
COMMENT ON COLUMN public.brands.logo_url IS 'URL to brand logo image stored in Supabase Storage';
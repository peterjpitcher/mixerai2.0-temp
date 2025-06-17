-- Migration: Add Brand Logos Storage Bucket
-- Description: Creates storage bucket for brand logos and sets up policies
-- Date: 2024-12-17

-- Create brand-logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'brand-logos',
  'brand-logos',
  true, -- Public bucket for brand logos
  false,
  10485760, -- 10MB limit (larger for high-res logos)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Policy: Brand admins can upload logos for their brands
CREATE POLICY "Brand admins can upload logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM public.user_brand_permissions
    WHERE user_id = auth.uid()
    AND brand_id::text = split_part(storage.filename(name), '-', 1)
    AND role = 'admin'
  )
);

-- Policy: Brand admins can update logos for their brands
CREATE POLICY "Brand admins can update logos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM public.user_brand_permissions
    WHERE user_id = auth.uid()
    AND brand_id::text = split_part(storage.filename(name), '-', 1)
    AND role = 'admin'
  )
);

-- Policy: Brand admins can delete logos for their brands
CREATE POLICY "Brand admins can delete logos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM public.user_brand_permissions
    WHERE user_id = auth.uid()
    AND brand_id::text = split_part(storage.filename(name), '-', 1)
    AND role = 'admin'
  )
);

-- Policy: Anyone can view brand logos (public bucket)
CREATE POLICY "Anyone can view brand logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'brand-logos');

-- Add comment
COMMENT ON COLUMN public.brands.logo_url IS 'URL to brand logo image stored in Supabase Storage';
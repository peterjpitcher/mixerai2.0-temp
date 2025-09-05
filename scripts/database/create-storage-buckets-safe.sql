-- Create Storage Buckets for MixerAI (Safe Version)
-- This script checks for existing objects before creating them
-- Run this script in your Supabase SQL editor

-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Create brand-logos bucket  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-logos',
  'brand-logos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

-- Drop existing policies if they exist (to recreate with correct conditions)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to brand logos" ON storage.objects;

-- Create RLS policies for avatars bucket
-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (string_to_array(name, '/'))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Public read access to avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Create RLS policies for brand-logos bucket
-- Allow authenticated users to upload brand logos
CREATE POLICY "Authenticated users can upload brand logos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-logos');

-- Allow authenticated users to update brand logos
CREATE POLICY "Authenticated users can update brand logos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'brand-logos');

-- Allow authenticated users to delete brand logos
CREATE POLICY "Authenticated users can delete brand logos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'brand-logos');

-- Allow public read access to brand logos
CREATE POLICY "Public read access to brand logos" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'brand-logos');

-- Verify buckets were created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('avatars', 'brand-logos');

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
AND policyname LIKE '%avatar%' OR policyname LIKE '%brand logo%'
ORDER BY policyname;
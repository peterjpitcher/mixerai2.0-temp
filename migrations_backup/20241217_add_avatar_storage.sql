-- Migration: Add Avatar Storage Bucket
-- Description: Creates storage bucket for user avatars and sets up policies
-- Date: 2024-12-17

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- Public bucket for avatar images
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Policy: Users can upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = 'avatars' AND
  auth.uid()::text = split_part(storage.filename(name), '-', 1)
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(storage.filename(name), '-', 1)
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = split_part(storage.filename(name), '-', 1)
);

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Add comment
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile avatar image stored in Supabase Storage';
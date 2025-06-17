-- Migration: Add Avatar Storage Bucket (Simplified)
-- Description: Creates storage bucket for user avatars
-- Date: 2024-12-17

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Note: Storage policies need to be created via Supabase Dashboard or API
-- as they require special permissions not available in regular migrations.
-- 
-- Recommended policies:
-- 1. Users can upload/update/delete their own avatars (check user ID in filename)
-- 2. Public read access for all avatars

-- Add comment
COMMENT ON COLUMN public.profiles.avatar_url IS 'URL to user profile avatar image stored in Supabase Storage';
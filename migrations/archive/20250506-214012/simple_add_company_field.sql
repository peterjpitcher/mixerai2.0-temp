-- Simple migration to add the company field to profiles table
-- This can be run directly with psql

-- Add company column to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;

-- Update existing profiles with company information from user metadata if available
UPDATE profiles p
SET company = auth.users.raw_user_meta_data->>'company'
FROM auth.users
WHERE p.id = auth.users.id
AND auth.users.raw_user_meta_data->>'company' IS NOT NULL; 
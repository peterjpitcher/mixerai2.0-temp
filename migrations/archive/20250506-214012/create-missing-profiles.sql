-- Script to create missing profiles for existing auth.users
-- This will fix the mismatch before adding foreign key constraints

-- First, backup any existing profiles data (just in case)
CREATE TABLE IF NOT EXISTS profiles_backup AS 
SELECT * FROM public.profiles;

DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  -- Count how many users are missing profiles
  SELECT COUNT(*)
  INTO missing_count
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;
  
  RAISE NOTICE 'Found % auth.users without matching profiles', missing_count;
  
  -- Create profiles for users that don't have them
  INSERT INTO public.profiles (id, full_name, avatar_url, email, created_at, updated_at)
  SELECT 
    u.id, 
    COALESCE(u.raw_user_meta_data->>'full_name', 'User ' || u.email), 
    COALESCE(u.raw_user_meta_data->>'avatar_url', NULL),
    u.email,
    u.created_at,
    u.updated_at
  FROM auth.users u
  LEFT JOIN public.profiles p ON u.id = p.id
  WHERE p.id IS NULL;
  
  -- Check how many were inserted
  RAISE NOTICE 'Created % new profile records', missing_count;
END $$;

-- Now check if we have any remaining mismatches
SELECT COUNT(*) AS remaining_missing_profiles
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Verify the newly created profiles
SELECT p.id, p.full_name, p.email, u.email AS auth_email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 5; 
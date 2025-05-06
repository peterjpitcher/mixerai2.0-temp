-- Script to handle orphaned profile records
-- This will address the specific profile causing the foreign key error

-- First, back up the orphaned profiles in case we need them later
CREATE TABLE IF NOT EXISTS orphaned_profiles_backup AS
SELECT * FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Confirm what we're about to remove
SELECT COUNT(*) AS orphaned_profiles_count FROM orphaned_profiles_backup;

-- Now delete the orphaned profiles that don't have auth.users entries
DELETE FROM public.profiles
WHERE id IN (
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN auth.users u ON p.id = u.id
    WHERE u.id IS NULL
);

-- Specifically confirm the problematic profile was removed
SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = '00000000-0000-0000-0000-000000000001'
) AS problem_profile_still_exists;

-- Double-check that no orphaned profiles remain
SELECT COUNT(*) AS remaining_orphaned_profiles
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL; 
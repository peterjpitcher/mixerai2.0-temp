-- Script to identify profiles that don't have matching auth.users entries
-- Run this to diagnose the foreign key constraint error

-- Find profiles without matching auth.users entries
SELECT p.id, p.full_name, p.email
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Count how many profiles have this issue
SELECT COUNT(*)
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.id IS NULL;

-- Look for auth.users entries without profiles
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
LIMIT 10; 
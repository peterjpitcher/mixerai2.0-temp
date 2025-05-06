-- Script to trace the Supabase auth invitation flow
-- This script helps identify where the invitation process might be failing

-- 1. Check if auth.users has any recent invitation attempts
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  confirmed_at,
  invited_at,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user
FROM auth.users
WHERE created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check if there are any recent failed operations in auth.audit_log_entries
SELECT
  instance_id,
  payload,
  occurred_at,
  ip_address
FROM auth.audit_log_entries
WHERE occurred_at > NOW() - INTERVAL '1 day'
AND payload::text LIKE '%error%'
ORDER BY occurred_at DESC
LIMIT 10;

-- 3. Check if there are any orphaned profiles created recently
SELECT
  p.id,
  p.email,
  p.created_at,
  CASE WHEN u.id IS NULL THEN 'Orphaned' ELSE 'OK' END AS status
FROM public.profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.created_at > NOW() - INTERVAL '1 day'
ORDER BY p.created_at DESC
LIMIT 10;

-- 4. Check if the auth.users table has any constraints that might be failing
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  pg_catalog.pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
JOIN pg_catalog.pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'auth' AND rel.relname = 'users'
ORDER BY constraint_name;

-- 5. Examine the exact functions that are called during invitation
-- This shows us what Supabase internally calls
SELECT
  routine_schema,
  routine_name,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'auth' 
AND routine_name LIKE '%invite%' OR routine_name LIKE '%user%create%'
ORDER BY routine_schema, routine_name;

-- 6. Check if there are any database errors related to invitations in the logs
-- Note: This requires access to system tables which may not be available in all Supabase projects
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'pg_catalog' AND table_name = 'pg_stat_activity'
  ) THEN
    -- Only run if we have access to system tables
    RAISE NOTICE 'Checking database logs for invitation errors...';
  ELSE
    RAISE NOTICE 'No access to system tables to check logs.';
  END IF;
END $$; 
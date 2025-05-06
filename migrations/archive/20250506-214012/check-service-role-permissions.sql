-- Script to check if the service role has proper permissions for user invitations
-- Run this in Supabase SQL Editor to verify permissions

-- Check if we have permission to query the auth schema
SELECT
  has_schema_privilege(current_user, 'auth', 'USAGE') AS can_use_auth_schema,
  has_schema_privilege(current_user, 'public', 'USAGE') AS can_use_public_schema;

-- Check specific table permissions for auth.users
SELECT
  has_table_privilege(current_user, 'auth.users', 'SELECT') AS can_select_auth_users,
  has_table_privilege(current_user, 'auth.users', 'INSERT') AS can_insert_auth_users,
  has_table_privilege(current_user, 'auth.users', 'UPDATE') AS can_update_auth_users;

-- Check permissions for profiles table
SELECT
  has_table_privilege(current_user, 'public.profiles', 'SELECT') AS can_select_profiles,
  has_table_privilege(current_user, 'public.profiles', 'INSERT') AS can_insert_profiles,
  has_table_privilege(current_user, 'public.profiles', 'UPDATE') AS can_update_profiles;

-- Check if we can use our insert_user_manually function
SELECT
  has_function_privilege(
    current_user,
    'insert_user_manually(uuid, text, text)',
    'EXECUTE'
  ) AS can_execute_insert_user_manually;

-- Get current role being used
SELECT current_user, current_setting('role');

-- Check if the service role can create users with the Supabase auth API
-- This test just checks permissions, it doesn't actually create a user
DO $$
BEGIN
  -- Check if we have the necessary permissions to call auth.create_user
  IF has_function_privilege(
      current_user,
      'auth.create_user(jsonb)',
      'EXECUTE'
    ) THEN
    RAISE NOTICE 'Service role CAN call auth.create_user function.';
  ELSE
    RAISE NOTICE 'Service role CANNOT call auth.create_user function.';
  END IF;
END $$; 
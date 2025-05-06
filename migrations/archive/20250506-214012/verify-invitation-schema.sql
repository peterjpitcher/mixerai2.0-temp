-- Supabase User Invitation System Schema Verification
-- This script checks for all required tables and fields for the user invitation system
-- and creates a report of any missing or incorrect schema components.

-- Create a temporary table to store diagnostic results
DROP TABLE IF EXISTS _invitation_system_diagnostics;
CREATE TEMP TABLE _invitation_system_diagnostics (
  check_id SERIAL PRIMARY KEY,
  check_type TEXT NOT NULL,
  check_name TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT,
  fix_sql TEXT
);

-- Function to record a diagnostic result
CREATE OR REPLACE FUNCTION _record_diagnostic(
  p_check_type TEXT,
  p_check_name TEXT,
  p_status TEXT,
  p_description TEXT DEFAULT NULL,
  p_fix_sql TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO _invitation_system_diagnostics (check_type, check_name, status, description, fix_sql)
  VALUES (p_check_type, p_check_name, p_status, p_description, p_fix_sql);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Check Auth Schema and Tables
-- =============================================

-- Check if auth schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    PERFORM _record_diagnostic('schema', 'auth_schema', 'OK', 'Auth schema exists');
  ELSE
    PERFORM _record_diagnostic('schema', 'auth_schema', 'ERROR', 'Auth schema does not exist', 
      'CREATE SCHEMA IF NOT EXISTS auth;');
  END IF;
END $$;

-- Check auth.users table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
  ) THEN
    PERFORM _record_diagnostic('table', 'auth.users', 'OK', 'auth.users table exists');
  ELSE
    PERFORM _record_diagnostic('table', 'auth.users', 'ERROR', 'auth.users table does not exist', 
      'Contact Supabase support as auth.users table is missing');
  END IF;
END $$;

-- Check auth.identities table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'identities'
  ) THEN
    PERFORM _record_diagnostic('table', 'auth.identities', 'OK', 'auth.identities table exists');
  ELSE
    PERFORM _record_diagnostic('table', 'auth.identities', 'ERROR', 'auth.identities table does not exist', 
      'Contact Supabase support as auth.identities table is missing');
  END IF;
END $$;

-- Check auth.instances table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'instances'
  ) THEN
    PERFORM _record_diagnostic('table', 'auth.instances', 'OK', 'auth.instances table exists');
  ELSE
    PERFORM _record_diagnostic('table', 'auth.instances', 'ERROR', 'auth.instances table does not exist', 
      'Contact Supabase support as auth.instances table is missing');
  END IF;
END $$;

-- Check required fields in auth.users
DO $$
DECLARE
  required_columns TEXT[] := ARRAY[
    'instance_id', 'id', 'aud', 'role', 'email', 'encrypted_password', 
    'email_confirmed_at', 'invited_at', 'confirmation_token',
    'confirmation_sent_at', 'recovery_token', 'recovery_sent_at',
    'email_change_token_new', 'email_change', 'email_change_sent_at',
    'last_sign_in_at', 'raw_app_meta_data', 'raw_user_meta_data',
    'is_super_admin', 'created_at', 'updated_at', 'phone',
    'phone_confirmed_at', 'phone_change', 'phone_change_token',
    'phone_change_sent_at', 'confirmed_at', 'email_change_token_current',
    'banned_until', 'reauthentication_token', 'reauthentication_sent_at'
  ];
  missing_columns TEXT[] := '{}';
  col TEXT;
BEGIN
  FOREACH col IN ARRAY required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) IS NULL THEN
    PERFORM _record_diagnostic('columns', 'auth.users_columns', 'OK', 'All required columns exist in auth.users');
  ELSE
    PERFORM _record_diagnostic('columns', 'auth.users_columns', 'ERROR', 
      'Missing columns in auth.users: ' || array_to_string(missing_columns, ', '), 
      'Contact Supabase support as auth.users is missing required columns');
  END IF;
END $$;

-- Check required fields in auth.identities
DO $$
DECLARE
  required_columns TEXT[] := ARRAY[
    'id', 'user_id', 'identity_data', 'provider', 'last_sign_in_at',
    'created_at', 'updated_at'
  ];
  missing_columns TEXT[] := '{}';
  col TEXT;
BEGIN
  FOREACH col IN ARRAY required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'identities' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) IS NULL THEN
    PERFORM _record_diagnostic('columns', 'auth.identities_columns', 'OK', 'All required columns exist in auth.identities');
  ELSE
    PERFORM _record_diagnostic('columns', 'auth.identities_columns', 'ERROR', 
      'Missing columns in auth.identities: ' || array_to_string(missing_columns, ', '), 
      'Contact Supabase support as auth.identities is missing required columns');
  END IF;
END $$;

-- Check required fields in auth.instances
DO $$
DECLARE
  required_columns TEXT[] := ARRAY[
    'id', 'uuid', 'raw_base_config', 'created_at', 'updated_at'
  ];
  missing_columns TEXT[] := '{}';
  col TEXT;
BEGIN
  FOREACH col IN ARRAY required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'auth' AND table_name = 'instances' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  IF array_length(missing_columns, 1) IS NULL THEN
    PERFORM _record_diagnostic('columns', 'auth.instances_columns', 'OK', 'All required columns exist in auth.instances');
  ELSE
    PERFORM _record_diagnostic('columns', 'auth.instances_columns', 'ERROR', 
      'Missing columns in auth.instances: ' || array_to_string(missing_columns, ', '), 
      'Contact Supabase support as auth.instances is missing required columns');
  END IF;
END $$;

-- =============================================
-- Check Public Schema and Tables
-- =============================================

-- Check public schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'public') THEN
    PERFORM _record_diagnostic('schema', 'public_schema', 'OK', 'Public schema exists');
  ELSE
    PERFORM _record_diagnostic('schema', 'public_schema', 'ERROR', 'Public schema does not exist', 
      'CREATE SCHEMA IF NOT EXISTS public;');
  END IF;
END $$;

-- Check profiles table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    PERFORM _record_diagnostic('table', 'public.profiles', 'OK', 'profiles table exists');
  ELSE
    PERFORM _record_diagnostic('table', 'public.profiles', 'ERROR', 'profiles table does not exist', 
      'CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        full_name TEXT,
        avatar_url TEXT,
        job_title TEXT,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );');
  END IF;
END $$;

-- Check required fields in profiles
DO $$
DECLARE
  required_columns TEXT[] := ARRAY[
    'id', 'full_name', 'avatar_url', 'created_at', 'updated_at', 'email'
  ];
  important_columns TEXT[] := ARRAY['job_title'];
  missing_columns TEXT[] := '{}';
  missing_important_columns TEXT[] := '{}';
  col TEXT;
  fix_sql TEXT := '';
BEGIN
  -- Check required columns
  FOREACH col IN ARRAY required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = col
    ) THEN
      missing_columns := array_append(missing_columns, col);
    END IF;
  END LOOP;
  
  -- Check important columns (not required but should be there)
  FOREACH col IN ARRAY important_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = col
    ) THEN
      missing_important_columns := array_append(missing_important_columns, col);
      -- Prepare SQL to add this column
      IF col = 'job_title' THEN
        fix_sql := fix_sql || 'ALTER TABLE public.profiles ADD COLUMN job_title TEXT;\n';
      END IF;
    END IF;
  END LOOP;
  
  -- Record diagnostics
  IF array_length(missing_columns, 1) IS NULL THEN
    PERFORM _record_diagnostic('columns', 'public.profiles_required_columns', 'OK', 'All required columns exist in profiles');
  ELSE
    PERFORM _record_diagnostic('columns', 'public.profiles_required_columns', 'ERROR', 
      'Missing required columns in profiles: ' || array_to_string(missing_columns, ', '), 
      'Add missing columns to profiles table');
  END IF;
  
  -- Record non-critical missing columns
  IF array_length(missing_important_columns, 1) IS NULL THEN
    PERFORM _record_diagnostic('columns', 'public.profiles_important_columns', 'OK', 'All important columns exist in profiles');
  ELSE
    PERFORM _record_diagnostic('columns', 'public.profiles_important_columns', 'WARNING', 
      'Missing important columns in profiles: ' || array_to_string(missing_important_columns, ', '), 
      fix_sql);
  END IF;
END $$;

-- =============================================
-- Check Critical Functions
-- =============================================

-- Check for the sync_user_email function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'sync_user_email'
  ) THEN
    PERFORM _record_diagnostic('function', 'sync_user_email', 'OK', 'sync_user_email function exists');
  ELSE
    PERFORM _record_diagnostic('function', 'sync_user_email', 'WARNING', 'sync_user_email function does not exist', 
      'CREATE OR REPLACE FUNCTION sync_user_email()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only proceed if email has changed to avoid unnecessary updates
        IF NEW.email IS DISTINCT FROM OLD.email THEN
          -- Avoid errors if profile doesn''t exist yet
          IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
            UPDATE public.profiles
            SET 
              email = NEW.email,
              updated_at = NOW()
            WHERE id = NEW.id;
          END IF;
        END IF;
        
        -- Always return NEW to ensure trigger doesn''t block operation
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;');
  END IF;
END $$;

-- Check for the sync_user_email trigger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'sync_user_email_trigger'
  ) THEN
    PERFORM _record_diagnostic('trigger', 'sync_user_email_trigger', 'OK', 'sync_user_email_trigger exists');
  ELSE
    PERFORM _record_diagnostic('trigger', 'sync_user_email_trigger', 'WARNING', 'sync_user_email_trigger does not exist', 
      'DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
      CREATE TRIGGER sync_user_email_trigger
      AFTER UPDATE OF email ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION sync_user_email();');
  END IF;
END $$;

-- =============================================
-- Check Database Permissions
-- =============================================

-- Check if the current role has permissions to access auth schema
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM auth.users LIMIT 1;
    PERFORM _record_diagnostic('permissions', 'auth_schema_access', 'OK', 'Current role has access to auth schema');
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM _record_diagnostic('permissions', 'auth_schema_access', 'ERROR', 
        'Current role does not have permission to access auth schema', 
        'Make sure service role has proper permissions to auth schema');
    WHEN undefined_table THEN
      PERFORM _record_diagnostic('permissions', 'auth_schema_access', 'ERROR', 
        'auth.users table does not exist', 
        'Contact Supabase support as auth schema setup is incorrect');
  END;
END $$;

-- =============================================
-- Check Default Instance
-- =============================================

-- Check if auth.instances has at least one row
DO $$
DECLARE
  instance_count INTEGER;
BEGIN
  BEGIN
    SELECT COUNT(*) INTO instance_count FROM auth.instances;
    
    IF instance_count > 0 THEN
      PERFORM _record_diagnostic('data', 'auth_instance_exists', 'OK', 
        'Auth instance exists (' || instance_count || ' found)');
    ELSE
      PERFORM _record_diagnostic('data', 'auth_instance_exists', 'ERROR', 
        'No auth instances found in auth.instances table', 
        'Contact Supabase support as auth configuration is missing');
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM _record_diagnostic('data', 'auth_instance_exists', 'ERROR', 
        'Cannot check auth.instances due to permission issues', 
        'Make sure service role has proper permissions');
    WHEN undefined_table THEN
      PERFORM _record_diagnostic('data', 'auth_instance_exists', 'ERROR', 
        'auth.instances table does not exist', 
        'Contact Supabase support as auth schema setup is incorrect');
  END;
END $$;

-- =============================================
-- Check for Schema Drift
-- =============================================

-- Check if auth.users has additional constraint that might be causing issues
DO $$
DECLARE
  constraint_count INTEGER;
  constraint_list TEXT;
BEGIN
  BEGIN
    -- Count unique constraints on auth.users table
    SELECT COUNT(*), string_agg(constraint_name, ', ')
    INTO constraint_count, constraint_list
    FROM information_schema.table_constraints
    WHERE table_schema = 'auth' AND table_name = 'users'
    AND constraint_type IN ('UNIQUE', 'PRIMARY KEY');
    
    IF constraint_count > 0 THEN
      PERFORM _record_diagnostic('constraints', 'auth_users_constraints', 'INFO', 
        'auth.users has ' || constraint_count || ' unique/primary key constraints: ' || constraint_list);
    ELSE
      PERFORM _record_diagnostic('constraints', 'auth_users_constraints', 'WARNING', 
        'auth.users has no unique constraints, which is unusual',
        'Contact Supabase support as auth schema configuration is unusual');
    END IF;
  EXCEPTION
    WHEN insufficient_privilege THEN
      PERFORM _record_diagnostic('constraints', 'auth_users_constraints', 'ERROR', 
        'Cannot check constraints due to permission issues', 
        'Make sure service role has proper permissions');
  END;
END $$;

-- =============================================
-- Generate Final Report
-- =============================================

-- Report generation
DO $$
DECLARE
  total_checks INTEGER;
  ok_checks INTEGER;
  warning_checks INTEGER;
  error_checks INTEGER;
  fix_scripts TEXT := '';
  r RECORD;
BEGIN
  -- Count results by status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'OK'),
    COUNT(*) FILTER (WHERE status = 'WARNING'),
    COUNT(*) FILTER (WHERE status = 'ERROR')
  INTO
    total_checks, ok_checks, warning_checks, error_checks
  FROM _invitation_system_diagnostics;
  
  -- Generate fix scripts for issues
  FOR r IN SELECT * FROM _invitation_system_diagnostics WHERE status IN ('WARNING', 'ERROR') AND fix_sql IS NOT NULL ORDER BY check_type, check_name
  LOOP
    fix_scripts := fix_scripts || '-- Fix for ' || r.check_type || ': ' || r.check_name || ' (' || r.status || ')' || E'\n';
    fix_scripts := fix_scripts || r.fix_sql || E'\n\n';
  END LOOP;
  
  -- Display summary
  RAISE NOTICE E'\n=== INVITATION SYSTEM DIAGNOSTIC SUMMARY ===';
  RAISE NOTICE 'Total checks: % (% OK, % WARNING, % ERROR)', 
    total_checks, ok_checks, warning_checks, error_checks;
  
  -- Display detailed summary
  RAISE NOTICE E'\n=== DETAILED DIAGNOSTICS ===';
  FOR r IN SELECT * FROM _invitation_system_diagnostics ORDER BY 
    CASE status
      WHEN 'ERROR' THEN 1
      WHEN 'WARNING' THEN 2
      WHEN 'INFO' THEN 3
      WHEN 'OK' THEN 4
    END, check_type, check_name
  LOOP
    RAISE NOTICE '% - % (%) - %', 
      r.status, r.check_type, r.check_name, r.description;
  END LOOP;
  
  -- Display fix scripts if there are any warnings or errors
  IF warning_checks > 0 OR error_checks > 0 THEN
    RAISE NOTICE E'\n=== FIX SCRIPTS ===\n%', fix_scripts;
  END IF;
END $$;

-- Export diagnostics to table for later reference
DROP TABLE IF EXISTS invitation_system_diagnostics;
CREATE TABLE invitation_system_diagnostics AS 
SELECT *, NOW() as diagnosed_at FROM _invitation_system_diagnostics;

-- Drop temporary objects
DROP TABLE IF EXISTS _invitation_system_diagnostics;
DROP FUNCTION IF EXISTS _record_diagnostic;

-- Final message
DO $$
BEGIN
  RAISE NOTICE E'\nInvitation system diagnostic completed. Results saved to "invitation_system_diagnostics" table.';
  RAISE NOTICE 'To see only issues, run: SELECT * FROM invitation_system_diagnostics WHERE status IN (''ERROR'', ''WARNING'') ORDER BY status;';
END $$;

-- Diagnostic SQL Script for User Invitation System
-- Run this on your Supabase or PostgreSQL database to verify the schema

-- Check if auth schema and users table exists (Supabase specific)
SELECT EXISTS (
    SELECT FROM information_schema.schemata
    WHERE schema_name = 'auth'
) AS auth_schema_exists;

-- Check if auth.users table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'auth' AND table_name = 'users'
) AS auth_users_table_exists;

-- Check if profiles table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
) AS profiles_table_exists;

-- Check if profiles table has the correct columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' AND table_name = 'profiles'
ORDER BY 
    ordinal_position;

-- Check if profiles table reference to auth.users exists
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND tc.table_name = 'profiles'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users';

-- Check if user_role enum type exists
SELECT 
    typname, 
    typcategory
FROM 
    pg_type
WHERE 
    typname = 'user_role';

-- Check if content_status enum type exists
SELECT 
    typname, 
    typcategory
FROM 
    pg_type
WHERE 
    typname = 'content_status';

-- Check if service role has necessary permissions
SELECT 
    grantee, 
    table_schema, 
    table_name, 
    privilege_type
FROM 
    information_schema.role_table_grants
WHERE 
    grantee = current_user
    AND table_schema IN ('auth', 'public')
    AND table_name IN ('users', 'profiles', 'user_brand_permissions')
ORDER BY 
    table_schema, 
    table_name, 
    privilege_type;

-- Check service role permissions on auth schema
SELECT 
    grantee, 
    schema_name, 
    privilege_type
FROM 
    information_schema.role_usage_grants
WHERE 
    grantee = current_user
    AND schema_name = 'auth';

-- Check if any recent users were successfully created
SELECT 
    id, 
    email,
    created_at
FROM 
    auth.users
ORDER BY 
    created_at DESC
LIMIT 5;

-- Check invitation attempts in auth.audit_log_entries (Supabase specific)
SELECT 
    instance_id, 
    payload, 
    created_at,
    action
FROM 
    auth.audit_log_entries
WHERE 
    action = 'user_invite'
ORDER BY 
    created_at DESC
LIMIT 10;

-- Check email configuration status (Supabase specific)
SELECT 
    id, 
    mailer_settings::json
FROM 
    auth.config
LIMIT 1; 
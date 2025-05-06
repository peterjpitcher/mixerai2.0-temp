# MixerAI 2.0 Invitation System Troubleshooting

This document provides diagnostic queries and steps to troubleshoot the invitation system issues.

## Quick Diagnostic Queries

Run these in the Supabase SQL Editor to check your setup:

### 1. Check if the trigger exists

```sql
SELECT 
  tgname AS trigger_name, 
  proname AS function_name,
  tgenabled AS trigger_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY tgname;
```

### 2. Check for users without profiles

```sql
SELECT 
  u.id, 
  u.email, 
  u.created_at 
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

### 3. Create profiles for users that are missing them

```sql
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', u.email), 
  u.created_at, 
  u.updated_at
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

### 4. Check available functions

```sql
SELECT 
  n.nspname AS schema_name, 
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
  n.nspname = 'public' AND
  p.proname LIKE '%user%'
ORDER BY p.proname;
```

### 5. Manual User Insertion Test

If you need to manually insert a user as a test:

```sql
-- Try to create a test user manually
DO $$
DECLARE
  new_user_id UUID;
  test_email TEXT := 'test-user-' || floor(random() * 1000)::text || '@example.com';
  password_hash TEXT;
BEGIN
  -- Generate a random password hash
  password_hash := crypt('randompassword', gen_salt('bf'));
  
  -- Insert directly into auth.users
  INSERT INTO auth.users (
    email,
    email_confirmed_at,
    encrypted_password,
    raw_user_meta_data,
    created_at,
    updated_at,
    role
  ) VALUES (
    test_email,
    now(),
    password_hash,
    '{"full_name": "Test User", "role": "viewer", "job_title": "Tester"}',
    now(),
    now(),
    'authenticated'
  )
  RETURNING id INTO new_user_id;
  
  RAISE NOTICE 'Created user with email % and ID %', test_email, new_user_id;
  
  -- Check if profile was created automatically by trigger
  RAISE NOTICE 'Checking for automatically created profile...';
  PERFORM pg_sleep(1); -- Wait a moment for the trigger
  
  IF EXISTS (SELECT 1 FROM profiles WHERE id = new_user_id) THEN
    RAISE NOTICE 'Profile was created automatically by trigger';
  ELSE
    RAISE NOTICE 'Profile was NOT created automatically, inserting manually';
    
    -- Insert profile manually
    INSERT INTO profiles (
      id,
      email,
      full_name,
      created_at,
      updated_at
    ) VALUES (
      new_user_id,
      test_email,
      'Test User',
      now(),
      now()
    );
    
    RAISE NOTICE 'Manual profile creation complete';
  END IF;
  
  -- Clean up the test user to avoid cluttering the database
  DELETE FROM auth.users WHERE id = new_user_id;
  RAISE NOTICE 'Test user cleaned up';
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error: % - %', SQLERRM, SQLSTATE;
END $$;
```

## Direct Email Invitation Test

Try sending a direct invitation email:

```sql
-- This will only work if you have properly configured email in Supabase
SELECT * FROM auth.send_email(
  'test-invite@example.com',
  'invitation',
  '{"link": "https://your-app-url.com/auth/confirm?token=test-token", "full_name": "Test User", "role": "viewer"}'
);
```

## Common Issues and Solutions

### 1. Profile Trigger Not Working

If the profile creation trigger is not working:

```sql
-- Fix the trigger
DO $$
BEGIN
  -- Create the function
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    -- Skip if profile already exists (idempotent)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Insert a new profile
    INSERT INTO public.profiles (
      id, 
      full_name, 
      avatar_url, 
      email,
      created_at, 
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
      NEW.email,
      NEW.created_at,
      NEW.updated_at
    );
    
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;
  
  -- Create the trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user()';
  END IF;
END $$;
```

### 2. Permission Issues

If you're encountering permission issues when trying to insert into auth.users:

```sql
-- Check if your service role has the necessary permissions
SELECT pg_has_role(current_user, 'supabase_auth_admin', 'member');

-- If false, you need to contact Supabase support or use a different approach
-- as the service role needs to be added to the supabase_auth_admin role
```

### 3. Database Connection Issues

If there are database connection issues:

```sql
-- Test database connectivity
SELECT now() AS current_time;

-- Show database version
SELECT version();

-- Show connected user and role
SELECT 
  current_user AS connected_as,
  session_user AS session_as,
  current_database() AS database;
```

## Direct Access vs. RPC

For testing, it's sometimes easier to use direct SQL queries rather than RPC functions. If you're having issues with RPC functions, consider implementing the direct equivalent in your application code. 
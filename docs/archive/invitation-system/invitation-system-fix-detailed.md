# MixerAI 2.0 Invitation System: Comprehensive Fix Guide

This document provides a detailed explanation of the invitation system issues in MixerAI 2.0 and how to fix them.

## The Problem

When inviting users through the Supabase Auth system, the invitation fails with the error:

```
Database error saving new user
```

This error occurs because when a new user is created in the `auth.users` table, a corresponding record in the `profiles` table is not automatically created. Since the `profiles` table has a foreign key constraint referencing `auth.users`, this creates a data integrity issue.

## Root Causes

The invitation system failure has several potential root causes:

1. **Missing trigger:** The `on_auth_user_created` trigger that should automatically create profiles for new users is missing or disabled.

2. **Missing helper functions:** The API uses RPC functions that check for user existence and create profiles manually when the trigger fails.

3. **Permission issues:** The Supabase service role may not have sufficient permissions to execute some operations.

4. **Database inconsistency:** There may be users in `auth.users` without corresponding profiles, or vice versa.

## Complete Fix Implementation

### Step 1: Run Diagnostic Queries

Run the `migrations/diagnose-invitation-system.sql` script in the Supabase SQL Editor to identify specific issues:

```sql
-- Check if the profile creation trigger exists
SELECT 
  tgname AS trigger_name, 
  proname AS function_name,
  tgenabled AS enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY tgname;
```

### Step 2: Fix the Profile Creation Trigger

Run the `fix-invitation-trigger.sql` script to ensure the trigger is properly set up:

```sql
-- Create the function that will automatically create profiles when users are created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip if profile already exists (idempotent)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;
  
  -- Insert a new profile using data from the auth.users record
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

-- Create the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
```

### Step 3: Add Helper Functions

Run the `fix-invitation-trigger-rpc.sql` script to add the helper functions:

```sql
-- Function to check if a user exists in auth.users
CREATE OR REPLACE FUNCTION check_auth_user_exists(
  user_email TEXT
) RETURNS JSONB AS $$
DECLARE
  user_exists BOOLEAN;
  user_id UUID;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE email = user_email
  ) INTO user_exists;
  
  IF user_exists THEN
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
  END IF;
  
  RETURN jsonb_build_object(
    'exists', user_exists,
    'id', user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 4: Add the Missing insert_user_manually Function

Run the `migrations/create-insert-user-manually.sql` script to add the function that Supabase seems to be looking for:

```sql
CREATE OR REPLACE FUNCTION public.insert_user_manually(
  p_email TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  new_user_id UUID;
  generated_password TEXT;
BEGIN
  -- Generate a secure random password
  generated_password := gen_random_uuid()::TEXT;
  
  -- Insert the user into auth.users
  INSERT INTO auth.users (
    email,
    email_confirmed_at,
    encrypted_password,
    raw_user_meta_data,
    created_at,
    updated_at,
    role
  ) VALUES (
    p_email,
    now(),
    crypt(generated_password, gen_salt('bf')),
    p_metadata,
    now(),
    now(),
    'authenticated'
  )
  RETURNING id INTO new_user_id;
  
  -- Return the new user details
  RETURN jsonb_build_object(
    'id', new_user_id,
    'email', p_email,
    'created_at', now(),
    'metadata', p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 5: Fix Existing Data Inconsistencies

Run this script to fix any existing users who don't have profiles:

```sql
-- Create profiles for users that are missing them
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

## Verifying the Fix

After applying the fixes, test the invitation system by inviting a new user. You should see:

1. The invitation is sent successfully via email.
2. When the user completes registration, their profile is automatically created.
3. They can log in and access the system according to their assigned role.

## Troubleshooting

If issues persist, check the following:

### 1. API Error Logs

The invitation API route (`src/app/api/users/invite/route.ts`) includes detailed logging. Check for errors like:

```
Database error saving new user
```

or

```
Error: Failed to create profile for user
```

### 2. Missing or Incorrect Functions

If the invitation API reports issues with RPC functions, ensure all the required functions exist in the database:

```sql
SELECT 
  n.nspname AS schema,
  p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
  p.proname IN (
    'check_trigger_exists', 
    'check_auth_user_exists', 
    'get_auth_user_by_email', 
    'create_user_with_profile',
    'insert_user_manually'
  )
ORDER BY p.proname;
```

### 3. Invitation Logs

Check the `invitation_logs` table for recent invitation attempts:

```sql
SELECT 
  id,
  email,
  status,
  error_message,
  error_code,
  created_at
FROM invitation_logs
ORDER BY created_at DESC
LIMIT 10;
```

### 4. Direct SQL Execution

Sometimes permission issues prevent certain operations from being performed through RPC functions. You can test direct SQL execution:

```sql
-- Insert a user directly into auth.users
INSERT INTO auth.users (
  email,
  email_confirmed_at,
  encrypted_password,
  raw_user_meta_data,
  created_at,
  updated_at,
  role
) VALUES (
  'test@example.com',
  now(),
  crypt('randompassword', gen_salt('bf')),
  '{"full_name": "Test User"}',
  now(),
  now(),
  'authenticated'
);
```

## Fallback Solutions

If all else fails, you can implement these fallback solutions:

### 1. Manual User Creation

Create users manually through the Supabase dashboard:

1. Go to Authentication > Users
2. Click "Invite user"
3. Enter the user's email address
4. Wait for the user to be created, then add a profile manually:

```sql
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
  'user@example.com',
  'User Name',
  now(),
  now()
);
```

### 2. Direct Email Invitations

Use Supabase's magic link functionality instead of the invitation API:

```sql
SELECT * FROM auth.send_email(
  'user@example.com',
  'magiclink',
  '{"full_name": "User Name", "role": "viewer"}'
);
```

## Prevention

To prevent these issues from occurring again, implement:

1. Regular database consistency checks
2. Database migration tests
3. Integration tests for the invitation system
4. Monitoring of invitation success/failure rates

By implementing these measures, you can ensure the invitation system works reliably in the future. 
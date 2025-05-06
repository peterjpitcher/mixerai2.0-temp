-- MixerAI 2.0 - Invitation System Fix Script (Modified)
-- This script will fix common issues with the user invitation system
-- Modified to fix SQL syntax issues

-- 1. First, create a trigger function to handle new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
    NOW(), 
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- If role is specified in metadata, assign default permissions
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
    -- Insert default permissions for admin users
    IF NEW.raw_user_meta_data->>'role' = 'admin' THEN
      -- You may want to assign to a specific brand if needed
      -- This assumes there's at least one brand in the database
      INSERT INTO public.user_brand_permissions (user_id, brand_id, role)
      SELECT 
        NEW.id, 
        id, 
        'admin'::user_role
      FROM public.brands
      LIMIT 1
      ON CONFLICT (user_id, brand_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create or replace the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Fix existing orphaned records (auth.users without profiles)
INSERT INTO public.profiles (id, full_name, created_at, updated_at)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', ''), 
  NOW(), 
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 4. Create a manual user insertion function for testing
CREATE OR REPLACE FUNCTION public.insert_user_manually(
  p_email TEXT,
  p_full_name TEXT DEFAULT '',
  p_role TEXT DEFAULT 'viewer',
  p_brand_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',  -- Instance ID
    gen_random_uuid(),                       -- User ID
    'authenticated',                         -- Audience
    'authenticated',                         -- Role
    p_email,                                 -- Email
    '',                                      -- Empty password (invitation only)
    NULL,                                    -- Email not confirmed yet
    '{"provider": "email", "providers": ["email"]}', -- App metadata
    jsonb_build_object('full_name', p_full_name, 'role', p_role), -- User metadata
    NOW(),                                   -- Created at
    NOW()                                    -- Updated at
  )
  RETURNING id INTO v_user_id;
  
  -- The trigger should automatically create the profile record
  
  -- If a brand ID is provided, create permission
  IF p_brand_id IS NOT NULL THEN
    INSERT INTO public.user_brand_permissions (user_id, brand_id, role)
    VALUES (v_user_id, p_brand_id, p_role::user_role)
    ON CONFLICT (user_id, brand_id) DO NOTHING;
  END IF;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant necessary permissions for the service role
-- Replace 'your_service_role' with your actual service role if needed
DO $$
BEGIN
  -- Allow service role to select/insert/update auth.users
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON auth.users TO service_role';
  
  -- Allow service role to use the UUID extension
  EXECUTE 'GRANT USAGE ON SCHEMA extensions TO service_role';
  EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO service_role';
  
  -- Allow service role to access profiles and user_brand_permissions
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.profiles TO service_role';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.user_brand_permissions TO service_role';
  
  -- Allow service role to use our functions
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.insert_user_manually(TEXT, TEXT, TEXT, UUID) TO service_role';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error granting permissions: %', SQLERRM;
END $$;

-- 6. Ensure RLS is properly configured for invitation flows
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Fix for the syntax error: Using separate policy statements with simpler names
-- Allow users to view their own profiles
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
CREATE POLICY profiles_select_self 
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Allow admins to view all profiles
DROP POLICY IF EXISTS profiles_select_admin ON public.profiles;
CREATE POLICY profiles_select_admin
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_brand_permissions
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Users can update their own profile
DROP POLICY IF EXISTS profiles_update_self ON public.profiles;
CREATE POLICY profiles_update_self
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- 7. Create diagnostic function
CREATE OR REPLACE FUNCTION diagnose_invitation_system()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    auth_schema_exists BOOLEAN;
    profiles_table_exists BOOLEAN;
    email_column_exists BOOLEAN;
    trigger_exists BOOLEAN;
    recent_invites INTEGER;
BEGIN
    -- Check auth schema
    SELECT EXISTS (
        SELECT FROM information_schema.schemata
        WHERE schema_name = 'auth'
    ) INTO auth_schema_exists;
    
    IF auth_schema_exists THEN
        check_name := 'Auth Schema';
        status := 'OK';
        details := 'Auth schema exists';
        RETURN NEXT;
    ELSE
        check_name := 'Auth Schema';
        status := 'ERROR';
        details := 'Auth schema does not exist - Supabase auth not properly configured';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Check profiles table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profiles'
    ) INTO profiles_table_exists;
    
    IF profiles_table_exists THEN
        check_name := 'Profiles Table';
        status := 'OK';
        details := 'Profiles table exists';
        RETURN NEXT;
    ELSE
        check_name := 'Profiles Table';
        status := 'ERROR';
        details := 'Profiles table does not exist';
        RETURN NEXT;
    END IF;
    
    -- Check for our new trigger
    SELECT EXISTS (
        SELECT FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        check_name := 'Auth User Trigger';
        status := 'OK';
        details := 'on_auth_user_created trigger exists';
        RETURN NEXT;
    ELSE
        check_name := 'Auth User Trigger';
        status := 'WARNING';
        details := 'on_auth_user_created trigger does not exist - users may not get profiles automatically';
        RETURN NEXT;
    END IF;
    
    -- Return final message with instructions
    check_name := 'Diagnosis Complete';
    status := 'INFO';
    details := 'Fixes have been applied to the invitation system';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Run the diagnostic function to check if fixes were applied
SELECT * FROM diagnose_invitation_system(); 
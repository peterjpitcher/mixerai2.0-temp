-- MixerAI 2.0 - User Creation Fix Script (Revised)
-- This script addresses issues with user creation in Supabase

-- Part 1: Fix handle_new_user trigger function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Add detailed logging
  RAISE NOTICE 'handle_new_user trigger executing for user %', NEW.id;
  
  BEGIN
    -- Insert into profiles table with error handling
    INSERT INTO public.profiles (id, full_name, created_at, updated_at)
    VALUES (
      NEW.id, 
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 
      NOW(), 
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      -- If there's a conflict, update these fields
      full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', profiles.full_name),
      updated_at = NOW();
      
    RAISE NOTICE 'Profile created or updated for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user when creating profile: %', SQLERRM;
  END;
  
  BEGIN
    -- If role is specified in metadata, assign default permissions
    IF NEW.raw_user_meta_data->>'role' IS NOT NULL THEN
      RAISE NOTICE 'User has role % specified in metadata', NEW.raw_user_meta_data->>'role';
      
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
        
        RAISE NOTICE 'Admin permissions created for user %', NEW.id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the trigger
    RAISE WARNING 'Error in handle_new_user when assigning permissions: %', SQLERRM;
  END;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Last resort error handler to prevent trigger failures
  RAISE WARNING 'Uncaught error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Part 2: Fix trigger on auth.users
-- First try to drop the existing trigger if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users';
    RAISE NOTICE 'Dropped existing on_auth_user_created trigger';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error dropping existing trigger: %', SQLERRM;
END $$;

-- Create a new trigger (fix for syntax error)
DO $$
BEGIN
  EXECUTE 'CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user()';
    
  RAISE NOTICE 'Created on_auth_user_created trigger';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating trigger: %', SQLERRM;
END $$;

-- Part 3: Fix profiles table structure (just in case)
DO $$
BEGIN
  -- Check if profiles table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Add any missing columns with safe defaults
    BEGIN
      -- Check if email column exists, add if not
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE 'Added email column to profiles table';
      END IF;
      
      -- Check if avatar_url column exists, add if not
      IF NOT EXISTS (SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column to profiles table';
      END IF;
    END;
  ELSE
    -- Create profiles table if it doesn't exist
    EXECUTE 'CREATE TABLE public.profiles (
      id UUID PRIMARY KEY,
      email TEXT,
      full_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )';
    
    RAISE NOTICE 'Created profiles table from scratch';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error fixing profiles table: %', SQLERRM;
END $$;

-- Part 4: Fix permissions for service role
DO $$
BEGIN
  -- Grant usage on required schemas
  EXECUTE 'GRANT USAGE ON SCHEMA public TO service_role';
  EXECUTE 'GRANT USAGE ON SCHEMA auth TO service_role';
  
  -- Grant basic permissions on tables
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.profiles TO service_role';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.user_brand_permissions TO service_role';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON auth.users TO service_role';
  
  -- Grant execute on functions
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role';
  
  RAISE NOTICE 'Updated permissions for service_role';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error granting permissions: %', SQLERRM;
END $$;

-- Part 5: Fix RLS policies on profiles table
DO $$
DECLARE
  pol text;
BEGIN
  -- First, make sure RLS is enabled
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Drop existing policies (clean slate approach)
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || pol || '" ON public.profiles';
    RAISE NOTICE 'Dropped policy % on profiles table', pol;
  END LOOP;
  
  -- Create simple policies
  -- 1. Allow select on profiles for authenticated users
  EXECUTE 'CREATE POLICY "Allow users to view profiles" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (true)';
  
  -- 2. Allow insert and update on profiles with proper checks
  EXECUTE 'CREATE POLICY "Allow users to update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)';
  
  EXECUTE 'CREATE POLICY "Allow service role to manage profiles" 
  ON public.profiles FOR ALL 
  TO service_role
  USING (true)';
  
  RAISE NOTICE 'Created new RLS policies for profiles table';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error setting up RLS policies: %', SQLERRM;
END $$;

-- Part 6: Diagnostic test for the fixed configuration
DO $$
DECLARE
  trigger_exists boolean;
  function_exists boolean;
  profiles_table_exists boolean;
  service_role_select boolean;
  service_role_insert boolean;
BEGIN
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) INTO trigger_exists;
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) INTO function_exists;
  
  -- Check if profiles table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO profiles_table_exists;
  
  -- Report findings
  RAISE NOTICE '=== Diagnostic Results ===';
  RAISE NOTICE 'trigger exists: %', trigger_exists;
  RAISE NOTICE 'function exists: %', function_exists;
  RAISE NOTICE 'profiles table exists: %', profiles_table_exists;
  
  IF trigger_exists AND function_exists AND profiles_table_exists THEN
    RAISE NOTICE 'Basic configuration looks good!';
    RAISE NOTICE 'If user creation still fails, check Supabase dashboard for detailed error logs.';
  ELSE
    RAISE WARNING 'Some configuration issues remain!';
    IF NOT trigger_exists THEN
      RAISE WARNING 'Missing trigger on_auth_user_created';
    END IF;
    IF NOT function_exists THEN
      RAISE WARNING 'Missing function handle_new_user';
    END IF;
    IF NOT profiles_table_exists THEN
      RAISE WARNING 'Missing profiles table';
    END IF;
  END IF;
END $$; 
-- Migration: Add job_title column to profiles table (v2)
-- Description: Adds a job_title column to the profiles table and updates existing profiles

-- 1. Add the job_title column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'job_title'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN job_title TEXT;
    RAISE NOTICE 'Added job_title column to profiles table';
  ELSE
    RAISE NOTICE 'job_title column already exists in profiles table';
  END IF;
END $$;

-- 2. Add a comment to the column
COMMENT ON COLUMN public.profiles.job_title IS 'User''s job title or role within their organization';

-- 3. Update RLS policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Check if the trigger function exists
DO $$ 
DECLARE
  function_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_profile_for_user'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE 'create_profile_for_user function exists, will update it';
  ELSE
    RAISE NOTICE 'create_profile_for_user function does not exist, no update needed';
  END IF;
END $$;

-- 5. Update the trigger function if it exists (separate from the DO block)
DROP FUNCTION IF EXISTS public.create_profile_for_user();

CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, job_title)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'job_title', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant appropriate permissions
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role; 
-- Migration: Add job_title column to profiles table
-- Description: Adds a job_title column to the profiles table and updates existing profiles

-- Check if the column already exists before attempting to add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'job_title'
  ) THEN
    -- Add the job_title column to the profiles table
    ALTER TABLE public.profiles ADD COLUMN job_title TEXT;
    
    -- Add comment to the column
    COMMENT ON COLUMN public.profiles.job_title IS 'User''s job title or role within their organization';
    
    -- Log the change
    RAISE NOTICE 'Added job_title column to profiles table';
  ELSE
    RAISE NOTICE 'job_title column already exists in profiles table';
  END IF;
END $$;

-- Update the row-level security policy to include the new column
DO $$ 
BEGIN
  -- Drop existing policy if it exists
  DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
  
  -- Create updated policy
  CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
  
  RAISE NOTICE 'Updated RLS policy for profiles table';
END $$;

-- Add job_title to the public.create_profile_for_user function if it exists
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
    -- Update the function to include job_title
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.create_profile_for_user()
    RETURNS TRIGGER AS $func$
    BEGIN
      INSERT INTO public.profiles (id, full_name, email, job_title)
      VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>''full_name'', ''''),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>''job_title'', '''')
      );
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;
    ';
    
    RAISE NOTICE 'Updated create_profile_for_user function to include job_title';
  ELSE
    RAISE NOTICE 'create_profile_for_user function does not exist, skipping update';
  END IF;
END $$;

-- Grant appropriate permissions
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role; 
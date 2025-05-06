-- Migration: Add job_title column to profiles table safely
-- Description: Adds job_title column to profiles table if it doesn't exist
-- This script is idempotent and can be run multiple times

-- First check if the profiles table exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Check if job_title column already exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'job_title'
    ) THEN
      -- Add the job_title column if it doesn't exist
      ALTER TABLE public.profiles ADD COLUMN job_title TEXT;
      
      -- Add comment to the column
      COMMENT ON COLUMN public.profiles.job_title IS 'User''s job title or role within their organization';
      
      -- Update the create_profile_for_user function if it exists
      IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'create_profile_for_user'
      ) THEN
        -- Drop the existing function
        DROP FUNCTION IF EXISTS public.create_profile_for_user();
        
        -- Create updated function that includes job_title
        CREATE OR REPLACE FUNCTION public.create_profile_for_user()
        RETURNS TRIGGER AS $$
        BEGIN
          INSERT INTO public.profiles (id, full_name, email, avatar_url, job_title)
          VALUES (
            NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
            COALESCE(NEW.raw_user_meta_data->>'job_title', '')
          );
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE 'Updated create_profile_for_user function to include job_title';
      END IF;
      
      RAISE NOTICE 'Added job_title column to profiles table';
    ELSE
      RAISE NOTICE 'job_title column already exists in profiles table';
    END IF;
  ELSE
    RAISE NOTICE 'profiles table does not exist, creating it';
    
    -- Create the profiles table with all required columns
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      avatar_url TEXT,
      email TEXT,
      job_title TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add comments
    COMMENT ON TABLE public.profiles IS 'Profiles of all users';
    COMMENT ON COLUMN public.profiles.job_title IS 'User''s job title or role within their organization';
    
    RAISE NOTICE 'Created profiles table with job_title column';
  END IF;
END $$;

-- Ensure proper permissions
GRANT ALL ON public.profiles TO postgres, anon, authenticated, service_role;

-- Update any profiles where job_title is NULL but exists in user metadata
UPDATE public.profiles p
SET job_title = u.raw_user_meta_data->>'job_title'
FROM auth.users u
WHERE p.id = u.id
AND p.job_title IS NULL
AND u.raw_user_meta_data->>'job_title' IS NOT NULL;

-- Create or update RLS policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can read profiles" ON public.profiles;
CREATE POLICY "Users can read profiles" 
ON public.profiles 
FOR SELECT
USING (true);

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; 
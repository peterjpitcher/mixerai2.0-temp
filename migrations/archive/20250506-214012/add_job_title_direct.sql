-- Simple migration to add job_title column to profiles table
-- You can run this directly in Supabase's SQL editor

-- Add the job_title column if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Add a comment to the column
COMMENT ON COLUMN public.profiles.job_title IS 'User''s job title or role within their organization';

-- Update RLS policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Recreate the trigger function to include job_title
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

-- Update existing profiles that are missing job_title with the value from user metadata
UPDATE public.profiles
SET job_title = auth.users.raw_user_meta_data->>'job_title'
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND public.profiles.job_title IS NULL
AND auth.users.raw_user_meta_data->>'job_title' IS NOT NULL; 
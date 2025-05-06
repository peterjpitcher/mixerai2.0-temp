-- Create the insert_user_manually function
-- This function is mentioned in error messages and may be expected by Supabase
-- It's a simplified version of create_user_with_profile but with the parameter names
-- that match what Supabase is looking for

-- Check if the function already exists to avoid errors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'insert_user_manually'
  ) THEN
    RAISE NOTICE 'insert_user_manually function already exists';
  ELSE
    RAISE NOTICE 'Creating insert_user_manually function';
  END IF;
END $$;

-- Create the function with parameter names that match Supabase expectations
CREATE OR REPLACE FUNCTION public.insert_user_manually(
  p_email TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
  new_user_id UUID;
  generated_password TEXT;
  metadata_obj JSONB;
BEGIN
  -- Ensure metadata is valid JSON
  BEGIN
    metadata_obj := p_metadata;
  EXCEPTION WHEN OTHERS THEN
    metadata_obj := '{}';
  END;
  
  -- Generate a secure random password (user will reset via invitation link)
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
    metadata_obj,
    now(),
    now(),
    'authenticated'
  )
  RETURNING id INTO new_user_id;
  
  -- Create profile entry (this should happen via trigger, but doing it explicitly as well)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    COALESCE(metadata_obj->>'full_name', p_email),
    now(),
    now()
  );
  
  -- Return the new user details
  RETURN jsonb_build_object(
    'id', new_user_id,
    'email', p_email,
    'created_at', now(),
    'metadata', metadata_obj
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add a comment to explain its purpose
COMMENT ON FUNCTION public.insert_user_manually IS 
  'Manually creates a user in auth.users with the specified email and metadata. Expected by Supabase invitation system as a fallback.';

-- Test that the function exists
SELECT 
  proname AS function_name,
  pg_get_function_arguments(oid) AS arguments,
  pg_get_function_result(oid) AS result_type
FROM pg_proc
WHERE proname = 'insert_user_manually' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'); 
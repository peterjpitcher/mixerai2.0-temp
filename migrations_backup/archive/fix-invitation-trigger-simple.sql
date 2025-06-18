-- Simplified helper functions for invitation system
-- These simpler functions should be more compatible with Supabase

-- Function to manually insert a user
-- This is a fallback if the standard invitation flow fails
CREATE OR REPLACE FUNCTION insert_user_manually(
  p_email TEXT,
  p_metadata JSON
) RETURNS JSON AS $$
DECLARE
  new_user_id UUID;
  generated_password TEXT;
  full_name TEXT;
  result JSON;
BEGIN
  -- Generate a password (user will reset via invitation link)
  generated_password := gen_random_uuid()::TEXT;
  
  -- Get full name from metadata or use email
  full_name := COALESCE(
    p_metadata->>'full_name',
    p_email
  );
  
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
  
  -- Create profile entry (this should happen automatically via trigger but doing it explicitly)
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_email,
    full_name,
    now(),
    now()
  );
  
  -- Return the new user details
  SELECT json_build_object(
    'success', TRUE,
    'id', new_user_id,
    'email', p_email
  ) INTO result;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  SELECT json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'detail', SQLSTATE
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
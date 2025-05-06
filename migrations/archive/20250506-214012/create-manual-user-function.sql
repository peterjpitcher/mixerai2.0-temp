-- Function to manually insert a user into auth.users and public.profiles
-- This should only be used as a fallback when normal invitation flows fail

-- Create the function
CREATE OR REPLACE FUNCTION insert_user_manually(
    p_id UUID,
    p_email TEXT,
    p_full_name TEXT DEFAULT ''
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Required to access auth schema
AS $$
DECLARE
    v_now TIMESTAMP WITH TIME ZONE := now();
    v_user_role TEXT;
BEGIN
    -- Insert into auth.users
    -- This requires elevated permissions (security definer)
    BEGIN
        INSERT INTO auth.users (
            id,
            email,
            confirmed_at,
            created_at,
            updated_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            encrypted_password
        ) VALUES (
            p_id,
            p_email,
            v_now,
            v_now,
            v_now,
            NULL,
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', p_full_name),
            FALSE,
            -- Generate random password hash (user will reset via invite flow)
            crypt(gen_random_uuid()::text, gen_salt('bf'))
        );
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'User with this email already exists';
            RETURN FALSE;
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
            RETURN FALSE;
    END;

    -- Insert into profiles table
    BEGIN
        INSERT INTO public.profiles (
            id,
            full_name,
            email,
            created_at,
            updated_at
        ) VALUES (
            p_id,
            p_full_name,
            p_email,
            v_now,
            v_now
        );
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Profile already exists for this user';
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
            RETURN FALSE;
    END;

    -- Generate a one-time password reset token
    -- This will allow the user to set their password via the reset flow
    BEGIN
        INSERT INTO auth.refresh_tokens (
            token,
            user_id,
            revoked,
            created_at,
            updated_at,
            parent
        ) VALUES (
            encode(gen_random_bytes(40), 'hex'),
            p_id,
            false,
            v_now,
            v_now,
            NULL
        );
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Could not create refresh token: %', SQLERRM;
            -- Non-critical, continue
    END;

    RETURN TRUE;
END;
$$;

-- Add a comment to the function
COMMENT ON FUNCTION insert_user_manually IS 'Emergency function for creating users when Supabase invitation flow fails. Requires elevated database permissions.';

-- Test the function
DO $$
BEGIN
    -- Remove this test code before deploying to production
    RAISE NOTICE 'To test in development: SELECT insert_user_manually(uuid_generate_v4(), ''test@example.com'', ''Test User'');';
END;
$$; 
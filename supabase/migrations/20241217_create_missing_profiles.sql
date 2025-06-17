-- Migration: Create Missing User Profiles
-- Description: Creates profile records for users who don't have one yet
-- Date: 2024-12-17

-- Create profiles for any auth.users that don't have a corresponding profile
INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
SELECT 
    auth.users.id,
    COALESCE(auth.users.raw_user_meta_data->>'full_name', auth.users.email),
    auth.users.email,
    auth.users.created_at,
    NOW()
FROM auth.users
LEFT JOIN public.profiles ON auth.users.id = public.profiles.id
WHERE public.profiles.id IS NULL;

-- Create a function to automatically create profiles for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create profiles for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates a profile record when a new user signs up';
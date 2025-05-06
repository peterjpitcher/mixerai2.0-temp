-- Script to check and ensure that the user profile is properly created after user invitation
-- This script checks and ensures proper trigger functionality

-- Check if trigger function for creating profiles exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_proc 
    WHERE proname = 'handle_new_user'
  ) THEN
    RAISE NOTICE 'handle_new_user function exists';
  ELSE
    RAISE NOTICE 'Creating handle_new_user function';
    
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, avatar_url, email, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email,
        NEW.created_at,
        NEW.updated_at
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
  END IF;
END $$;

-- Check if trigger on auth.users exists to create profiles
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'on_auth_user_created trigger exists';
  ELSE
    RAISE NOTICE 'Creating on_auth_user_created trigger';
    
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Verify triggers on auth.users
SELECT tgname AS trigger_name, 
       proname AS function_name,
       tgenabled AS trigger_enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY tgname; 
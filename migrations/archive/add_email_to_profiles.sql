-- Migration: Add email column to profiles table
-- Date: 2023-05-24

-- Add email column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with email from auth.users if available
UPDATE profiles
SET email = (SELECT email FROM auth.users WHERE auth.users.id = profiles.id)
WHERE email IS NULL;

-- Add comment to explain the purpose of this column
COMMENT ON COLUMN profiles.email IS 'Email address of the user, used for workflows and notifications';

-- Create a trigger to keep the email field in sync with auth.users
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_user_email_to_profile ON auth.users;

CREATE TRIGGER sync_user_email_to_profile
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_profile_email(); 
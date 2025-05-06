-- Add job_description column to profiles table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'job_description'
    ) THEN
        ALTER TABLE profiles ADD COLUMN job_description TEXT;
    END IF;
END
$$; 
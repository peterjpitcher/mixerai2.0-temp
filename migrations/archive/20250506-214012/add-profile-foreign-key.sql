-- Fix the missing foreign key constraint between profiles and auth.users
-- This is a critical fix for the user invitation system

-- First, verify that the constraint doesn't already exist
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.table_constraints
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
    AND constraint_type = 'FOREIGN KEY'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE 'Foreign key constraint already exists on profiles table';
  ELSE
    -- Add the missing foreign key constraint
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
    
    RAISE NOTICE 'Foreign key constraint added to profiles table';
  END IF;
END $$;

-- Verify that the constraint was added successfully
SELECT tc.constraint_name, kcu.column_name, 
       ccu.table_schema AS foreign_table_schema,
       ccu.table_name AS foreign_table_name, 
       ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name = 'profiles'; 
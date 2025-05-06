-- Migration: Add company field to profiles table

-- First, check if the column already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'company'
    ) THEN
        -- Add company column to profiles table
        ALTER TABLE public.profiles ADD COLUMN company TEXT;
        
        -- Update existing profiles with company information from user metadata if available
        UPDATE public.profiles p
        SET company = auth.users.raw_user_meta_data->>'company'
        FROM auth.users
        WHERE p.id = auth.users.id
        AND auth.users.raw_user_meta_data->>'company' IS NOT NULL;
        
        RAISE NOTICE 'Added company column to profiles table';
    ELSE
        RAISE NOTICE 'Company column already exists in profiles table';
    END IF;
END$$; 
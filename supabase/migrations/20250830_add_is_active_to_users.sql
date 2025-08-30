-- Add is_active column to users table for soft deactivation
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users (is_active);

-- Update existing records to be active
UPDATE public.users SET is_active = true WHERE is_active IS NULL;
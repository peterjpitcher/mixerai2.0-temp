-- Migration to fix issue #261: Deleted users appear in workflow assignment
-- Creates brand-scoped view for active users only

-- First, ensure we have proper status values (safe coercion)
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{status}',
  '"active"'::jsonb
)
WHERE raw_user_meta_data->>'status' IS NULL;

-- Create ENUM type for user status if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'suspended');
  END IF;
END $$;

-- Create brand-scoped view for active users
CREATE OR REPLACE VIEW active_brand_users_v AS
SELECT 
  u.id,
  COALESCE(p.email, u.email) as email,
  p.full_name,
  p.avatar_url,
  ubp.brand_id,
  p.job_title,
  u.created_at,
  p.updated_at
FROM auth.users u
INNER JOIN profiles p ON p.id = u.id
INNER JOIN user_brand_permissions ubp ON ubp.user_id = u.id
WHERE u.deleted_at IS NULL 
  AND COALESCE(u.raw_user_meta_data->>'status', 'active') = 'active'
  AND ubp.deleted_at IS NULL;

-- Add comment for documentation
COMMENT ON VIEW active_brand_users_v IS 'Brand-scoped view of active, non-deleted users for workflow assignments';

-- Create indexes for better search performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_profiles_email_search ON profiles USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_search ON profiles USING gin (full_name gin_trgm_ops);

-- Create composite search index for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_search_combo 
ON profiles USING gin ((COALESCE(email,'') || ' ' || COALESCE(full_name,'')) gin_trgm_ops);

-- Grant appropriate permissions
GRANT SELECT ON active_brand_users_v TO authenticated;

-- Add RLS policy for the view's underlying tables if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_brand_permissions' 
    AND policyname = 'Users can view brand permissions'
  ) THEN
    CREATE POLICY "Users can view brand permissions" 
    ON user_brand_permissions 
    FOR SELECT 
    USING (
      user_id = auth.uid() 
      OR brand_id IN (
        SELECT brand_id 
        FROM user_brand_permissions 
        WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;
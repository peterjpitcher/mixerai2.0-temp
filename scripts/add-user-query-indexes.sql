-- Indexes to optimize user fetching queries and prevent N+1 patterns
-- Run this script in your Supabase SQL editor

-- Index on profiles table for user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Index on user_brand_permissions for efficient permission lookups
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_user_id ON user_brand_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_user_brand ON user_brand_permissions(user_id, brand_id);

-- Index on user_invitation_status view's base table if applicable
-- Note: Views don't have indexes, but their underlying tables should
CREATE INDEX IF NOT EXISTS idx_user_invitations_user_id ON user_invitations(user_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires ON user_invitations(expires_at) WHERE status = 'pending';

-- Composite index for profiles with permissions join
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_id ON profiles(created_at DESC, id);

-- Index for auth.users metadata queries (if you have access)
-- Note: You may need superuser access for auth schema
-- CREATE INDEX IF NOT EXISTS idx_auth_users_metadata ON auth.users USING gin(user_metadata);

-- Analyze tables to update query planner statistics
ANALYZE profiles;
ANALYZE user_brand_permissions;
ANALYZE user_invitations;

-- Query to verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_brand_permissions', 'user_invitations')
ORDER BY tablename, indexname;
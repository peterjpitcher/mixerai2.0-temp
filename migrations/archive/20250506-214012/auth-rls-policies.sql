-- Row Level Security (RLS) Policies for MixerAI 2.0
-- This script establishes database-level security policies to complement API-level authentication

-- Enable Row Level Security for all tables
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brand_permissions ENABLE ROW LEVEL SECURITY;

-- Create a helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_brand_permissions
    WHERE user_id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BRANDS TABLE POLICIES

-- Policy: Users can view all brands
CREATE POLICY brands_view_policy ON brands
  FOR SELECT USING (true);

-- Policy: Users can modify brands if they're an admin or have edit permission
CREATE POLICY brands_modify_policy ON brands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = brands.id
      AND (role = 'admin' OR role = 'editor')
    )
  );

-- Policy: Only users with admin role can delete brands
CREATE POLICY brands_delete_policy ON brands
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = brands.id
      AND role = 'admin'
    )
  );

-- Policy: Only admins can create new brands
CREATE POLICY brands_insert_policy ON brands
  FOR INSERT WITH CHECK (
    is_admin(auth.uid())
  );

-- CONTENT TABLE POLICIES

-- Policy: Users can view content for brands they have access to
CREATE POLICY content_view_policy ON content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = content.brand_id
    )
  );

-- Policy: Users can modify content they created or have editor/admin role for the brand
CREATE POLICY content_modify_policy ON content
  FOR UPDATE USING (
    (created_by = auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = content.brand_id
      AND (role = 'admin' OR role = 'editor')
    )
  );

-- Policy: Users can insert content for brands they have editor/admin role
CREATE POLICY content_insert_policy ON content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = content.brand_id
      AND (role = 'admin' OR role = 'editor')
    )
  );

-- Policy: Only creator or admin can delete content
CREATE POLICY content_delete_policy ON content
  FOR DELETE USING (
    (created_by = auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = content.brand_id
      AND role = 'admin'
    )
  );

-- CONTENT TYPES TABLE POLICIES

-- All users can view content types
CREATE POLICY content_types_view_policy ON content_types
  FOR SELECT USING (true);

-- Only admins can modify content types
CREATE POLICY content_types_modify_policy ON content_types
  FOR ALL USING (
    is_admin(auth.uid())
  );

-- PROFILES TABLE POLICIES

-- Users can view all profiles
CREATE POLICY profiles_view_policy ON profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY profiles_update_policy ON profiles
  FOR UPDATE USING (
    id = auth.uid()
  );

-- System inserts new profiles automatically
CREATE POLICY profiles_insert_policy ON profiles
  FOR INSERT WITH CHECK (
    id = auth.uid()
  );

-- USER BRAND PERMISSIONS TABLE POLICIES

-- Users can see permissions for brands they have admin access to
CREATE POLICY permissions_view_policy ON user_brand_permissions
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = user_brand_permissions.brand_id
      AND role = 'admin'
    )
  );

-- Only admins can modify permissions
CREATE POLICY permissions_modify_policy ON user_brand_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = user_brand_permissions.brand_id
      AND role = 'admin'
    )
  );

-- WORKFLOWS TABLE POLICIES

-- Users can view workflows for brands they have access to
CREATE POLICY workflows_view_policy ON workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = workflows.brand_id
    )
  );

-- Only admins and editors can modify workflows
CREATE POLICY workflows_modify_policy ON workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() 
      AND brand_id = workflows.brand_id
      AND (role = 'admin' OR role = 'editor')
    )
  ); 
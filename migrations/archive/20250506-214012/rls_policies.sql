-- MixerAI 2.0 Row-Level Security Policies
-- This script enables RLS on key tables and sets up access policies

-- Start transaction
BEGIN;

-- ====================== Brands Table ======================
-- Enable RLS on the brands table
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read brands they created
CREATE POLICY brands_select_own ON brands
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can update brands they created
CREATE POLICY brands_update_own ON brands
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete brands they created
CREATE POLICY brands_delete_own ON brands
  FOR DELETE
  USING (auth.uid() = created_by);

-- Policy: Allow admin users to read all brands
CREATE POLICY brands_select_admin ON brands
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to update all brands
CREATE POLICY brands_update_admin ON brands
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to delete all brands
CREATE POLICY brands_delete_admin ON brands
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- ====================== Content Table ======================
-- Enable RLS on the content table
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read content they created
CREATE POLICY content_select_own ON content
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can update content they created
CREATE POLICY content_update_own ON content
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete content they created
CREATE POLICY content_delete_own ON content
  FOR DELETE
  USING (auth.uid() = created_by);

-- Policy: Users can read content for brands they have access to
CREATE POLICY content_select_brand_access ON content
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM brands 
    WHERE brands.id = content.brand_id 
    AND (
      brands.created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_brand_permissions
        WHERE user_brand_permissions.brand_id = brands.id
        AND user_brand_permissions.user_id = auth.uid()
      )
    )
  ));

-- Policy: Allow admin users to read all content
CREATE POLICY content_select_admin ON content
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to update all content
CREATE POLICY content_update_admin ON content
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Allow admin users to delete all content
CREATE POLICY content_delete_admin ON content
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- ====================== Profiles Table ======================
-- Enable RLS on the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy: Admin users can read all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- Policy: Admin users can update all profiles
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- ====================== Workflows Table ======================
-- Enable RLS on the workflows table
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read workflows they created
CREATE POLICY workflows_select_own ON workflows
  FOR SELECT
  USING (auth.uid() = created_by);

-- Policy: Users can update workflows they created
CREATE POLICY workflows_update_own ON workflows
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Policy: Users can delete workflows they created
CREATE POLICY workflows_delete_own ON workflows
  FOR DELETE
  USING (auth.uid() = created_by);

-- Policy: Allow admin users to read all workflows
CREATE POLICY workflows_select_admin ON workflows
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  ));

-- ====================== User_Brand_Permissions Table ======================
-- Enable RLS on the user_brand_permissions table
ALTER TABLE user_brand_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own permissions
CREATE POLICY user_brand_permissions_select_own ON user_brand_permissions
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Brand owners can manage permissions for their brands
CREATE POLICY user_brand_permissions_all_owner ON user_brand_permissions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id = user_brand_permissions.brand_id
    AND brands.created_by = auth.uid()
  ));

-- Policy: Admin users can manage all permissions
CREATE POLICY user_brand_permissions_all_admin ON user_brand_permissions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

-- Commit transaction
COMMIT; 
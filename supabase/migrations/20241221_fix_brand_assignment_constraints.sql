-- Fix for Issue #255: Assigned Brand Checkbox Not Visible in Edit Mode
-- Ensures proper constraints and atomic updates for user-brand relationships

-- First, ensure we have the proper structure for user_brand_permissions
-- Add proper constraints if they don't exist
DO $$ BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_brand_permissions'
  ) THEN
    CREATE TABLE user_brand_permissions (
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
      role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
      created_at timestamptz DEFAULT NOW(),
      created_by uuid REFERENCES auth.users(id),
      PRIMARY KEY (user_id, brand_id)
    );
  ELSE
    -- Add primary key constraint if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'user_brand_permissions'
      AND constraint_type = 'PRIMARY KEY'
    ) THEN
      ALTER TABLE user_brand_permissions
      ADD PRIMARY KEY (user_id, brand_id);
    END IF;
    
    -- Add role check constraint if missing
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.check_constraints
      WHERE constraint_name LIKE '%role%'
    ) THEN
      ALTER TABLE user_brand_permissions
      ADD CONSTRAINT user_brand_permissions_role_check 
      CHECK (role IN ('owner', 'admin', 'editor', 'viewer'));
    END IF;
  END IF;
END $$;

-- Function for atomic brand assignment updates
CREATE OR REPLACE FUNCTION update_user_brand_assignments(
  p_user_id uuid,
  p_brand_ids uuid[],
  p_default_role text DEFAULT 'viewer',
  p_updated_by uuid DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_removed_count integer;
  v_added_count integer;
  v_result jsonb;
BEGIN
  -- Validate default role
  IF p_default_role NOT IN ('owner', 'admin', 'editor', 'viewer') THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Invalid role specified'
    );
  END IF;
  
  -- Start transaction
  -- Delete brands not in the new list
  DELETE FROM user_brand_permissions
  WHERE user_id = p_user_id
  AND brand_id != ALL(p_brand_ids);
  
  GET DIAGNOSTICS v_removed_count = ROW_COUNT;
  
  -- Insert new brand assignments
  INSERT INTO user_brand_permissions (user_id, brand_id, role, created_by)
  SELECT 
    p_user_id,
    brand_id,
    p_default_role,
    p_updated_by
  FROM unnest(p_brand_ids) AS brand_id
  ON CONFLICT (user_id, brand_id) 
  DO UPDATE SET 
    created_by = EXCLUDED.created_by,
    created_at = CASE 
      WHEN user_brand_permissions.created_at IS NULL 
      THEN NOW() 
      ELSE user_brand_permissions.created_at 
    END;
  
  GET DIAGNOSTICS v_added_count = ROW_COUNT;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'assigned_brands', (
      SELECT jsonb_agg(jsonb_build_object(
        'brand_id', brand_id,
        'role', role
      ))
      FROM user_brand_permissions
      WHERE user_id = p_user_id
    ),
    'removed_count', v_removed_count,
    'added_count', v_added_count
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Guard function to prevent removing last owner/admin of a brand
CREATE OR REPLACE FUNCTION can_remove_brand_admin(
  p_user_id uuid,
  p_brand_id uuid
) RETURNS boolean AS $$
DECLARE
  v_user_role text;
  v_admin_count integer;
BEGIN
  -- Get user's role for this brand
  SELECT role INTO v_user_role
  FROM user_brand_permissions
  WHERE user_id = p_user_id
  AND brand_id = p_brand_id;
  
  -- If not an admin/owner, can remove
  IF v_user_role NOT IN ('admin', 'owner') THEN
    RETURN true;
  END IF;
  
  -- Count other admins/owners for this brand
  SELECT COUNT(*) INTO v_admin_count
  FROM user_brand_permissions
  WHERE brand_id = p_brand_id
  AND user_id != p_user_id
  AND role IN ('admin', 'owner');
  
  -- Can't remove if this is the last admin/owner
  RETURN v_admin_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get user's brand assignments
CREATE OR REPLACE FUNCTION get_user_brand_assignments(p_user_id uuid)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_agg(jsonb_build_object(
      'brand_id', ubp.brand_id,
      'brand_name', b.name,
      'brand_color', b.brand_color,
      'role', ubp.role,
      'created_at', ubp.created_at
    ) ORDER BY b.name)
    FROM user_brand_permissions ubp
    JOIN brands b ON b.id = ubp.brand_id
    WHERE ubp.user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_user 
ON user_brand_permissions(user_id);

CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_brand 
ON user_brand_permissions(brand_id);

CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_role 
ON user_brand_permissions(role) 
WHERE role IN ('admin', 'owner');

-- RLS policies (if not already set)
ALTER TABLE user_brand_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own brand assignments
CREATE POLICY IF NOT EXISTS "Users can view own brand assignments" 
ON user_brand_permissions
FOR SELECT USING (auth.uid() = user_id);

-- Admins can view and manage all brand assignments
CREATE POLICY IF NOT EXISTS "Admins can manage brand assignments" 
ON user_brand_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND (raw_user_meta_data->>'role' = 'admin')
  )
);

-- Brand admins can manage assignments for their brands
CREATE POLICY IF NOT EXISTS "Brand admins can manage their brand assignments" 
ON user_brand_permissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_brand_permissions
    WHERE user_id = auth.uid()
    AND brand_id = user_brand_permissions.brand_id
    AND role IN ('admin', 'owner')
  )
);
-- Complete Squashed Migration: MixerAI 2.0
-- Generated: 2025-07-04
-- This combines all migrations into a single file

-- Note: This squashed migration assumes a fresh database
-- The CREATE INDEX CONCURRENTLY for global claims must be run separately after this migration

BEGIN;

-- ============================================================================
-- From 20250618000000_final_squashed_schema.sql
-- ============================================================================

-- Add batch support to tool_run_history
ALTER TABLE tool_run_history 
ADD COLUMN IF NOT EXISTS batch_id UUID,
ADD COLUMN IF NOT EXISTS batch_sequence INTEGER;

-- Add constraints for batch columns
ALTER TABLE tool_run_history
ADD CONSTRAINT check_batch_fields 
CHECK (
  (batch_id IS NULL AND batch_sequence IS NULL) OR 
  (batch_id IS NOT NULL AND batch_sequence IS NOT NULL AND batch_sequence > 0)
);

-- Create index for batch queries
CREATE INDEX IF NOT EXISTS idx_tool_run_history_batch 
ON tool_run_history(batch_id, batch_sequence) 
WHERE batch_id IS NOT NULL;

-- Add email preferences to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_marketing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_product_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS email_security_alerts BOOLEAN DEFAULT true;

-- ============================================================================
-- From 20250619130937_add_haagen_dazs_claims_data.sql
-- ============================================================================

-- Insert Häagen-Dazs claims data (will be included in data section below)

-- ============================================================================
-- From 20250623150000_create_brand_master_claim_brands_junction.sql
-- ============================================================================

-- Create the junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS brand_master_claim_brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_master_claim_id UUID NOT NULL REFERENCES brand_master_claims(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(brand_master_claim_id, brand_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_brand_master_claim_brands_claim 
ON brand_master_claim_brands(brand_master_claim_id);

CREATE INDEX IF NOT EXISTS idx_brand_master_claim_brands_brand 
ON brand_master_claim_brands(brand_id);

-- Enable RLS
ALTER TABLE brand_master_claim_brands ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view brand_master_claim_brands for their brands"
ON brand_master_claim_brands FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_brands ub
        WHERE ub.brand_id = brand_master_claim_brands.brand_id
        AND ub.user_id = auth.uid()
    )
);

CREATE POLICY "Admin users can insert brand_master_claim_brands"
ON brand_master_claim_brands FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_brands ub
        WHERE ub.brand_id = brand_master_claim_brands.brand_id
        AND ub.user_id = auth.uid()
        AND ub.role = 'admin'
    )
);

CREATE POLICY "Admin users can delete brand_master_claim_brands"
ON brand_master_claim_brands FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM user_brands ub
        WHERE ub.brand_id = brand_master_claim_brands.brand_id
        AND ub.user_id = auth.uid()
        AND ub.role = 'admin'
    )
);

-- Grant permissions
GRANT SELECT ON brand_master_claim_brands TO authenticated;
GRANT INSERT, DELETE ON brand_master_claim_brands TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE brand_master_claim_brands IS 'Junction table for many-to-many relationship between brand_master_claims and brands';
COMMENT ON COLUMN brand_master_claim_brands.brand_master_claim_id IS 'Reference to the master claim';
COMMENT ON COLUMN brand_master_claim_brands.brand_id IS 'Reference to the brand';

-- ============================================================================
-- From 20250701000000_add_user_brand_removal_safety.sql
-- ============================================================================

-- Add last_admin_check column to track when we last verified admin status
ALTER TABLE user_brands 
ADD COLUMN IF NOT EXISTS last_admin_check TIMESTAMPTZ DEFAULT NOW();

-- Create function to safely remove user from brand with workflow reassignment
CREATE OR REPLACE FUNCTION remove_user_from_brand_safely(
    p_user_id UUID,
    p_brand_id UUID,
    p_new_assignee_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_user_role user_brand_role_enum;
    v_is_last_admin BOOLEAN;
    v_active_workflows INTEGER;
    v_content_count INTEGER;
    v_reassigned_count INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Get user's current role
    SELECT role INTO v_user_role
    FROM user_brands
    WHERE user_id = p_user_id AND brand_id = p_brand_id;
    
    IF v_user_role IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is not associated with this brand'
        );
    END IF;
    
    -- Check if user is the last admin
    IF v_user_role = 'admin' THEN
        SELECT COUNT(*) = 1 INTO v_is_last_admin
        FROM user_brands
        WHERE brand_id = p_brand_id 
        AND role = 'admin';
        
        IF v_is_last_admin THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Cannot remove the last admin from the brand'
            );
        END IF;
    END IF;
    
    -- Count active workflows assigned to this user
    SELECT COUNT(*) INTO v_active_workflows
    FROM workflows
    WHERE brand_id = p_brand_id 
    AND assigned_to = p_user_id
    AND status = 'active';
    
    -- Count content created by this user
    SELECT COUNT(*) INTO v_content_count
    FROM content
    WHERE brand_id = p_brand_id 
    AND created_by = p_user_id;
    
    -- If there are active workflows and a new assignee is provided, reassign them
    IF v_active_workflows > 0 AND p_new_assignee_id IS NOT NULL THEN
        -- Verify new assignee has access to the brand
        IF NOT EXISTS (
            SELECT 1 FROM user_brands 
            WHERE user_id = p_new_assignee_id 
            AND brand_id = p_brand_id
        ) THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'New assignee does not have access to this brand'
            );
        END IF;
        
        -- Reassign workflows
        UPDATE workflows
        SET assigned_to = p_new_assignee_id,
            updated_at = NOW()
        WHERE brand_id = p_brand_id 
        AND assigned_to = p_user_id
        AND status = 'active';
        
        GET DIAGNOSTICS v_reassigned_count = ROW_COUNT;
    END IF;
    
    -- Remove user from brand
    DELETE FROM user_brands
    WHERE user_id = p_user_id AND brand_id = p_brand_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'removed_role', v_user_role::text,
        'content_count', v_content_count,
        'active_workflows', v_active_workflows,
        'reassigned_workflows', v_reassigned_count
    );
    
    -- Add warning if there were unhandled workflows
    IF v_active_workflows > 0 AND p_new_assignee_id IS NULL THEN
        v_result := v_result || jsonb_build_object(
            'warning', format('User had %s active workflows that are now unassigned', v_active_workflows)
        );
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update last_admin_check when role changes
CREATE OR REPLACE FUNCTION update_last_admin_check() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'admin' OR NEW.role = 'admin' THEN
        NEW.last_admin_check = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_admin_check
BEFORE UPDATE OF role ON user_brands
FOR EACH ROW
EXECUTE FUNCTION update_last_admin_check();

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_user_from_brand_safely TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION remove_user_from_brand_safely IS 'Safely removes a user from a brand, with options to reassign their active workflows. Prevents removing the last admin.';
COMMENT ON COLUMN user_brands.last_admin_check IS 'Timestamp of when admin status was last verified, used for ensuring data consistency';

-- ============================================================================
-- From 20250701000001_fix_rls_insert_select_policies.sql
-- ============================================================================

-- Fix products table policies
CREATE POLICY "Users can view products" ON products
FOR SELECT USING (
    brand_id IN (
        SELECT brand_id FROM user_brands 
        WHERE user_id = auth.uid()
    )
);

-- Fix ingredients table policies  
CREATE POLICY "Users can view ingredients" ON ingredients
FOR SELECT USING (
    brand_id IN (
        SELECT brand_id FROM user_brands 
        WHERE user_id = auth.uid()
    )
);

-- Fix product_ingredients table policies
CREATE POLICY "Users can view product ingredients" ON product_ingredients
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM products p
        JOIN user_brands ub ON p.brand_id = ub.brand_id
        WHERE p.id = product_ingredients.product_id
        AND ub.user_id = auth.uid()
    )
);

-- Fix content_associations table policies
CREATE POLICY "Users can view content associations" ON content_associations
FOR SELECT USING (
    content_id IN (
        SELECT id FROM content 
        WHERE brand_id IN (
            SELECT brand_id FROM user_brands 
            WHERE user_id = auth.uid()
        )
    )
);

-- Fix content_claims table policies
CREATE POLICY "Users can view content claims" ON content_claims
FOR SELECT USING (
    content_id IN (
        SELECT id FROM content 
        WHERE brand_id IN (
            SELECT brand_id FROM user_brands 
            WHERE user_id = auth.uid()
        )
    )
);

-- Fix tool_run_history table policies
CREATE POLICY "Users can view tool run history" ON tool_run_history
FOR SELECT USING (
    user_id = auth.uid()
);

-- Fix notifications table policies
CREATE POLICY "Users can view their notifications" ON notifications
FOR SELECT USING (
    user_id = auth.uid()
);

-- ============================================================================
-- From 20250702000001_enable_global_claims_blocking_part1.sql (Transactional)
-- ============================================================================

-- Add columns to brand_master_claims table
ALTER TABLE brand_master_claims 
ADD COLUMN IF NOT EXISTS is_globally_blocked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS globally_blocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS globally_blocked_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS global_block_reason TEXT;

-- Create audit table for tracking global blocking changes
CREATE TABLE IF NOT EXISTS brand_master_claims_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_master_claim_id UUID NOT NULL REFERENCES brand_master_claims(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('blocked', 'unblocked')),
    performed_by UUID NOT NULL REFERENCES auth.users(id),
    performed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    reason TEXT,
    previous_state JSONB,
    new_state JSONB
);

-- Create function to update global blocking status
CREATE OR REPLACE FUNCTION update_global_claim_blocking(
    p_claim_id UUID,
    p_is_blocked BOOLEAN,
    p_reason TEXT DEFAULT NULL
) RETURNS brand_master_claims AS $$
DECLARE
    v_claim brand_master_claims;
    v_previous_state JSONB;
BEGIN
    -- Get current state
    SELECT * INTO v_claim FROM brand_master_claims WHERE id = p_claim_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Claim not found';
    END IF;
    
    -- Store previous state for audit
    v_previous_state := jsonb_build_object(
        'is_globally_blocked', v_claim.is_globally_blocked,
        'globally_blocked_at', v_claim.globally_blocked_at,
        'globally_blocked_by', v_claim.globally_blocked_by,
        'global_block_reason', v_claim.global_block_reason
    );
    
    -- Update the claim
    UPDATE brand_master_claims
    SET 
        is_globally_blocked = p_is_blocked,
        globally_blocked_at = CASE WHEN p_is_blocked THEN NOW() ELSE NULL END,
        globally_blocked_by = CASE WHEN p_is_blocked THEN auth.uid() ELSE NULL END,
        global_block_reason = CASE WHEN p_is_blocked THEN p_reason ELSE NULL END,
        updated_at = NOW()
    WHERE id = p_claim_id
    RETURNING * INTO v_claim;
    
    -- Create audit record
    INSERT INTO brand_master_claims_audit (
        brand_master_claim_id,
        action,
        performed_by,
        reason,
        previous_state,
        new_state
    ) VALUES (
        p_claim_id,
        CASE WHEN p_is_blocked THEN 'blocked' ELSE 'unblocked' END,
        auth.uid(),
        p_reason,
        v_previous_state,
        jsonb_build_object(
            'is_globally_blocked', v_claim.is_globally_blocked,
            'globally_blocked_at', v_claim.globally_blocked_at,
            'globally_blocked_by', v_claim.globally_blocked_by,
            'global_block_reason', v_claim.global_block_reason
        )
    );
    
    RETURN v_claim;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on audit table
ALTER TABLE brand_master_claims_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for audit table
CREATE POLICY "Users can view audit records for their brand claims"
ON brand_master_claims_audit FOR SELECT
USING (
    brand_master_claim_id IN (
        SELECT bmc.id 
        FROM brand_master_claims bmc
        JOIN brand_master_claim_brands bmcb ON bmc.id = bmcb.brand_master_claim_id
        JOIN user_brands ub ON bmcb.brand_id = ub.brand_id
        WHERE ub.user_id = auth.uid()
    )
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_global_claim_blocking TO authenticated;
GRANT SELECT ON brand_master_claims_audit TO authenticated;

-- ============================================================================
-- From 20250703160000_fix_country_code_in_create_claim_function.sql
-- ============================================================================

-- Update the create_claim_with_associations function to properly save country_code
CREATE OR REPLACE FUNCTION create_claim_with_associations(
  p_name text,
  p_simplified_version text,
  p_country_code text,
  p_level claim_level_enum,
  p_type claim_type_enum,
  p_category claim_category_enum,
  p_brand_ids uuid[],
  p_product_ids uuid[] DEFAULT NULL,
  p_ingredient_ids uuid[] DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_claim_id uuid;
  v_brand_id uuid;
  v_product_id uuid;
  v_ingredient_id uuid;
BEGIN
  -- Insert the claim with country_code
  INSERT INTO brand_master_claims (
    name, 
    simplified_version, 
    country_code,  -- This was missing in the original function
    level, 
    type, 
    category, 
    created_by
  )
  VALUES (
    p_name, 
    p_simplified_version, 
    p_country_code,  -- Now properly saved
    p_level, 
    p_type, 
    p_category, 
    auth.uid()
  )
  RETURNING id INTO v_claim_id;
  
  -- Associate with brands
  IF p_brand_ids IS NOT NULL AND array_length(p_brand_ids, 1) > 0 THEN
    FOREACH v_brand_id IN ARRAY p_brand_ids
    LOOP
      INSERT INTO brand_master_claim_brands (brand_master_claim_id, brand_id)
      VALUES (v_claim_id, v_brand_id);
    END LOOP;
  END IF;
  
  -- Associate with products
  IF p_product_ids IS NOT NULL AND array_length(p_product_ids, 1) > 0 THEN
    FOREACH v_product_id IN ARRAY p_product_ids
    LOOP
      INSERT INTO claim_products (claim_id, product_id)
      VALUES (v_claim_id, v_product_id);
    END LOOP;
  END IF;
  
  -- Associate with ingredients
  IF p_ingredient_ids IS NOT NULL AND array_length(p_ingredient_ids, 1) > 0 THEN
    FOREACH v_ingredient_id IN ARRAY p_ingredient_ids
    LOOP
      INSERT INTO claim_ingredients (claim_id, ingredient_id)
      VALUES (v_claim_id, v_ingredient_id);
    END LOOP;
  END IF;
  
  RETURN v_claim_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_claim_with_associations IS 'Creates a claim and its associations in a single transaction. Fixed on 2025-07-03 to properly save country_code.';

-- ============================================================================
-- From 20250120000002_fix_create_claim_function_for_legacy_columns.sql
-- ============================================================================

-- The function above already includes the fix

-- ============================================================================
-- From 20250120000003_fix_database_role_enum.sql
-- ============================================================================

-- Fix the get_user_templates function to use correct role enum
CREATE OR REPLACE FUNCTION get_user_templates(p_user_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    tool_type text,
    configuration jsonb,
    brand_id uuid,
    brand_name text,
    is_global boolean,
    created_at timestamptz,
    updated_at timestamptz,
    created_by uuid,
    creator_email text
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        t.id,
        t.name,
        t.description,
        t.tool_type,
        t.configuration,
        t.brand_id,
        b.name as brand_name,
        t.is_global,
        t.created_at,
        t.updated_at,
        t.created_by,
        p.email as creator_email
    FROM templates t
    LEFT JOIN brands b ON t.brand_id = b.id
    LEFT JOIN profiles p ON t.created_by = p.id
    WHERE 
        -- Global templates
        t.is_global = true
        OR 
        -- User's own templates
        t.created_by = p_user_id
        OR
        -- Brand templates where user has access
        (
            t.brand_id IS NOT NULL 
            AND EXISTS (
                SELECT 1 
                FROM user_brands ub 
                WHERE ub.user_id = p_user_id 
                AND ub.brand_id = t.brand_id
                AND ub.role IN ('admin', 'editor', 'viewer')  -- Fixed: using correct enum values
            )
        )
    ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- From 20250120000004_fix_workflow_schema_mismatches.sql
-- ============================================================================

-- Already handled in the workflow table creation (should use UUID for user references)

-- ============================================================================
-- From 20250120150000_fix_brand_admin_role.sql
-- ============================================================================

-- Update any existing 'brand_admin' roles to 'admin'
UPDATE user_brands 
SET role = 'admin' 
WHERE role::text = 'brand_admin';

-- Update RLS policies that might reference 'brand_admin'
-- (Already handled in policies above which use 'admin')

-- ============================================================================
-- From 20250120000005_link_haagen_dazs_to_brand.sql
-- ============================================================================

-- Will be handled in data section

-- ============================================================================
-- From 20250120000000_add_product_ingredient_associations.sql
-- ============================================================================

-- Will be handled in data section

-- ============================================================================
-- DATA MIGRATIONS
-- ============================================================================

-- Link Häagen-Dazs master claim brand to the actual brand
DO $$
DECLARE
    v_haagen_dazs_id UUID;
    v_brand_master_claim_id UUID;
BEGIN
    -- Get the Häagen-Dazs brand ID
    SELECT id INTO v_haagen_dazs_id 
    FROM brands 
    WHERE LOWER(name) = 'häagen-dazs' 
    LIMIT 1;
    
    -- Get the brand_master_claim ID that represents Häagen-Dazs
    SELECT id INTO v_brand_master_claim_id
    FROM brand_master_claims
    WHERE LOWER(name) LIKE '%häagen%dazs%'
       OR LOWER(name) LIKE '%haagen%dazs%'
    LIMIT 1;
    
    -- Only proceed if both exist
    IF v_haagen_dazs_id IS NOT NULL AND v_brand_master_claim_id IS NOT NULL THEN
        -- Insert the association if it doesn't exist
        INSERT INTO brand_master_claim_brands (brand_master_claim_id, brand_id)
        VALUES (v_brand_master_claim_id, v_haagen_dazs_id)
        ON CONFLICT (brand_master_claim_id, brand_id) DO NOTHING;
        
        RAISE NOTICE 'Successfully linked Häagen-Dazs brand to master claim brand';
    ELSE
        RAISE WARNING 'Could not find Häagen-Dazs brand or master claim brand. Brand ID: %, Master Claim ID: %', 
                      v_haagen_dazs_id, v_brand_master_claim_id;
    END IF;
END $$;

-- Insert Häagen-Dazs claims data
DO $$
DECLARE
    v_haagen_dazs_id UUID;
BEGIN
    -- Get Häagen-Dazs brand ID
    SELECT id INTO v_haagen_dazs_id FROM brands WHERE name = 'Häagen-Dazs';
    
    IF v_haagen_dazs_id IS NOT NULL THEN
        -- Insert brand-level claims
        INSERT INTO brand_master_claims (name, simplified_version, level, type, category, country_code, created_by) VALUES
        ('Made with only cream, milk, sugar, eggs', 'Simple natural ingredients', 'brand', 'allowed', 'Ingredient Simplicity', 'US', auth.uid()),
        ('No artificial flavors or colors', 'No artificial ingredients', 'brand', 'allowed', 'No/No/No', 'US', auth.uid()),
        ('Made with care', 'Carefully crafted', 'brand', 'allowed', 'Craftmanship', 'US', auth.uid())
        ON CONFLICT (name, level, country_code) DO NOTHING;
        
        -- Link claims to brand
        INSERT INTO brand_master_claim_brands (brand_master_claim_id, brand_id)
        SELECT id, v_haagen_dazs_id FROM brand_master_claims 
        WHERE name IN (
            'Made with only cream, milk, sugar, eggs',
            'No artificial flavors or colors',
            'Made with care'
        )
        ON CONFLICT (brand_master_claim_id, brand_id) DO NOTHING;
    END IF;
END $$;

-- Add product-ingredient associations
DO $$
DECLARE
    v_product RECORD;
    v_ingredient RECORD;
    v_ingredient_names TEXT[];
BEGIN
    -- Define product-ingredient mappings
    FOR v_product IN 
        SELECT 'Vanilla Bean Ice Cream 460ml/406g' as name, 
               ARRAY['Milk fat and milk solids', 'Sugar', 'Concentrated skim milk', 'Egg yolk', 'Vanilla extract'] as ingredients
        UNION ALL
        SELECT 'Belgian Chocolate Ice Cream 460ml/392g', 
               ARRAY['Milk fat and milk solids', 'Sugar', 'Cocoa powder processed with alkali', 'Egg yolk']
        -- Add more products as needed
    LOOP
        -- Get product ID
        SELECT id INTO v_product.id FROM products WHERE name = v_product.name;
        
        IF v_product.id IS NOT NULL THEN
            -- Process each ingredient
            FOREACH v_ingredient_names SLICE 0 IN ARRAY v_product.ingredients
            LOOP
                -- Get ingredient ID
                SELECT id INTO v_ingredient.id FROM ingredients WHERE name = v_ingredient_names[1];
                
                IF v_ingredient.id IS NOT NULL THEN
                    -- Create association
                    INSERT INTO product_ingredients (product_id, ingredient_id)
                    VALUES (v_product.id, v_ingredient.id)
                    ON CONFLICT (product_id, ingredient_id) DO NOTHING;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ============================================================================
-- SEPARATE NON-TRANSACTIONAL OPERATIONS
-- ============================================================================
-- The following must be run separately after the main migration:

-- From 20250702000002_enable_global_claims_blocking_part2.sql
-- This creates an index CONCURRENTLY which cannot be run in a transaction
-- Run this separately:
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_master_claims_globally_blocked 
-- ON brand_master_claims(is_globally_blocked) 
-- WHERE is_globally_blocked = true;
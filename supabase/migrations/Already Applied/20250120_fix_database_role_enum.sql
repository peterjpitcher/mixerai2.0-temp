-- Fix database function using wrong role enum value
-- The get_user_templates function is checking for 'superadmin' but the actual enum values are 'admin', 'editor', 'viewer'

-- Update the get_user_templates function to use correct role enum value
CREATE OR REPLACE FUNCTION get_user_templates(p_user_id uuid, p_brand_id uuid DEFAULT NULL)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    category text,
    template_structure jsonb,
    content_type_id uuid,
    brand_id uuid,
    created_by uuid,
    created_at timestamptz,
    updated_at timestamptz,
    is_active boolean,
    usage_count integer,
    brand_name text,
    content_type_name text,
    creator_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role text;
BEGIN
    -- Get user's global role from user_metadata
    SELECT (raw_user_meta_data->>'role')::text INTO v_user_role
    FROM auth.users
    WHERE id = p_user_id;

    -- Changed from 'superadmin' to 'admin' to match actual enum values
    IF v_user_role = 'admin' THEN
        -- Global admins can see all templates
        RETURN QUERY
        SELECT 
            t.id,
            t.name,
            t.description,
            t.category,
            t.template_structure,
            t.content_type_id,
            t.brand_id,
            t.created_by,
            t.created_at,
            t.updated_at,
            t.is_active,
            t.usage_count,
            b.name as brand_name,
            ct.name as content_type_name,
            p.full_name as creator_name
        FROM content_templates t
        LEFT JOIN brands b ON t.brand_id = b.id
        LEFT JOIN content_types ct ON t.content_type_id = ct.id
        LEFT JOIN profiles p ON t.created_by = p.id
        WHERE t.is_active = true
        AND (p_brand_id IS NULL OR t.brand_id = p_brand_id)
        ORDER BY t.created_at DESC;
    ELSE
        -- Non-admin users: filter by their brand permissions
        RETURN QUERY
        SELECT 
            t.id,
            t.name,
            t.description,
            t.category,
            t.template_structure,
            t.content_type_id,
            t.brand_id,
            t.created_by,
            t.created_at,
            t.updated_at,
            t.is_active,
            t.usage_count,
            b.name as brand_name,
            ct.name as content_type_name,
            p.full_name as creator_name
        FROM content_templates t
        LEFT JOIN brands b ON t.brand_id = b.id
        LEFT JOIN content_types ct ON t.content_type_id = ct.id
        LEFT JOIN profiles p ON t.created_by = p.id
        WHERE t.is_active = true
        AND (p_brand_id IS NULL OR t.brand_id = p_brand_id)
        AND (
            -- User has permission for this brand
            t.brand_id IN (
                SELECT ubp.brand_id 
                FROM user_brand_permissions ubp 
                WHERE ubp.user_id = p_user_id
            )
            -- Or template has no brand (global template)
            OR t.brand_id IS NULL
        )
        ORDER BY t.created_at DESC;
    END IF;
END;
$$;

-- Add comment to document the change
COMMENT ON FUNCTION get_user_templates IS 'Returns templates accessible to a user based on their global role (admin) or brand permissions';
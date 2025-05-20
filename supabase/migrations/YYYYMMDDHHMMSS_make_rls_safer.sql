-- Supabase Migration: Make RLS policies for admin checks safer

BEGIN;

-- Step 1: Create a helper function to safely get the user role from JWT metadata
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    metadata_text TEXT;
    user_role_from_metadata TEXT;
BEGIN
    -- Attempt to get user_metadata from the JWT.
    -- This expression itself (auth.jwt() ->> 'user_metadata') should not error out even if claims are missing.
    metadata_text := auth.jwt() ->> 'user_metadata';

    -- If user_metadata claim is not present or is SQL NULL
    IF metadata_text IS NULL THEN
        RETURN NULL; 
    END IF;

    -- Safely attempt to parse metadata_text as JSONB and extract the role
    BEGIN
        IF jsonb_typeof(metadata_text::jsonb) = 'object' THEN
            user_role_from_metadata := metadata_text::jsonb ->> 'role';
            RETURN user_role_from_metadata; -- This will be NULL if 'role' key doesn't exist
        ELSE
            -- It was valid JSON, but not a JSON object (e.g., a JSON array or scalar)
            RETURN NULL;
        END IF;
    EXCEPTION
        WHEN invalid_text_representation THEN 
            -- This catches errors if metadata_text is not valid JSON and casting to jsonb fails.
            RETURN NULL;
        WHEN others THEN
            -- For any other unexpected errors during JSON processing.
            -- You could log this error for debugging if necessary:
            -- RAISE WARNING 'Unexpected error processing user_metadata for auth.uid(): % - % ', auth.uid(), SQLERRM;
            RETURN NULL;
    END;
END;
$$;

-- Grant necessary permissions on the function.
-- Authenticated users need to be able to execute this if it's used in their RLS policies.
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

COMMENT ON FUNCTION public.get_current_user_role() IS 
'Safely retrieves the role from the user_metadata claim in the auth.jwt() token. 
Returns the role as text if found, or NULL if metadata is missing, not valid JSON, not an object, or the role key is not present.';

-- Step 2: Update RLS policy for the 'brands' table
-- This policy allows users with global admin role full access to brands.
ALTER POLICY rls_brands_admin_all_access ON public.brands
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

COMMENT ON POLICY rls_brands_admin_all_access ON public.brands IS 
'Ensures only users with "admin" role (checked safely) can perform any operation on brands.';

-- Step 3: Update RLS policy for the 'user_brand_permissions' table
-- This policy allows users with global admin role full access to user_brand_permissions.
-- Note: The policy name has spaces, so it needs to be double-quoted.
ALTER POLICY "Global Admins can manage user_brand_permissions" ON public.user_brand_permissions
USING (public.get_current_user_role() = 'admin')
WITH CHECK (public.get_current_user_role() = 'admin');

COMMENT ON POLICY "Global Admins can manage user_brand_permissions" ON public.user_brand_permissions IS 
'Ensures only users with "admin" role (checked safely) can manage user_brand_permissions.';

-- Step 4: Update RLS policy rls_brands_brand_admin_select_assigned for 'brands' table
ALTER POLICY rls_brands_brand_admin_select_assigned ON public.brands
USING (
  (EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ((ubp.brand_id = brands.id) AND (ubp.user_id = auth.uid()) AND (ubp.role = 'brand_admin'::public.user_brand_role_enum))
  )) AND 
  (public.get_current_user_role() IS NULL OR public.get_current_user_role() <> 'admin') -- Ensures user is not a global admin
);

COMMENT ON POLICY rls_brands_brand_admin_select_assigned ON public.brands IS 
'Brand admins (who are not global admins) can select their assigned brands. Uses safe role check.';

-- Step 5: Update RLS policy rls_brands_brand_admin_update_assigned for 'brands' table
ALTER POLICY rls_brands_brand_admin_update_assigned ON public.brands
USING (
  (EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ((ubp.brand_id = brands.id) AND (ubp.user_id = auth.uid()) AND (ubp.role = 'brand_admin'::public.user_brand_role_enum))
  )) AND 
  (public.get_current_user_role() IS NULL OR public.get_current_user_role() <> 'admin') -- Ensures user is not a global admin
)
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ((ubp.brand_id = brands.id) AND (ubp.user_id = auth.uid()) AND (ubp.role = 'brand_admin'::public.user_brand_role_enum))
  )) AND 
  (public.get_current_user_role() IS NULL OR public.get_current_user_role() <> 'admin') -- Ensures user is not a global admin
);

COMMENT ON POLICY rls_brands_brand_admin_update_assigned ON public.brands IS 
'Brand admins (who are not global admins) can update their assigned brands. Uses safe role check.';

COMMIT; 
BEGIN;

-- This migration assumes that the column `public.user_brand_permissions.role` 
-- is of type `public.user_role` (which includes 'admin', 'editor', 'viewer')
-- and that an 'admin' in this context means a Brand Administrator for that specific brand.

-- Policy: Admins can insert brands
-- This policy allows a user to insert a brand if they have an 'admin' role in user_brand_permissions for ANY brand.
-- This might need more specific logic if the intent is different (e.g., only global admins can insert brands).
ALTER POLICY "Admins can insert brands" ON public.brands
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_brand_permissions
    WHERE user_brand_permissions.user_id = auth.uid()
      AND user_brand_permissions.role = 'admin'::public.user_brand_role_enum
  )
);

COMMENT ON POLICY "Admins can insert brands" ON public.brands IS
'Users with a brand_admin role for any brand in user_brand_permissions can insert new brands. Uses user_brand_role_enum.';


-- Policy: Admins can update their brands
ALTER POLICY "Admins can update their brands" ON public.brands
USING (
  EXISTS (
    SELECT 1
    FROM public.user_brand_permissions
    WHERE user_brand_permissions.user_id = auth.uid()
      AND user_brand_permissions.brand_id = brands.id
      AND user_brand_permissions.role = 'admin'::public.user_brand_role_enum
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_brand_permissions
    WHERE user_brand_permissions.user_id = auth.uid()
      AND user_brand_permissions.brand_id = brands.id
      AND user_brand_permissions.role = 'admin'::public.user_brand_role_enum
  )
);

COMMENT ON POLICY "Admins can update their brands" ON public.brands IS
'Users with a brand_admin role for a specific brand in user_brand_permissions can update that brand. Uses user_brand_role_enum.';


-- Policy: Admins can delete their brands
ALTER POLICY "Admins can delete their brands" ON public.brands
USING (
  EXISTS (
    SELECT 1
    FROM public.user_brand_permissions
    WHERE user_brand_permissions.user_id = auth.uid()
      AND user_brand_permissions.brand_id = brands.id
      AND user_brand_permissions.role = 'admin'::public.user_brand_role_enum
  )
);

COMMENT ON POLICY "Admins can delete their brands" ON public.brands IS
'Users with a brand_admin role for a specific brand in user_brand_permissions can delete that brand. Uses user_brand_role_enum.';


-- Policy: rls_brands_brand_admin_select_assigned
-- This policy allows users who are brand admins (role 'admin' in user_brand_permissions for that brand)
-- AND are NOT global admins (checked via get_current_user_role()) to select assigned brands.
ALTER POLICY rls_brands_brand_admin_select_assigned ON public.brands
USING (
  (EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ((ubp.brand_id = brands.id) AND (ubp.user_id = auth.uid()) AND (ubp.role = 'admin'::public.user_brand_role_enum ))
  )) AND
  (public.get_current_user_role() IS NULL OR public.get_current_user_role() <> 'admin')
);

COMMENT ON POLICY rls_brands_brand_admin_select_assigned ON public.brands IS
'Brand admins (role ''admin'' for that brand, not global admin) can select assigned brands. Uses user_brand_role_enum and safe global role check.';


-- Policy: rls_brands_brand_admin_update_assigned
-- This policy allows users who are brand admins (role 'admin' in user_brand_permissions for that brand)
-- AND are NOT global admins (checked via get_current_user_role()) to update assigned brands.
ALTER POLICY rls_brands_brand_admin_update_assigned ON public.brands
USING (
  (EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ((ubp.brand_id = brands.id) AND (ubp.user_id = auth.uid()) AND (ubp.role = 'admin'::public.user_brand_role_enum ))
  )) AND
  (public.get_current_user_role() IS NULL OR public.get_current_user_role() <> 'admin')
)
WITH CHECK (
  (EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ((ubp.brand_id = brands.id) AND (ubp.user_id = auth.uid()) AND (ubp.role = 'admin'::public.user_brand_role_enum ))
  )) AND
  (public.get_current_user_role() IS NULL OR public.get_current_user_role() <> 'admin')
);

COMMENT ON POLICY rls_brands_brand_admin_update_assigned ON public.brands IS
'Brand admins (role ''admin'' for that brand, not global admin) can update assigned brands. Uses user_brand_role_enum and safe global role check.';

COMMIT; 
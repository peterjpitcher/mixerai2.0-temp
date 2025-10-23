-- Simplify RLS on public.user_brand_permissions to eliminate recursive policies.
BEGIN;

-- Remove existing policies before dropping helper function
DROP POLICY IF EXISTS ubp_select ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_insert ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_update ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_delete ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_select_own ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_select_global_admin ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_write_service ON public.user_brand_permissions;

-- Drop helper that selects from the same table to avoid recursion
DROP FUNCTION IF EXISTS public.user_is_brand_admin(uuid);

-- Read access: owner can see their rows
CREATE POLICY ubp_select_own
  ON public.user_brand_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Read access: global admins (via existing helper) can view everything
CREATE POLICY ubp_select_global_admin
  ON public.user_brand_permissions
  FOR SELECT
  TO authenticated
  USING (public.is_global_admin());

-- All mutations restricted to service role (server-side operations)
CREATE POLICY ubp_write_service
  ON public.user_brand_permissions
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

ALTER TABLE public.user_brand_permissions
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_brand_permissions
  NO FORCE ROW LEVEL SECURITY;

COMMIT;

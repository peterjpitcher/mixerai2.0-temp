-- Harden user_brand_permissions RLS to avoid recursive lookups while preserving brand admin capabilities.
BEGIN;

-- Clean up any existing helper/policies to ensure deterministic state.
DROP FUNCTION IF EXISTS public.user_is_brand_admin_safe(uuid) CASCADE;

DROP POLICY IF EXISTS ubp_select ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_insert ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_update ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_delete ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_select_own ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_select_global_admin ON public.user_brand_permissions;
DROP POLICY IF EXISTS ubp_write_service ON public.user_brand_permissions;

-- Dedicated helper that disables RLS inside the SECURITY DEFINER context so we do not recurse.
CREATE OR REPLACE FUNCTION public.user_is_brand_admin_safe(p_brand_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access boolean := false;
BEGIN
  -- Disable RLS checks for the internal verification query.
  PERFORM set_config('row_security', 'off', true);

  SELECT EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ubp.user_id = auth.uid()
      AND ubp.brand_id = p_brand_id
      AND ubp.role = 'admin'
  )
  INTO has_access;

  RETURN has_access;
END;
$$;

ALTER FUNCTION public.user_is_brand_admin_safe(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.user_is_brand_admin_safe(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_brand_admin_safe(uuid)
  TO anon, authenticated, service_role;

-- Allow authenticated users to read their rows or any brand they administer.
CREATE POLICY ubp_select
ON public.user_brand_permissions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_is_brand_admin_safe(brand_id)
  OR public.is_global_admin()
);

-- Allow authenticated brand administrators to add members to their brands.
CREATE POLICY ubp_insert
ON public.user_brand_permissions
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_is_brand_admin_safe(brand_id)
  OR public.is_global_admin()
);

-- Allow authenticated brand administrators to update/delete rows for their brands.
CREATE POLICY ubp_update
ON public.user_brand_permissions
FOR UPDATE
TO authenticated
USING (
  public.user_is_brand_admin_safe(brand_id)
  OR public.is_global_admin()
)
WITH CHECK (
  public.user_is_brand_admin_safe(brand_id)
  OR public.is_global_admin()
);

CREATE POLICY ubp_delete
ON public.user_brand_permissions
FOR DELETE
TO authenticated
USING (
  public.user_is_brand_admin_safe(brand_id)
  OR public.is_global_admin()
);

-- Service role retains unrestricted access for server-side maintenance.
CREATE POLICY ubp_service_role_all
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

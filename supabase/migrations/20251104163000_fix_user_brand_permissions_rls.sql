-- Fix recursive RLS policy on public.user_brand_permissions and replace with safe helpers
BEGIN;

-- Stage 1: remove the recursive policy and ensure basic access continues
DROP POLICY IF EXISTS "Only brand admins can manage permissions"
  ON public.user_brand_permissions;

DROP POLICY IF EXISTS ubp_select_own
  ON public.user_brand_permissions;

DROP POLICY IF EXISTS ubp_write_service
  ON public.user_brand_permissions;

-- Temporary read policy (users can see their own rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_brand_permissions'
      AND policyname = 'ubp_select_own'
  ) THEN
    CREATE POLICY ubp_select_own
      ON public.user_brand_permissions
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END$$;

-- Temporary write lockdown (service role only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'user_brand_permissions'
      AND policyname = 'ubp_write_service'
  ) THEN
    CREATE POLICY ubp_write_service
      ON public.user_brand_permissions
      FOR ALL
      TO service_role
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END$$;

ALTER TABLE public.user_brand_permissions
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_brand_permissions
  NO FORCE ROW LEVEL SECURITY;

-- Stage 2: introduce SECURITY DEFINER helper and principle-of-least-privilege policies
CREATE OR REPLACE FUNCTION public.user_is_brand_admin(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ubp.user_id  = auth.uid()
      AND ubp.brand_id = p_brand_id
      AND ubp.role     = 'admin'
  );
$$;

ALTER FUNCTION public.user_is_brand_admin(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.user_is_brand_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_brand_admin(uuid)
  TO anon, authenticated, service_role;

-- Replace temporary policies with final set
DROP POLICY IF EXISTS ubp_select_own
  ON public.user_brand_permissions;

DROP POLICY IF EXISTS ubp_write_service
  ON public.user_brand_permissions;

DROP POLICY IF EXISTS ubp_select
  ON public.user_brand_permissions;

DROP POLICY IF EXISTS ubp_insert
  ON public.user_brand_permissions;

DROP POLICY IF EXISTS ubp_update
  ON public.user_brand_permissions;

DROP POLICY IF EXISTS ubp_delete
  ON public.user_brand_permissions;

CREATE POLICY ubp_select
ON public.user_brand_permissions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_is_brand_admin(brand_id)
);

CREATE POLICY ubp_insert
ON public.user_brand_permissions
FOR INSERT
TO authenticated
WITH CHECK (public.user_is_brand_admin(brand_id));

CREATE POLICY ubp_update
ON public.user_brand_permissions
FOR UPDATE
TO authenticated
USING (public.user_is_brand_admin(brand_id))
WITH CHECK (public.user_is_brand_admin(brand_id));

CREATE POLICY ubp_delete
ON public.user_brand_permissions
FOR DELETE
TO authenticated
USING (public.user_is_brand_admin(brand_id));

COMMIT;

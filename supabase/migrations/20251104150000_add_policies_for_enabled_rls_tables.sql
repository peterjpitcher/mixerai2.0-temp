-- Add baseline RLS policies for tables where RLS was recently enabled
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

-- Shared predicate helpers
CREATE OR REPLACE FUNCTION public.has_brand_access(p_brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ubp.user_id = auth.uid()
      AND ubp.brand_id = p_brand_id
  ) OR public.is_global_admin();
$$;

GRANT EXECUTE ON FUNCTION public.has_brand_access TO authenticated;

-- brand_selected_agencies
DROP POLICY IF EXISTS "Brand users can view selected agencies" ON public.brand_selected_agencies;
CREATE POLICY "Brand users can view selected agencies"
ON public.brand_selected_agencies
FOR SELECT
TO authenticated
USING (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Brand admins can manage selected agencies" ON public.brand_selected_agencies;
CREATE POLICY "Brand admins can manage selected agencies"
ON public.brand_selected_agencies
TO authenticated
USING (
  public.is_global_admin()
  OR EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ubp.user_id = auth.uid()
      AND ubp.brand_id = brand_selected_agencies.brand_id
      AND ubp.role = 'admin'
  )
)
WITH CHECK (
  public.is_global_admin()
  OR EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ubp.user_id = auth.uid()
      AND ubp.brand_id = brand_selected_agencies.brand_id
      AND ubp.role = 'admin'
  )
);

-- claims workflows and steps
DROP POLICY IF EXISTS "Users can view claims workflows" ON public.claims_workflows;
CREATE POLICY "Users can view claims workflows"
ON public.claims_workflows
FOR SELECT
TO authenticated
USING (public.has_brand_access(brand_id));

DROP POLICY IF EXISTS "Users can view claims workflow steps" ON public.claims_workflow_steps;
CREATE POLICY "Users can view claims workflow steps"
ON public.claims_workflow_steps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.claims_workflows cw
    WHERE cw.id = claims_workflow_steps.workflow_id
      AND public.has_brand_access(cw.brand_id)
  )
);

-- Claim workflow history (allow authenticated read until finer-grained policies are defined)
DROP POLICY IF EXISTS "Allow authenticated read of claim workflow history" ON public.claim_workflow_history;
CREATE POLICY "Allow authenticated read of claim workflow history"
ON public.claim_workflow_history
FOR SELECT
TO authenticated
USING (true);

-- Lookup tables that should be globally readable
DROP POLICY IF EXISTS "Allow authenticated read of content types" ON public.content_types;
CREATE POLICY "Allow authenticated read of content types"
ON public.content_types
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated read of countries" ON public.countries;
CREATE POLICY "Allow authenticated read of countries"
ON public.countries
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated read of ingredients" ON public.ingredients;
CREATE POLICY "Allow authenticated read of ingredients"
ON public.ingredients
FOR SELECT
TO authenticated
USING (true);

-- Content vetting agencies
DROP POLICY IF EXISTS "Allow authenticated read of vetting agencies" ON public.content_vetting_agencies;
CREATE POLICY "Allow authenticated read of vetting agencies"
ON public.content_vetting_agencies
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated read of vetting agency events" ON public.content_vetting_agency_events;
CREATE POLICY "Allow authenticated read of vetting agency events"
ON public.content_vetting_agency_events
FOR SELECT
TO authenticated
USING (true);

-- Market claim overrides
DROP POLICY IF EXISTS "Allow authenticated read of market claim overrides" ON public.market_claim_overrides;
CREATE POLICY "Allow authenticated read of market claim overrides"
ON public.market_claim_overrides
FOR SELECT
TO authenticated
USING (true);

-- Products and product ingredients
DROP POLICY IF EXISTS "Allow authenticated read of products" ON public.products;
CREATE POLICY "Allow authenticated read of products"
ON public.products
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Allow authenticated read of product ingredients" ON public.product_ingredients;
CREATE POLICY "Allow authenticated read of product ingredients"
ON public.product_ingredients
FOR SELECT
TO authenticated
USING (true);

-- Administrative / audit tables limited to global admins
DROP POLICY IF EXISTS "Global admins can read override audit" ON public.global_override_audit;
CREATE POLICY "Global admins can read override audit"
ON public.global_override_audit
FOR SELECT
TO authenticated
USING (public.is_global_admin());

DROP POLICY IF EXISTS "Global admins can read invitation logs" ON public.invitation_logs;
CREATE POLICY "Global admins can read invitation logs"
ON public.invitation_logs
FOR SELECT
TO authenticated
USING (public.is_global_admin());

DROP POLICY IF EXISTS "Global admins can read system roles" ON public.user_system_roles;
CREATE POLICY "Global admins can read system roles"
ON public.user_system_roles
FOR SELECT
TO authenticated
USING (public.is_global_admin());

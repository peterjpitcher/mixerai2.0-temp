-- Enable row level security on remaining tables and enforce MFA-aware policies
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION public.require_aal2()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

COMMENT ON FUNCTION public.require_aal2() IS
  'Returns true when the current session JWT indicates an AAL2 (multi-factor) authentication level.';

GRANT EXECUTE ON FUNCTION public.require_aal2() TO authenticated;
GRANT EXECUTE ON FUNCTION public.require_aal2() TO anon;

-- Enable RLS on tables that previously relied on grants alone
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_master_claim_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_selected_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_vetting_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_override_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_claim_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_run_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_brand_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_user_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_vetting_agency_events ENABLE ROW LEVEL SECURITY;

-- MFA-aware policy updates
DROP POLICY IF EXISTS "Security logs - Global admins can view all" ON public.security_logs;
CREATE POLICY "Security logs - Global admins can view all"
ON public.security_logs
FOR SELECT
TO authenticated
USING (public.is_global_admin() AND public.require_aal2());

DROP POLICY IF EXISTS "Only brand admins can modify permissions" ON public.user_brand_permissions;
CREATE POLICY "Only brand admins can modify permissions"
ON public.user_brand_permissions
TO authenticated
USING (
  public.require_aal2()
  AND EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ubp.user_id = auth.uid()
      AND ubp.brand_id = user_brand_permissions.brand_id
      AND ubp.role = 'admin'
  )
)
WITH CHECK (
  public.require_aal2()
  AND EXISTS (
    SELECT 1
    FROM public.user_brand_permissions ubp
    WHERE ubp.user_id = auth.uid()
      AND ubp.brand_id = user_brand_permissions.brand_id
      AND ubp.role = 'admin'
  )
);

COMMENT ON POLICY "Only brand admins can modify permissions" ON public.user_brand_permissions IS
  'Brand administrators must have an AAL2 session to change brand permissions.';

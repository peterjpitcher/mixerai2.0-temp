-- Fix RLS policies for INSERT operations that require SELECT permissions
-- This migration adds missing SELECT policies to tables that have INSERT policies
-- to resolve "new row violates row-level security policy" errors

-- 1. brand_master_claim_brands - Add SELECT policy matching the INSERT/UPDATE/DELETE policy
CREATE POLICY IF NOT EXISTS "Users can view brand master claim brand links they can manage" 
ON public.brand_master_claim_brands
FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id FROM public.user_brand_permissions 
        WHERE brand_id = brand_master_claim_brands.brand_id AND role = 'admin'
    )
    OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- 2. tool_run_history - Add policies if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tool_run_history' 
        AND policyname = 'Users can insert their own tool runs'
    ) THEN
        CREATE POLICY "Users can insert their own tool runs" 
        ON public.tool_run_history
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tool_run_history' 
        AND policyname = 'Users can view their own tool runs'
    ) THEN
        CREATE POLICY "Users can view their own tool runs" 
        ON public.tool_run_history
        FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- 3. content_versions - Add SELECT policy for users who can insert
CREATE POLICY IF NOT EXISTS "Users can view content versions they created"
ON public.content_versions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.content 
        WHERE content.id = content_versions.content_id
        AND EXISTS (
            SELECT 1 FROM public.user_brand_permissions
            WHERE user_brand_permissions.user_id = auth.uid()
            AND user_brand_permissions.brand_id = content.brand_id
        )
    )
);

-- 4. user_tasks - Add policies if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_tasks') THEN
        -- INSERT policy
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'user_tasks' 
            AND policyname = 'Users can create their own tasks'
        ) THEN
            CREATE POLICY "Users can create their own tasks" 
            ON public.user_tasks
            FOR INSERT
            WITH CHECK (auth.uid() = created_by);
        END IF;

        -- SELECT policy
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'user_tasks' 
            AND policyname = 'Users can view their own tasks'
        ) THEN
            CREATE POLICY "Users can view their own tasks" 
            ON public.user_tasks
            FOR SELECT
            USING (auth.uid() = created_by OR auth.uid() = assigned_to);
        END IF;
    END IF;
END $$;

-- 5. workflow_invitations - Add SELECT policy for users who can manage workflows
CREATE POLICY IF NOT EXISTS "Users can view workflow invitations they manage"
ON public.workflow_invitations
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.workflows
        WHERE workflows.id = workflow_invitations.workflow_id
        AND EXISTS (
            SELECT 1 FROM public.user_brand_permissions
            WHERE user_brand_permissions.user_id = auth.uid()
            AND user_brand_permissions.brand_id = workflows.brand_id
            AND user_brand_permissions.role = 'admin'
        )
    )
    OR auth.uid() = invited_by
);

-- 6. notifications - Add SELECT policy for users to view their notifications
CREATE POLICY IF NOT EXISTS "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- 7. claim_reviews - Ensure SELECT policy exists
CREATE POLICY IF NOT EXISTS "Users can view claim reviews they can edit"
ON public.claim_reviews
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_brand_permissions
        WHERE user_brand_permissions.user_id = auth.uid()
        AND user_brand_permissions.brand_id = claim_reviews.master_claim_brand_id
        AND user_brand_permissions.role = ANY(ARRAY['editor', 'admin']::user_brand_role_enum[])
    )
);

-- 8. market_claim_overrides - Add policies based on brand permissions
CREATE POLICY IF NOT EXISTS "Brand admins can insert market claim overrides"
ON public.market_claim_overrides
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.claims
        WHERE claims.id = market_claim_overrides.claim_id
        AND EXISTS (
            SELECT 1 FROM public.user_brand_permissions ubp
            JOIN public.products p ON p.master_claim_brand_id = claims.master_claim_brand_id
            WHERE ubp.user_id = auth.uid()
            AND ubp.role = 'admin'
            -- Note: This might need adjustment based on your actual schema relationships
        )
    )
    OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY IF NOT EXISTS "Users can view market claim overrides"
ON public.market_claim_overrides
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.claims
        WHERE claims.id = market_claim_overrides.claim_id
        AND EXISTS (
            SELECT 1 FROM public.user_brand_permissions ubp
            JOIN public.products p ON p.master_claim_brand_id = claims.master_claim_brand_id
            WHERE ubp.user_id = auth.uid()
        )
    )
    OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- 9. Enable RLS on tables that might not have it enabled
ALTER TABLE public.tool_run_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_claim_overrides ENABLE ROW LEVEL SECURITY;

-- 10. Add comment explaining the fix
COMMENT ON SCHEMA public IS 'This schema includes RLS policies that ensure INSERT operations have corresponding SELECT policies to prevent "new row violates row-level security policy" errors when Supabase returns inserted data.';
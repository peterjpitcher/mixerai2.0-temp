-- Migration: Create Claims Workflows
-- Description: Creates a separate workflow system specifically for claims approval
-- Date: 2025-01-17

-- Create claims_workflows table (separate from content workflows)
CREATE TABLE IF NOT EXISTS public.claims_workflows (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    UNIQUE(name, brand_id)
);

-- Create claims_workflow_steps table
CREATE TABLE IF NOT EXISTS public.claims_workflow_steps (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES public.claims_workflows(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'legal', 'compliance', 'marketing')),
    approval_required BOOLEAN DEFAULT true NOT NULL,
    assigned_user_ids UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(workflow_id, step_order)
);

-- Update claims table to reference claims_workflows instead of workflows
ALTER TABLE public.claims 
DROP CONSTRAINT IF EXISTS claims_workflow_id_fkey;

ALTER TABLE public.claims 
ADD CONSTRAINT claims_workflow_id_fkey 
FOREIGN KEY (workflow_id) REFERENCES public.claims_workflows(id) ON DELETE SET NULL;

-- Update claim_workflow_history to reference claims_workflow_steps
ALTER TABLE public.claim_workflow_history
DROP CONSTRAINT IF EXISTS claim_workflow_history_workflow_step_id_fkey;

ALTER TABLE public.claim_workflow_history
ADD CONSTRAINT claim_workflow_history_workflow_step_id_fkey
FOREIGN KEY (workflow_step_id) REFERENCES public.claims_workflow_steps(id) ON DELETE SET NULL;

-- Update claims table to reference claims_workflow_steps for current step
ALTER TABLE public.claims
DROP CONSTRAINT IF EXISTS claims_current_workflow_step_fkey;

ALTER TABLE public.claims
ADD CONSTRAINT claims_current_workflow_step_fkey
FOREIGN KEY (current_workflow_step) REFERENCES public.claims_workflow_steps(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_claims_workflows_brand_id ON public.claims_workflows(brand_id);
CREATE INDEX IF NOT EXISTS idx_claims_workflows_created_by ON public.claims_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_claims_workflow_steps_workflow_id ON public.claims_workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_claims_workflow_steps_assigned_users ON public.claims_workflow_steps USING GIN(assigned_user_ids);

-- Update the claims_pending_approval view to use claims_workflows
CREATE OR REPLACE VIEW public.claims_pending_approval AS
SELECT 
    c.id,
    c.claim_text,
    c.claim_type,
    c.level,
    c.description,
    c.workflow_id,
    c.current_workflow_step,
    c.workflow_status,
    c.created_at,
    c.created_by,
    w.name as workflow_name,
    ws.name as current_step_name,
    ws.role as current_step_role,
    ws.assigned_user_ids as current_step_assignees,
    p.full_name as creator_name,
    CASE 
        WHEN c.level = 'brand' THEN mcb.name
        WHEN c.level = 'product' THEN prod.name
        WHEN c.level = 'ingredient' THEN ing.name
    END as entity_name
FROM public.claims c
LEFT JOIN public.claims_workflows w ON c.workflow_id = w.id
LEFT JOIN public.claims_workflow_steps ws ON c.current_workflow_step = ws.id
LEFT JOIN public.profiles p ON c.created_by = p.id
LEFT JOIN public.master_claim_brands mcb ON c.master_brand_id = mcb.id
LEFT JOIN public.products prod ON c.product_id = prod.id
LEFT JOIN public.ingredients ing ON c.ingredient_id = ing.id
WHERE c.workflow_status IN ('pending_review')
  AND c.workflow_id IS NOT NULL;

-- Update advance_claim_workflow function to use claims_workflow_steps
CREATE OR REPLACE FUNCTION public.advance_claim_workflow(
    p_claim_id UUID,
    p_action TEXT, -- 'approve' or 'reject'
    p_feedback TEXT,
    p_reviewer_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_step UUID;
    v_workflow_id UUID;
    v_next_step UUID;
    v_result JSONB;
BEGIN
    -- Get current workflow info
    SELECT current_workflow_step, workflow_id 
    INTO v_current_step, v_workflow_id
    FROM public.claims
    WHERE id = p_claim_id;

    -- Log the action in history
    INSERT INTO public.claim_workflow_history (
        claim_id,
        workflow_step_id,
        step_name,
        action_status,
        feedback,
        reviewer_id
    )
    SELECT 
        p_claim_id,
        v_current_step,
        ws.name,
        CASE 
            WHEN p_action = 'approve' THEN 'approved'
            WHEN p_action = 'reject' THEN 'rejected'
            ELSE 'pending_review'
        END,
        p_feedback,
        p_reviewer_id
    FROM public.claims_workflow_steps ws
    WHERE ws.id = v_current_step;

    -- Handle approval
    IF p_action = 'approve' THEN
        -- Find next step
        SELECT ws2.id INTO v_next_step
        FROM public.claims_workflow_steps ws1
        JOIN public.claims_workflow_steps ws2 ON ws1.workflow_id = ws2.workflow_id 
            AND ws2.step_order = ws1.step_order + 1
        WHERE ws1.id = v_current_step;

        IF v_next_step IS NOT NULL THEN
            -- Move to next step
            UPDATE public.claims
            SET current_workflow_step = v_next_step,
                workflow_status = 'pending_review',
                updated_at = NOW()
            WHERE id = p_claim_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'message', 'Claim approved and moved to next step',
                'next_step_id', v_next_step
            );
        ELSE
            -- No more steps - mark as approved
            UPDATE public.claims
            SET workflow_status = 'approved',
                updated_at = NOW()
            WHERE id = p_claim_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'message', 'Claim fully approved',
                'status', 'approved'
            );
        END IF;
    
    -- Handle rejection
    ELSIF p_action = 'reject' THEN
        UPDATE public.claims
        SET workflow_status = 'rejected',
            updated_at = NOW()
        WHERE id = p_claim_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Claim rejected',
            'status', 'rejected'
        );
    
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Invalid action. Must be approve or reject'
        );
    END IF;

    RETURN v_result;
END;
$$;

-- Update assign_workflow_to_claim function to use claims_workflow_steps
CREATE OR REPLACE FUNCTION public.assign_workflow_to_claim(
    p_claim_id UUID,
    p_workflow_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_first_step UUID;
    v_result JSONB;
BEGIN
    -- Get first step of workflow
    SELECT id INTO v_first_step
    FROM public.claims_workflow_steps
    WHERE workflow_id = p_workflow_id
    ORDER BY step_order
    LIMIT 1;

    IF v_first_step IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Workflow has no steps defined'
        );
    END IF;

    -- Update claim with workflow
    UPDATE public.claims
    SET workflow_id = p_workflow_id,
        current_workflow_step = v_first_step,
        workflow_status = 'pending_review',
        updated_at = NOW()
    WHERE id = p_claim_id;

    -- Create initial history entry
    INSERT INTO public.claim_workflow_history (
        claim_id,
        workflow_step_id,
        step_name,
        action_status,
        feedback,
        reviewer_id
    )
    SELECT 
        p_claim_id,
        v_first_step,
        ws.name,
        'pending_review',
        'Workflow assigned to claim',
        NULL
    FROM public.claims_workflow_steps ws
    WHERE ws.id = v_first_step;

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Workflow assigned successfully',
        'workflow_id', p_workflow_id,
        'first_step_id', v_first_step
    );

    RETURN v_result;
END;
$$;

-- Add RLS policies for claims_workflows
ALTER TABLE public.claims_workflows ENABLE ROW LEVEL SECURITY;

-- Users can view workflows for brands they have access to
CREATE POLICY claims_workflows_select_policy ON public.claims_workflows
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_brand_permissions
        WHERE user_id = auth.uid()
        AND brand_id = claims_workflows.brand_id
    )
    OR
    created_by = auth.uid()
);

-- Only brand admins can create workflows
CREATE POLICY claims_workflows_insert_policy ON public.claims_workflows
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_brand_permissions
        WHERE user_id = auth.uid()
        AND brand_id = claims_workflows.brand_id
        AND role = 'admin'
    )
);

-- Only brand admins can update workflows
CREATE POLICY claims_workflows_update_policy ON public.claims_workflows
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.user_brand_permissions
        WHERE user_id = auth.uid()
        AND brand_id = claims_workflows.brand_id
        AND role = 'admin'
    )
);

-- Only brand admins can delete workflows
CREATE POLICY claims_workflows_delete_policy ON public.claims_workflows
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.user_brand_permissions
        WHERE user_id = auth.uid()
        AND brand_id = claims_workflows.brand_id
        AND role = 'admin'
    )
);

-- Add RLS policies for claims_workflow_steps
ALTER TABLE public.claims_workflow_steps ENABLE ROW LEVEL SECURITY;

-- Users can view steps for workflows they can access
CREATE POLICY claims_workflow_steps_select_policy ON public.claims_workflow_steps
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.claims_workflows cw
        JOIN public.user_brand_permissions ubp ON ubp.brand_id = cw.brand_id
        WHERE cw.id = claims_workflow_steps.workflow_id
        AND ubp.user_id = auth.uid()
    )
);

-- Only brand admins can manage workflow steps
CREATE POLICY claims_workflow_steps_insert_policy ON public.claims_workflow_steps
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.claims_workflows cw
        JOIN public.user_brand_permissions ubp ON ubp.brand_id = cw.brand_id
        WHERE cw.id = claims_workflow_steps.workflow_id
        AND ubp.user_id = auth.uid()
        AND ubp.role = 'admin'
    )
);

CREATE POLICY claims_workflow_steps_update_policy ON public.claims_workflow_steps
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.claims_workflows cw
        JOIN public.user_brand_permissions ubp ON ubp.brand_id = cw.brand_id
        WHERE cw.id = claims_workflow_steps.workflow_id
        AND ubp.user_id = auth.uid()
        AND ubp.role = 'admin'
    )
);

CREATE POLICY claims_workflow_steps_delete_policy ON public.claims_workflow_steps
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.claims_workflows cw
        JOIN public.user_brand_permissions ubp ON ubp.brand_id = cw.brand_id
        WHERE cw.id = claims_workflow_steps.workflow_id
        AND ubp.user_id = auth.uid()
        AND ubp.role = 'admin'
    )
);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_workflows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.claims_workflow_steps TO authenticated;

-- Add comments
COMMENT ON TABLE public.claims_workflows IS 'Workflow definitions specifically for claims approval processes';
COMMENT ON TABLE public.claims_workflow_steps IS 'Steps within claims approval workflows';
COMMENT ON COLUMN public.claims_workflow_steps.role IS 'Role required to complete this step (includes legal, compliance, marketing)';
-- Migration: Add Claims Workflow Support
-- Description: Adds workflow support to claims table for approval processes
-- Date: 2024-12-16

-- Add workflow fields to claims table
ALTER TABLE public.claims 
ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS current_workflow_step UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS workflow_status public.content_status DEFAULT 'draft'::public.content_status;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_claims_workflow_id ON public.claims(workflow_id);
CREATE INDEX IF NOT EXISTS idx_claims_current_workflow_step ON public.claims(current_workflow_step);
CREATE INDEX IF NOT EXISTS idx_claims_workflow_status ON public.claims(workflow_status);

-- Create claims workflow history table for audit trail
CREATE TABLE IF NOT EXISTS public.claim_workflow_history (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    workflow_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
    step_name TEXT,
    action_status TEXT NOT NULL, -- 'approved', 'rejected', 'pending_review'
    feedback TEXT,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for claim workflow history
CREATE INDEX IF NOT EXISTS idx_claim_workflow_history_claim_id ON public.claim_workflow_history(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_workflow_history_created_at ON public.claim_workflow_history(created_at DESC);

-- Create view for claims pending approval
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
LEFT JOIN public.workflows w ON c.workflow_id = w.id
LEFT JOIN public.workflow_steps ws ON c.current_workflow_step = ws.id
LEFT JOIN public.profiles p ON c.created_by = p.id
LEFT JOIN public.master_claim_brands mcb ON c.master_brand_id = mcb.id
LEFT JOIN public.products prod ON c.product_id = prod.id
LEFT JOIN public.ingredients ing ON c.ingredient_id = ing.id
WHERE c.workflow_status IN ('pending_review')
  AND c.workflow_id IS NOT NULL;

-- Create function to advance claim through workflow
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
    FROM public.workflow_steps ws
    WHERE ws.id = v_current_step;

    -- Handle approval
    IF p_action = 'approve' THEN
        -- Find next step
        SELECT ws2.id INTO v_next_step
        FROM public.workflow_steps ws1
        JOIN public.workflow_steps ws2 ON ws1.workflow_id = ws2.workflow_id 
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

-- Create function to assign workflow to claim
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
    FROM public.workflow_steps
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
    FROM public.workflow_steps ws
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

-- Add RLS policies for claim workflow history
ALTER TABLE public.claim_workflow_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view claim workflow history for claims they can access
CREATE POLICY claim_workflow_history_select_policy ON public.claim_workflow_history
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.claims c
        WHERE c.id = claim_workflow_history.claim_id
        AND (
            -- User created the claim
            c.created_by = auth.uid()
            OR
            -- User is assigned to current workflow step
            EXISTS (
                SELECT 1 FROM public.workflow_steps ws
                WHERE ws.id = c.current_workflow_step
                AND auth.uid() = ANY(ws.assigned_user_ids)
            )
            OR
            -- User has brand permission
            EXISTS (
                SELECT 1 FROM public.user_brand_permissions ubp
                JOIN public.master_claim_brands mcb ON mcb.mixerai_brand_id = ubp.brand_id
                WHERE ubp.user_id = auth.uid()
                AND c.master_brand_id = mcb.id
            )
        )
    )
);

-- Policy: Only reviewers can insert workflow history
CREATE POLICY claim_workflow_history_insert_policy ON public.claim_workflow_history
FOR INSERT WITH CHECK (
    reviewer_id = auth.uid()
);

-- Grant necessary permissions
GRANT SELECT ON public.claims_pending_approval TO authenticated;
GRANT SELECT, INSERT ON public.claim_workflow_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.advance_claim_workflow TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_workflow_to_claim TO authenticated;

COMMENT ON COLUMN public.claims.workflow_id IS 'Optional workflow for claim approval process';
COMMENT ON COLUMN public.claims.current_workflow_step IS 'Current step in the approval workflow';
COMMENT ON COLUMN public.claims.workflow_status IS 'Status of the claim in the workflow';
COMMENT ON TABLE public.claim_workflow_history IS 'Audit trail of claim approval workflow actions';
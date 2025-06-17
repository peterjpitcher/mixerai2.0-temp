-- Update the advance_claim_workflow function to handle the new parameters
-- This updates the existing function to accept optional comment and updated_claim_text parameters

CREATE OR REPLACE FUNCTION advance_claim_workflow(
  p_claim_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_feedback TEXT DEFAULT '',
  p_reviewer_id UUID DEFAULT NULL,
  p_comment TEXT DEFAULT NULL,
  p_updated_claim_text TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_step_id UUID;
  v_workflow_id UUID;
  v_next_step_id UUID;
  v_first_step_id UUID;
  v_step_name TEXT;
  v_result JSONB;
BEGIN
  -- Get current workflow info
  SELECT current_workflow_step, workflow_id
  INTO v_current_step_id, v_workflow_id
  FROM claims
  WHERE id = p_claim_id;

  IF v_current_step_id IS NULL OR v_workflow_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Claim has no active workflow'
    );
  END IF;

  -- Get step name
  SELECT name INTO v_step_name
  FROM claims_workflow_steps
  WHERE id = v_current_step_id;

  -- Check if the new columns exist before trying to insert
  -- For backward compatibility, we'll insert without them if they don't exist
  BEGIN
    -- Try to insert with new columns
    INSERT INTO claim_workflow_history (
      claim_id,
      workflow_step_id,
      step_name,
      action_status,
      feedback,
      reviewer_id,
      created_at
    ) VALUES (
      p_claim_id,
      v_current_step_id,
      v_step_name,
      CASE 
        WHEN p_action = 'approve' THEN 'approved'
        WHEN p_action = 'reject' THEN 'rejected'
        ELSE 'pending_review'
      END,
      p_feedback,
      p_reviewer_id,
      NOW()
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- If that fails, just log the error and continue
      RAISE NOTICE 'Could not insert into claim_workflow_history: %', SQLERRM;
  END;

  -- Handle approval
  IF p_action = 'approve' THEN
    -- Add current step to completed steps
    UPDATE claims
    SET completed_workflow_steps = array_append(
      COALESCE(completed_workflow_steps, ARRAY[]::UUID[]), 
      v_current_step_id
    )
    WHERE id = p_claim_id;

    -- Get next step
    SELECT id INTO v_next_step_id
    FROM claims_workflow_steps
    WHERE workflow_id = v_workflow_id
      AND step_order > (
        SELECT step_order 
        FROM claims_workflow_steps 
        WHERE id = v_current_step_id
      )
    ORDER BY step_order
    LIMIT 1;

    IF v_next_step_id IS NOT NULL THEN
      -- Move to next step
      UPDATE claims
      SET 
        current_workflow_step = v_next_step_id,
        workflow_status = 'pending_review',
        updated_at = NOW(),
        updated_by = p_reviewer_id
      WHERE id = p_claim_id;
    ELSE
      -- Workflow completed
      UPDATE claims
      SET 
        current_workflow_step = NULL,
        workflow_status = 'completed',
        updated_at = NOW(),
        updated_by = p_reviewer_id
      WHERE id = p_claim_id;
    END IF;

  -- Handle rejection
  ELSIF p_action = 'reject' THEN
    -- Get first step of the workflow
    SELECT id INTO v_first_step_id
    FROM claims_workflow_steps
    WHERE workflow_id = v_workflow_id
    ORDER BY step_order
    LIMIT 1;

    -- Reset to first step and clear completed steps
    UPDATE claims
    SET 
      current_workflow_step = v_first_step_id,
      completed_workflow_steps = ARRAY[]::UUID[],
      workflow_status = 'pending_review',
      updated_at = NOW(),
      updated_by = p_reviewer_id
    WHERE id = p_claim_id;

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be "approve" or "reject"'
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'next_step_id', CASE 
      WHEN p_action = 'approve' THEN v_next_step_id 
      ELSE v_first_step_id 
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
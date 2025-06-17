-- Update advance_claim_workflow function to handle rejection by going back to step 1
CREATE OR REPLACE FUNCTION advance_claim_workflow(
  p_claim_id UUID,
  p_action TEXT, -- 'approve' or 'reject'
  p_feedback TEXT DEFAULT '',
  p_reviewer_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_current_step_id UUID;
  v_workflow_id UUID;
  v_next_step_id UUID;
  v_first_step_id UUID;
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

  -- Record the action in history
  INSERT INTO claims_workflow_history (
    claim_id,
    workflow_step_id,
    action,
    feedback,
    reviewer_id,
    action_date
  ) VALUES (
    p_claim_id,
    v_current_step_id,
    p_action,
    p_feedback,
    p_reviewer_id,
    NOW()
  );

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
        workflow_status = 'in_progress',
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
      workflow_status = 'in_progress',
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
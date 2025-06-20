-- Fix workflow schema mismatches between UUID and integer step references
-- This migration updates the update_content_workflow_status function to work with the current schema

-- First, drop the existing function to recreate it with the correct implementation
DROP FUNCTION IF EXISTS update_content_workflow_status(uuid, uuid, text, text, uuid, jsonb);

-- Recreate the function to properly handle UUID workflow steps
CREATE OR REPLACE FUNCTION update_content_workflow_status(
    p_content_id uuid,
    p_user_id uuid,
    p_action text,
    p_comments text DEFAULT NULL,
    p_new_assignee_id uuid DEFAULT NULL,
    p_version_data jsonb DEFAULT NULL
)
RETURNS TABLE(success boolean, error_message text, new_status text, new_step integer)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_step_id uuid;
    v_current_status text;
    v_workflow_id uuid;
    v_next_step_id uuid;
    v_next_step_order integer;
    v_current_step_order integer;
    v_version_number integer;
    v_new_status text;
    v_new_step_order integer;
BEGIN
    BEGIN
        -- Get current content status and workflow info
        SELECT c.current_step, c.status, c.workflow_id
        INTO v_current_step_id, v_current_status, v_workflow_id
        FROM content c
        WHERE c.id = p_content_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 'Content not found'::text, NULL::text, NULL::integer;
            RETURN;
        END IF;

        -- Get current step order if we have a workflow
        IF v_current_step_id IS NOT NULL THEN
            SELECT step_order INTO v_current_step_order
            FROM workflow_steps
            WHERE id = v_current_step_id;
        ELSE
            v_current_step_order := 0;
        END IF;

        -- Handle different actions
        IF p_action = 'approve' THEN
            -- Find next step if we have a workflow
            IF v_workflow_id IS NOT NULL AND v_current_step_order IS NOT NULL THEN
                SELECT ws.id, ws.step_order
                INTO v_next_step_id, v_next_step_order
                FROM workflow_steps ws
                WHERE ws.workflow_id = v_workflow_id
                AND ws.step_order > v_current_step_order
                ORDER BY ws.step_order
                LIMIT 1;

                IF v_next_step_id IS NOT NULL THEN
                    -- Move to next step
                    UPDATE content
                    SET current_step = v_next_step_id,
                        status = 'pending_review',
                        updated_at = NOW(),
                        assigned_to = p_new_assignee_id
                    WHERE id = p_content_id;
                    
                    v_new_status := 'pending_review';
                    v_new_step_order := v_next_step_order;
                ELSE
                    -- No more steps, mark as approved
                    UPDATE content
                    SET status = 'approved',
                        updated_at = NOW(),
                        assigned_to = NULL
                    WHERE id = p_content_id;
                    
                    v_new_status := 'approved';
                    v_new_step_order := v_current_step_order;
                END IF;
            ELSE
                -- No workflow, just approve
                UPDATE content
                SET status = 'approved',
                    updated_at = NOW()
                WHERE id = p_content_id;
                
                v_new_status := 'approved';
                v_new_step_order := v_current_step_order;
            END IF;
        
        ELSIF p_action = 'reject' THEN
            UPDATE content
            SET status = 'rejected',
                updated_at = NOW()
            WHERE id = p_content_id;
            
            v_new_status := 'rejected';
            v_new_step_order := v_current_step_order;
        
        ELSIF p_action = 'submit' THEN
            -- Start workflow from beginning
            IF v_workflow_id IS NOT NULL THEN
                SELECT ws.id, ws.step_order
                INTO v_next_step_id, v_next_step_order
                FROM workflow_steps ws
                WHERE ws.workflow_id = v_workflow_id
                ORDER BY ws.step_order
                LIMIT 1;

                IF v_next_step_id IS NOT NULL THEN
                    UPDATE content
                    SET current_step = v_next_step_id,
                        status = 'pending_review',
                        updated_at = NOW()
                    WHERE id = p_content_id;
                    
                    v_new_status := 'pending_review';
                    v_new_step_order := v_next_step_order;
                ELSE
                    v_new_status := 'draft';
                    v_new_step_order := 0;
                END IF;
            ELSE
                v_new_status := 'draft';
                v_new_step_order := 0;
            END IF;
        
        ELSE
            RETURN QUERY SELECT false, 'Invalid action'::text, NULL::text, NULL::integer;
            RETURN;
        END IF;

        -- Create workflow history entry
        IF v_workflow_id IS NOT NULL AND v_current_step_id IS NOT NULL THEN
            INSERT INTO workflow_history (
                content_id,
                workflow_id,
                step_id,
                action,
                performed_by,
                comments,
                created_at
            ) VALUES (
                p_content_id,
                v_workflow_id,
                v_current_step_id,
                p_action,
                p_user_id,
                p_comments,
                NOW()
            );
        END IF;

        -- Create content version if version data is provided
        IF p_version_data IS NOT NULL THEN
            -- Get next version number
            SELECT COALESCE(MAX(version_number), 0) + 1
            INTO v_version_number
            FROM content_versions
            WHERE content_id = p_content_id;

            -- Insert the version with workflow step info
            INSERT INTO content_versions (
                content_id,
                version_number,
                workflow_step_id,
                content_data,
                created_by,
                created_at,
                change_summary,
                approval_status
            ) VALUES (
                p_content_id,
                v_version_number,
                v_current_step_id,  -- Use the current step ID directly
                p_version_data->'content_json',
                p_user_id,
                NOW(),
                p_version_data->>'feedback',
                p_version_data->>'action_status'
            );
        END IF;

        -- Update workflow user assignments if needed
        IF p_new_assignee_id IS NOT NULL AND v_workflow_id IS NOT NULL AND v_new_step_order IS NOT NULL THEN
            INSERT INTO workflow_user_assignments (
                workflow_id,
                step_id,
                user_id
            ) VALUES (
                v_workflow_id,
                v_next_step_id,
                p_new_assignee_id
            )
            ON CONFLICT (workflow_id, step_id, user_id) 
            DO UPDATE SET 
                user_id = p_new_assignee_id;  -- Just update to ensure it exists
        END IF;

        RETURN QUERY SELECT true, NULL::text, v_new_status, v_new_step_order;
        
    EXCEPTION
        WHEN OTHERS THEN
            RETURN QUERY SELECT false, SQLERRM::text, NULL::text, NULL::integer;
    END;
END;
$$;

-- Grant permissions
GRANT ALL ON FUNCTION update_content_workflow_status(uuid, uuid, text, text, uuid, jsonb) TO anon;
GRANT ALL ON FUNCTION update_content_workflow_status(uuid, uuid, text, text, uuid, jsonb) TO authenticated;
GRANT ALL ON FUNCTION update_content_workflow_status(uuid, uuid, text, text, uuid, jsonb) TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION update_content_workflow_status IS 'Updates content workflow status and creates audit trail. Returns success status, error message, new status, and new step order.';
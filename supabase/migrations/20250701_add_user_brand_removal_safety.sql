-- Migration to add safety measures for user brand removal and workflow reassignment
-- Issue #115: Handle Workflow Reassignment When Removing Users from Brands

-- Create function to check if user has workflow assignments in a brand
CREATE OR REPLACE FUNCTION check_user_workflow_assignments(
  p_user_id UUID,
  p_brand_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
  v_workflow_count INTEGER := 0;
  v_content_count INTEGER := 0;
  v_affected_workflows JSONB := '[]'::JSONB;
  v_affected_content JSONB := '[]'::JSONB;
BEGIN
  -- Check workflows where user is assigned (in JSONB steps)
  SELECT COUNT(DISTINCT w.id), 
         COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
           'id', w.id,
           'name', w.name,
           'status', w.status
         )), '[]'::JSONB)
  INTO v_workflow_count, v_affected_workflows
  FROM workflows w
  WHERE w.brand_id = p_brand_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(w.steps) AS step
      WHERE EXISTS (
        SELECT 1
        FROM jsonb_array_elements(step->'assignees') AS assignee
        WHERE (assignee->>'id')::UUID = p_user_id
      )
    );

  -- Check content where user is assigned
  SELECT COUNT(*), 
         COALESCE(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'title', c.title,
           'status', c.status
         )), '[]'::JSONB)
  INTO v_content_count, v_affected_content
  FROM content c
  WHERE c.brand_id = p_brand_id
    AND p_user_id = ANY(c.assigned_to);

  v_result := jsonb_build_object(
    'workflow_count', v_workflow_count,
    'content_count', v_content_count,
    'total_assignments', v_workflow_count + v_content_count,
    'affected_workflows', v_affected_workflows,
    'affected_content', v_affected_content
  );

  RETURN v_result;
END;
$$;

-- Create function to handle user removal from brand with reassignment
CREATE OR REPLACE FUNCTION handle_user_brand_removal(
  p_user_id UUID,
  p_brand_id UUID,
  p_reassign_to_user_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brand_admin_id UUID;
  v_reassignment_log JSONB := '[]'::JSONB;
  v_workflow_record RECORD;
  v_content_record RECORD;
  v_new_steps JSONB;
  v_reassigned_count INTEGER := 0;
BEGIN
  -- If no specific user provided for reassignment, find a brand admin
  IF p_reassign_to_user_id IS NULL THEN
    SELECT p.id INTO v_brand_admin_id
    FROM profiles p
    JOIN user_brand_permissions ubp ON p.id = ubp.user_id
    WHERE ubp.brand_id = p_brand_id
      AND ubp.role = 'admin'
      AND p.id != p_user_id
    ORDER BY p.created_at
    LIMIT 1;
    
    -- If no brand admin found, try to find any user with editor role
    IF v_brand_admin_id IS NULL THEN
      SELECT p.id INTO v_brand_admin_id
      FROM profiles p
      JOIN user_brand_permissions ubp ON p.id = ubp.user_id
      WHERE ubp.brand_id = p_brand_id
        AND ubp.role = 'editor'
        AND p.id != p_user_id
      ORDER BY p.created_at
      LIMIT 1;
    END IF;
  ELSE
    v_brand_admin_id := p_reassign_to_user_id;
  END IF;

  -- If still no suitable user found, raise exception
  IF v_brand_admin_id IS NULL THEN
    RAISE EXCEPTION 'No suitable user found for reassignment in brand %', p_brand_id;
  END IF;

  -- Reassign workflows
  FOR v_workflow_record IN 
    SELECT id, name, steps
    FROM workflows
    WHERE brand_id = p_brand_id
      AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements(steps) AS step
        WHERE EXISTS (
          SELECT 1
          FROM jsonb_array_elements(step->'assignees') AS assignee
          WHERE (assignee->>'id')::UUID = p_user_id
        )
      )
  LOOP
    -- Process each step to replace the user
    SELECT jsonb_agg(
      CASE 
        WHEN EXISTS (
          SELECT 1 
          FROM jsonb_array_elements(step->'assignees') AS assignee
          WHERE (assignee->>'id')::UUID = p_user_id
        )
        THEN jsonb_set(
          step,
          '{assignees}',
          (
            SELECT jsonb_agg(
              CASE 
                WHEN (assignee->>'id')::UUID = p_user_id 
                THEN jsonb_build_object(
                  'id', v_brand_admin_id,
                  'email', (SELECT email FROM profiles WHERE id = v_brand_admin_id),
                  'full_name', (SELECT full_name FROM profiles WHERE id = v_brand_admin_id)
                )
                ELSE assignee
              END
            )
            FROM jsonb_array_elements(step->'assignees') AS assignee
          )
        )
        ELSE step
      END
    )
    INTO v_new_steps
    FROM jsonb_array_elements(v_workflow_record.steps) AS step;

    -- Update the workflow
    UPDATE workflows
    SET steps = v_new_steps,
        updated_at = NOW()
    WHERE id = v_workflow_record.id;

    v_reassigned_count := v_reassigned_count + 1;
    v_reassignment_log := v_reassignment_log || jsonb_build_object(
      'type', 'workflow',
      'id', v_workflow_record.id,
      'name', v_workflow_record.name,
      'reassigned_to', v_brand_admin_id
    );
  END LOOP;

  -- Reassign content
  FOR v_content_record IN
    SELECT id, title, assigned_to
    FROM content
    WHERE brand_id = p_brand_id
      AND p_user_id = ANY(assigned_to)
  LOOP
    UPDATE content
    SET assigned_to = array_replace(assigned_to, p_user_id, v_brand_admin_id),
        updated_at = NOW()
    WHERE id = v_content_record.id;

    v_reassigned_count := v_reassigned_count + 1;
    v_reassignment_log := v_reassignment_log || jsonb_build_object(
      'type', 'content',
      'id', v_content_record.id,
      'title', v_content_record.title,
      'reassigned_to', v_brand_admin_id
    );
  END LOOP;

  -- Create notification for the admin who received reassignments
  IF v_reassigned_count > 0 THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_brand_admin_id,
      'workflow_reassignment',
      'Workflows Reassigned',
      format('You have been assigned %s items from a user who was removed from the brand.', v_reassigned_count),
      jsonb_build_object(
        'removed_user_id', p_user_id,
        'brand_id', p_brand_id,
        'reassignment_count', v_reassigned_count,
        'reassignments', v_reassignment_log
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'reassigned_count', v_reassigned_count,
    'reassigned_to_user_id', v_brand_admin_id,
    'reassignment_log', v_reassignment_log
  );
END;
$$;

-- Enhanced update_user_details function with safety checks
CREATE OR REPLACE FUNCTION update_user_details(
  p_user_id UUID,
  p_full_name TEXT,
  p_job_title TEXT,
  p_company TEXT,
  p_role TEXT DEFAULT NULL,
  p_brand_permissions JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_brands UUID[];
  v_new_brands UUID[];
  v_removed_brands UUID[];
  v_brand_id UUID;
  v_reassignment_results JSONB := '[]'::JSONB;
  v_check_result JSONB;
BEGIN
  -- Update profiles table
  UPDATE public.profiles
  SET
    full_name = COALESCE(p_full_name, full_name),
    job_title = COALESCE(p_job_title, job_title),
    company = COALESCE(p_company, company),
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Update auth.users metadata
  UPDATE auth.users
  SET
    raw_user_meta_data = raw_user_meta_data || jsonb_strip_nulls(
      jsonb_build_object(
        'full_name', p_full_name,
        'job_title', p_job_title,
        'company', p_company,
        'role', p_role
      )
    )
  WHERE id = p_user_id;

  -- Handle brand permissions if provided
  IF p_brand_permissions IS NOT NULL THEN
    -- Get existing brand permissions
    SELECT ARRAY_AGG(brand_id) INTO v_existing_brands
    FROM public.user_brand_permissions
    WHERE user_id = p_user_id;

    -- Get new brand permissions
    SELECT ARRAY_AGG((perm->>'brand_id')::UUID) INTO v_new_brands
    FROM jsonb_array_elements(p_brand_permissions) AS perm;

    -- Find removed brands
    v_removed_brands := ARRAY(
      SELECT unnest(v_existing_brands)
      EXCEPT
      SELECT unnest(v_new_brands)
    );

    -- Check for workflow assignments in removed brands
    FOREACH v_brand_id IN ARRAY v_removed_brands
    LOOP
      v_check_result := check_user_workflow_assignments(p_user_id, v_brand_id);
      
      -- If user has assignments, reassign them
      IF (v_check_result->>'total_assignments')::INTEGER > 0 THEN
        v_reassignment_results := v_reassignment_results || 
          handle_user_brand_removal(p_user_id, v_brand_id);
      END IF;
    END LOOP;

    -- Delete all existing permissions for the user
    DELETE FROM public.user_brand_permissions WHERE user_id = p_user_id;

    -- Insert the new permissions from the JSONB array
    IF jsonb_array_length(p_brand_permissions) > 0 THEN
      INSERT INTO public.user_brand_permissions (user_id, brand_id, role)
      SELECT
        p_user_id,
        (perm->>'brand_id')::UUID,
        perm->>'role'
      FROM jsonb_array_elements(p_brand_permissions) AS perm;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'reassignments', v_reassignment_results
  );
END;
$$;

-- Create index for faster workflow assignment lookups
CREATE INDEX IF NOT EXISTS idx_workflows_steps_assignees 
ON workflows USING gin (steps);

-- Create index for content assigned_to
CREATE INDEX IF NOT EXISTS idx_content_assigned_to 
ON content USING gin (assigned_to);

-- Add comment explaining the safety measures
COMMENT ON FUNCTION handle_user_brand_removal IS 'Safely removes a user from a brand by reassigning all their workflow and content assignments to another user in the brand';
COMMENT ON FUNCTION check_user_workflow_assignments IS 'Checks if a user has any workflow or content assignments in a specific brand';
COMMENT ON FUNCTION update_user_details IS 'Updates user details and handles brand permission changes with automatic workflow reassignment';
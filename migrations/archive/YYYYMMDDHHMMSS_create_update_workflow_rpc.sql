-- SQL Migration File Content (e.g., YYYYMMDDHHMMSS_create_update_workflow_rpc.sql)

CREATE OR REPLACE FUNCTION public.update_workflow_and_handle_invites(
    p_workflow_id uuid,
    p_name text DEFAULT NULL,
    p_brand_id uuid DEFAULT NULL,
    p_steps jsonb DEFAULT NULL,
    p_template_id uuid DEFAULT NULL, 
    p_new_invitation_items jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    invitation_item jsonb;
BEGIN
    UPDATE public.workflows
    SET
        name = COALESCE(p_name, name),
        brand_id = COALESCE(p_brand_id, brand_id),
        steps = COALESCE(p_steps, steps),
        template_id = p_template_id, 
        updated_at = NOW()
    WHERE id = p_workflow_id;

    IF p_new_invitation_items IS NOT NULL AND jsonb_array_length(p_new_invitation_items) > 0 THEN
        FOR invitation_item IN SELECT * FROM jsonb_array_elements(p_new_invitation_items)
        LOOP
            -- Placeholder for your actual invitation logging/processing logic.
            -- Example: Insert into a hypothetical 'workflow_invitation_logs' table.
            -- You MUST adapt this to your schema and requirements.
            /* 
            INSERT INTO public.workflow_invitation_logs (
                workflow_id, step_id, email, role, invite_token, expires_at, status
            )
            VALUES (
                p_workflow_id,
                (invitation_item->>'step_id')::integer, 
                invitation_item->>'email',
                invitation_item->>'role',
                invitation_item->>'invite_token',
                (invitation_item->>'expires_at')::timestamptz,
                'pending_auth_invite' 
            );
            */
            RAISE NOTICE 'Processing new invitation item for workflow %: %', p_workflow_id, invitation_item;
        END LOOP;
    END IF;

    IF FOUND THEN
        RETURN TRUE;
    ELSE
        RAISE WARNING 'Workflow with ID % not found for update, or no actual change made by COALESCE.', p_workflow_id;
        RETURN FALSE; 
    END IF;

EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error in update_workflow_and_handle_invites for workflow ID %: % ', p_workflow_id, SQLERRM;
        RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.update_workflow_and_handle_invites(uuid, text, uuid, jsonb, uuid, jsonb) 
IS 'Updates an existing workflow (name, brand, steps, template_id) and processes new user invitations. Returns TRUE on success, FALSE otherwise.'; 
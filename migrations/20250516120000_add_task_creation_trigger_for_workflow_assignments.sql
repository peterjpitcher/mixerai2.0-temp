-- Migration to create task creation trigger for workflow assignments

-- Ensure the user_tasks table has the required unique constraint for idempotency of task creation.
-- This prevents duplicate tasks for the same user, content, and workflow step.
ALTER TABLE public.user_tasks
ADD CONSTRAINT user_tasks_user_content_step_unique UNIQUE (user_id, content_id, workflow_step_id);

-- Function to handle new workflow assignment and create tasks
CREATE OR REPLACE FUNCTION public.handle_new_workflow_assignment_task_creation()
RETURNS TRIGGER AS $$
DECLARE
    content_record RECORD;
    workflow_step_details JSONB;
    step_id_text TEXT; -- To handle potential type casting for step_id if it's not directly text in workflows table
BEGIN
    -- NEW.user_id, NEW.workflow_id, NEW.step_id are available from the inserted row in workflow_user_assignments

    -- Attempt to get step definition from the workflow's JSONB steps array.
    -- Assuming steps are stored as a JSONB array and step_id in workflow_user_assignments matches an 'id' field in one of the step objects.
    SELECT s.step_obj INTO workflow_step_details
    FROM public.workflows w,
         jsonb_array_elements(w.steps) WITH ORDINALITY arr(step_obj, rn)
    WHERE w.id = NEW.workflow_id AND arr.step_obj->>'id' = NEW.step_id::TEXT; -- Match step_id, casting NEW.step_id if it's numeric
    
    -- If NEW.step_id is numeric and workflow step 'id' fields are numbers in JSON, direct comparison might be better:
    -- Example: arr.step_obj->>'id' = (NEW.step_id)::text or (arr.step_obj->'id')::int = NEW.step_id
    -- For this example, we assume step_id in workflow_user_assignments needs to be cast to TEXT for comparison with JSON string value.

    IF workflow_step_details IS NULL THEN
        RAISE WARNING '[TaskTrigger] Workflow step definition not found for workflow_id: %, step_id: %', NEW.workflow_id, NEW.step_id;
        RETURN NEW; -- Or handle as an error if this case should not happen
    END IF;

    -- Find all content items that are currently at this specific step of this workflow
    -- and have a status indicating work is needed (e.g., 'pending_review').
    FOR content_record IN
        SELECT c.id, c.title
        FROM public.content c
        WHERE c.workflow_id = NEW.workflow_id
        AND c.current_step = NEW.step_id -- Make sure content is at the step this user was just assigned to
        AND c.status = 'pending_review'  -- This status indicates an action/task is needed
    LOOP
        -- Insert a task if one doesn't already exist for this user, content, and step.
        -- The UNIQUE constraint on (user_id, content_id, workflow_step_id) handles idempotency.
        INSERT INTO public.user_tasks (
            user_id,
            content_id,
            workflow_id,
            workflow_step_id, -- This should match the type in user_tasks table, likely TEXT
            workflow_step_name,
            status,
            due_date -- Optional: set a due date based on rules, e.g., NOW() + interval '3 days'
        )
        VALUES (
            NEW.user_id,
            content_record.id,
            NEW.workflow_id,
            NEW.step_id::TEXT, -- Cast step_id to TEXT if workflow_step_id in user_tasks is TEXT
            workflow_step_details->>'name', -- Extract step name from JSONB
            'pending', -- Initial status for new tasks
            NULL -- Example: no due date for now
        )
        ON CONFLICT (user_id, content_id, workflow_step_id) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists to ensure a clean recreation (idempotency)
DROP TRIGGER IF EXISTS trigger_handle_new_assignment_task ON public.workflow_user_assignments;

-- Create the trigger on workflow_user_assignments
CREATE TRIGGER trigger_handle_new_assignment_task
AFTER INSERT ON public.workflow_user_assignments
FOR EACH ROW EXECUTE FUNCTION public.handle_new_workflow_assignment_task_creation();

COMMENT ON FUNCTION public.handle_new_workflow_assignment_task_creation() IS 'Creates tasks in user_tasks when a user is assigned to a workflow step, for any content currently at that step and requiring action.';
COMMENT ON TRIGGER trigger_handle_new_assignment_task ON public.workflow_user_assignments IS 'After a user is assigned to a workflow step, creates relevant pending tasks.'; 
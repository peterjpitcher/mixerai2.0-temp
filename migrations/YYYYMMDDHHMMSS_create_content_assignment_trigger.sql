-- Migration to create a trigger for populating user_tasks on new content creation

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_content_workflow_assignment()
RETURNS TRIGGER AS $$
DECLARE
    workflow_record RECORD;
    step_object JSONB;
    assignee_object JSONB;
    assignee_user_id UUID;
    step_index INTEGER;
BEGIN
    -- Check if the new content has a workflow_id and current_step is defined (should be 0 for new content)
    IF NEW.workflow_id IS NOT NULL AND NEW.current_step IS NOT NULL THEN
        -- Fetch the assigned workflow details, specifically the steps array
        SELECT INTO workflow_record steps FROM public.workflows WHERE id = NEW.workflow_id;

        IF FOUND AND workflow_record.steps IS NOT NULL AND jsonb_typeof(workflow_record.steps) = 'array' AND jsonb_array_length(workflow_record.steps) > NEW.current_step THEN
            -- Get the specific step object using current_step as index
            step_index := NEW.current_step; -- Should be 0 for the first step
            step_object := workflow_record.steps -> step_index;

            IF step_object IS NOT NULL THEN
                -- Iterate over assignees in the step object
                -- Assumes assignees is an array of objects like [{ "id": "uuid", "email": "..." }, ...]
                -- or [{ "email": "..." }, ...] if ID is not yet resolved.
                IF jsonb_typeof(step_object -> 'assignees') = 'array' THEN
                    FOR assignee_object IN SELECT * FROM jsonb_array_elements(step_object -> 'assignees')
                    LOOP
                        assignee_user_id := NULL; -- Reset for each assignee

                        -- Try to get user_id directly if present
                        IF assignee_object ? 'id' AND (assignee_object ->> 'id') IS NOT NULL AND (assignee_object ->> 'id') <> '' THEN
                            BEGIN
                                assignee_user_id := (assignee_object ->> 'id')::UUID;
                            EXCEPTION WHEN invalid_text_representation THEN
                                -- Handle cases where id is not a valid UUID, try email lookup
                                SELECT id INTO assignee_user_id FROM public.profiles WHERE email = (assignee_object ->> 'email');
                            END;
                        ELSE
                            -- If no id, try to find user by email
                            SELECT id INTO assignee_user_id FROM public.profiles WHERE email = (assignee_object ->> 'email');
                        END IF;

                        -- If a user_id was found, create a task
                        IF assignee_user_id IS NOT NULL THEN
                            INSERT INTO public.user_tasks (
                                user_id,
                                content_id,
                                workflow_id,
                                workflow_step_id, -- Storing index as string
                                workflow_step_name,
                                status
                            )
                            VALUES (
                                assignee_user_id,
                                NEW.id, -- ID of the newly inserted content
                                NEW.workflow_id,
                                step_index::TEXT, -- Store the step index (0, 1, 2...)
                                step_object ->> 'name',
                                'pending'
                            )
                            ON CONFLICT (user_id, content_id, workflow_step_id) DO NOTHING; -- Avoid duplicate tasks
                        END IF;
                    END LOOP;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_content_workflow_assignment() IS 'Trigger function to create tasks in user_tasks when new content is assigned to a workflow.';

-- 2. Create the trigger on the content table
DROP TRIGGER IF EXISTS trigger_create_tasks_on_new_content ON public.content;
CREATE TRIGGER trigger_create_tasks_on_new_content
AFTER INSERT ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_content_workflow_assignment(); 
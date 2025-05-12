-- Migration: Create function to atomically create a workflow and log related invitations
-- Description: This function inserts a new workflow and associated records into
--              the workflow_invitations table within a single transaction.

-- Ensure the workflow_invitations table exists (add if necessary)
CREATE TABLE IF NOT EXISTS workflow_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_id INTEGER, -- Assuming step ID is integer based on API code
  email TEXT NOT NULL,
  role user_role NOT NULL,
  invite_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending', -- e.g., pending, accepted, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(workflow_id, step_id, email) -- Prevent duplicate invites for same step/email
);

create or replace function create_workflow_and_log_invitations(
    p_name text,
    p_brand_id uuid,
    p_steps jsonb,
    p_created_by uuid,
    p_invitation_items jsonb -- Array of objects: {step_id, email, role, invite_token, expires_at}
)
returns uuid -- Returns the ID of the newly created workflow
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workflow_id uuid;
  invitation_item jsonb;
begin
  -- Insert the new workflow
  insert into workflows (name, brand_id, steps, created_by)
  values (p_name, p_brand_id, p_steps, p_created_by)
  returning id into new_workflow_id;

  -- Insert invitation items if any are provided
  if jsonb_array_length(p_invitation_items) > 0 then
    for invitation_item in select * from jsonb_array_elements(p_invitation_items)
    loop
      insert into workflow_invitations (
        workflow_id, 
        step_id, 
        email, 
        role, 
        invite_token, 
        expires_at, 
        status
      ) values (
        new_workflow_id,
        (invitation_item->>'step_id')::integer,
        invitation_item->>'email',
        (invitation_item->>'role')::user_role,
        invitation_item->>'invite_token',
        (invitation_item->>'expires_at')::timestamptz,
        'pending'
      );
    end loop;
  end if;

  return new_workflow_id;
end;
$$;

grant execute on function create_workflow_and_log_invitations(text, uuid, jsonb, uuid, jsonb) to authenticated; 
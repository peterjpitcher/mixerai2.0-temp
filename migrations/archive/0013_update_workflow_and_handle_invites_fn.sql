-- Migration: Create function to atomically update a workflow and manage invitations
-- Description: Updates a workflow record, deletes existing pending invitations,
--              and inserts new invitations within a single transaction.

create or replace function update_workflow_and_handle_invites(
    p_workflow_id uuid,
    p_name text,
    p_brand_id uuid,
    p_steps jsonb,
    p_new_invitation_items jsonb -- Array of objects: {step_id, email, role, invite_token, expires_at}
)
returns boolean -- Returns true on success
language plpgsql
security definer
set search_path = public
as $$
declare
  update_payload jsonb := '{}';
begin
  -- Build the update payload selectively
  if p_name is not null then
    update_payload := update_payload || jsonb_build_object('name', p_name);
  end if;
  if p_brand_id is not null then
    update_payload := update_payload || jsonb_build_object('brand_id', p_brand_id);
  end if;
  if p_steps is not null then
    update_payload := update_payload || jsonb_build_object('steps', p_steps);
  end if;

  -- Add updated_at timestamp if there are changes
  if jsonb_object_keys(update_payload)::text[] <> '{}'::text[] then 
    update_payload := update_payload || jsonb_build_object('updated_at', now());
    
    -- Update the workflow record if there are fields to update
    update workflows
    set name = coalesce(p_name, name),
        brand_id = coalesce(p_brand_id, brand_id),
        steps = coalesce(p_steps, steps),
        updated_at = now()
    where id = p_workflow_id;
  end if;

  -- Delete existing pending invitations for this workflow
  delete from workflow_invitations
  where workflow_id = p_workflow_id
    and status = 'pending';

  -- Insert new invitation items if any are provided
  if jsonb_array_length(p_new_invitation_items) > 0 then
    declare
      invitation_item jsonb;
    begin
      for invitation_item in select * from jsonb_array_elements(p_new_invitation_items)
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
          p_workflow_id,
          (invitation_item->>'step_id')::integer,
          invitation_item->>'email',
          (invitation_item->>'role')::user_role,
          invitation_item->>'invite_token',
          (invitation_item->>'expires_at')::timestamptz,
          'pending'
        )
        on conflict do nothing; -- Avoid errors if invite somehow already exists
      end loop;
    end;
  end if;

  return true; -- Assume success if no error thrown

exception
  when others then
    -- Log the error details if possible (requires extensions or specific setup)
    -- raise warning 'Error in update_workflow_and_handle_invites: %', sqlerrm;
    return false;
end;
$$;

grant execute on function update_workflow_and_handle_invites(uuid, text, uuid, jsonb, jsonb) to authenticated; 
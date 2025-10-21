-- Adds transactional helpers for updating and deleting workflows
set search_path = public, extensions;

create or replace function public.update_workflow_and_handle_invites(
  p_workflow_id uuid,
  p_name text default null,
  p_brand_id uuid default null,
  p_steps jsonb default '[]'::jsonb,
  p_template_id uuid default null,
  p_description text default null,
  p_new_invitation_items jsonb default '[]'::jsonb
)
returns boolean
language plpgsql
security definer
as $$
declare
  v_steps jsonb := coalesce(p_steps, '[]'::jsonb);
  v_step_record record;
  v_step jsonb;
  v_step_id uuid;
  v_step_name text;
  v_step_description text;
  v_step_role text;
  v_step_order integer;
  v_step_requires_approval boolean;
  v_assignee_ids uuid[];
  v_step_summary jsonb := '[]'::jsonb;
  v_step_ids uuid[] := array[]::uuid[];
begin
  if p_workflow_id is null then
    raise exception 'p_workflow_id is required';
  end if;

  -- Parse and upsert workflow steps
  for v_step_record in
    select elem as step, ordinality
    from jsonb_array_elements(v_steps) with ordinality as parsed(elem, ordinality)
  loop
    v_step := v_step_record.step;
    v_step_id := coalesce((v_step ->> 'id')::uuid, uuid_generate_v4());
    v_step_name := nullif(trim(v_step ->> 'name'), '');
    v_step_description := nullif(trim(v_step ->> 'description'), '');
    v_step_role := nullif(trim(v_step ->> 'role'), '');
    v_step_order := coalesce((v_step ->> 'step_order')::integer, v_step_record.ordinality::integer);
    if v_step_order < 1 then
      v_step_order := v_step_record.ordinality::integer;
    end if;
    v_step_requires_approval := coalesce((v_step ->> 'approvalRequired')::boolean, false);

    select coalesce(array_agg(value::uuid), array[]::uuid[]) into v_assignee_ids
    from jsonb_array_elements_text(coalesce(v_step -> 'assignees', '[]'::jsonb)) as value
    where nullif(trim(value), '') is not null;

    insert into public.workflow_steps (
      id,
      workflow_id,
      name,
      description,
      role,
      step_order,
      approval_required,
      is_optional,
      assigned_user_ids,
      updated_at
    )
    values (
      v_step_id,
      p_workflow_id,
      coalesce(v_step_name, 'Step ' || v_step_order),
      v_step_description,
      v_step_role,
      v_step_order,
      v_step_requires_approval,
      not v_step_requires_approval,
      v_assignee_ids,
      now()
    )
    on conflict (id) do update
      set
        workflow_id = excluded.workflow_id,
        name = excluded.name,
        description = excluded.description,
        role = excluded.role,
        step_order = excluded.step_order,
        approval_required = excluded.approval_required,
        is_optional = excluded.is_optional,
        assigned_user_ids = excluded.assigned_user_ids,
        updated_at = now();

    v_step_ids := array_append(v_step_ids, v_step_id);

    v_step_summary := v_step_summary || jsonb_build_array(
      jsonb_build_object(
        'id', v_step_id,
        'name', coalesce(v_step_name, 'Step ' || v_step_order),
        'description', v_step_description,
        'role', v_step_role,
        'step_order', v_step_order,
        'approvalRequired', v_step_requires_approval,
        'assigned_user_ids', coalesce(v_assignee_ids, array[]::uuid[])
      )
    );
  end loop;

  if coalesce(array_length(v_step_ids, 1), 0) = 0 then
    delete from public.workflow_steps
    where workflow_id = p_workflow_id;
    v_step_summary := '[]'::jsonb;
  else
    delete from public.workflow_steps
    where workflow_id = p_workflow_id
      and id <> all(v_step_ids);
  end if;

  update public.workflows
  set
    name = coalesce(p_name, name),
    brand_id = coalesce(p_brand_id, brand_id),
    template_id = p_template_id,
    description = p_description,
    steps = v_step_summary,
    updated_at = now()
  where id = p_workflow_id;

  if not found then
    raise exception 'Workflow % does not exist', p_workflow_id;
  end if;

  return true;
end;
$$;

comment on function public.update_workflow_and_handle_invites(
  uuid,
  text,
  uuid,
  jsonb,
  uuid,
  text,
  jsonb
) is 'Updates workflow metadata and synchronises workflow_steps within a single transaction.';

create or replace function public.delete_workflow_and_dependents(
  p_workflow_id uuid
)
returns boolean
language plpgsql
security definer
as $$
begin
  if p_workflow_id is null then
    raise exception 'p_workflow_id is required';
  end if;

  delete from public.workflows
  where id = p_workflow_id;

  if not found then
    return false;
  end if;

  return true;
end;
$$;

comment on function public.delete_workflow_and_dependents(uuid)
  is 'Removes a workflow row and cascaded dependents using a single transactional call.';

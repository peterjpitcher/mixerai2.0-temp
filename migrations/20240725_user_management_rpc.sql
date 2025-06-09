-- Function to update user details and permissions atomically
create or replace function update_user_details(
    p_user_id uuid,
    p_full_name text,
    p_job_title text,
    p_company text,
    p_role text default null,
    p_brand_permissions jsonb default null
)
returns void as $$
begin
    -- Update profiles table
    update public.profiles
    set
        full_name = coalesce(p_full_name, full_name),
        job_title = coalesce(p_job_title, job_title),
        company = coalesce(p_company, company),
        updated_at = now()
    where id = p_user_id;

    -- Update auth.users metadata
    -- Note: This merges the new metadata with existing metadata
    update auth.users
    set
        user_metadata = jsonb_strip_nulls(
            user_metadata ||
            jsonb_build_object(
                'full_name', p_full_name,
                'job_title', p_job_title,
                'company', p_company,
                'role', p_role
            )
        )
    where id = p_user_id;

    -- Handle brand permissions if provided
    if p_brand_permissions is not null then
        -- First, delete all existing permissions for the user
        delete from public.user_brand_permissions where user_id = p_user_id;

        -- Then, insert the new permissions from the JSONB array
        if jsonb_array_length(p_brand_permissions) > 0 then
            insert into public.user_brand_permissions (user_id, brand_id, role)
            select
                p_user_id,
                (perm->>'brand_id')::uuid,
                perm->>'role'
            from jsonb_array_elements(p_brand_permissions) as perm;
        end if;
    end if;
end;
$$ language plpgsql security definer;

-- Function to delete a user and reassign their tasks atomically
create or replace function delete_user_and_reassign_tasks(p_user_id_to_delete uuid)
returns void as $$
declare
    workflow_record record;
    brand_admin record;
    updated_steps jsonb;
begin
    -- Loop through each workflow that might have the user as an assignee
    for workflow_record in
        select id, brand_id, steps from public.workflows
        where steps::text ilike '%' || p_user_id_to_delete::text || '%'
    loop
        -- Find a brand admin for the workflow's brand
        select user_id, p.full_name, u.email
        into brand_admin
        from public.user_brand_permissions ubp
        join public.profiles p on ubp.user_id = p.id
        join auth.users u on ubp.user_id = u.id
        where ubp.brand_id = workflow_record.brand_id and ubp.role = 'admin'
        limit 1;

        -- If a brand admin is found, reassign tasks
        if found then
            select jsonb_agg(
                case
                    when (assignee->>'id')::uuid = p_user_id_to_delete then
                        jsonb_build_object(
                            'id', brand_admin.user_id,
                            'email', brand_admin.email,
                            'name', brand_admin.full_name
                        )
                    else
                        assignee
                end
            )
            into updated_steps
            from jsonb_array_elements(workflow_record.steps) step,
                 jsonb_array_elements(step->'assignees') assignee;

            -- Update the workflow with the reassigned steps
            update public.workflows
            set steps = updated_steps
            where id = workflow_record.id;
        end if;
    end loop;

    -- Finally, delete the user from auth.users, which will cascade to other tables
    delete from auth.users where id = p_user_id_to_delete;
end;
$$ language plpgsql security definer; 
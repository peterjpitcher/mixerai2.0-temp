-- Migration: Create function to atomically update a user's role across all their assigned brands
-- Description: This function updates the 'role' field in the user_brand_permissions table
--              for all existing permissions associated with a given user ID.

create or replace function set_user_role_for_all_assigned_brands(
    target_user_id uuid,
    new_role user_role
)
returns integer -- Returns the number of permissions updated
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update user_brand_permissions
  set role = new_role,
      updated_at = now() -- Also update the timestamp
  where user_id = target_user_id;
  
  -- Get the number of rows affected
  get diagnostics updated_count = row_count;
  
  return updated_count;
end;
$$;

-- Grant execute permission to authenticated users (or admin role if preferred)
-- Granting to 'authenticated' allows any logged-in user API key to call it,
-- but the API route itself should be protected by admin auth.
grant execute on function set_user_role_for_all_assigned_brands(uuid, user_role) to authenticated; 
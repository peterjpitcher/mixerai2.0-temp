-- Migration: Create function to atomically create a brand and set the creator as admin
-- Description: This function inserts a new brand and assigns the creator as an admin
--              in the user_brand_permissions table within a single transaction.

create or replace function create_brand_and_set_admin(
    creator_user_id uuid,
    brand_name text,
    brand_website_url text default null,
    brand_country text default null,
    brand_language text default null,
    brand_identity_text text default null,
    brand_tone_of_voice text default null,
    brand_guardrails text default null,
    brand_content_vetting_agencies text default null
)
returns uuid
language plpgsql
security definer -- Allows the function to run with the privileges of the user who defines it
set search_path = public -- Ensures the function operates within the public schema
as $$
declare
  new_brand_id uuid;
begin
  -- Insert the new brand
  insert into brands (
    name, 
    website_url, 
    country, 
    language, 
    brand_identity, 
    tone_of_voice, 
    guardrails, 
    content_vetting_agencies
  ) values (
    brand_name, 
    brand_website_url, 
    brand_country, 
    brand_language, 
    brand_identity_text, 
    brand_tone_of_voice, 
    brand_guardrails, 
    brand_content_vetting_agencies
  )
  returning id into new_brand_id;

  -- Assign the creator as an admin for the new brand
  insert into user_brand_permissions (user_id, brand_id, role)
  values (creator_user_id, new_brand_id, 'admin');

  -- Return the ID of the newly created brand
  return new_brand_id;
end;
$$;

-- Grant execute permission to the authenticated role
-- This allows logged-in users (via Supabase API) to call this function
grant execute on function create_brand_and_set_admin(
    uuid, text, text, text, text, text, text, text, text
) to authenticated; 
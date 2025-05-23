-- Migration: Update create_brand_and_set_admin function
-- Description: This function is updated to:
-- 1. Correctly assign 'admin' (user_brand_role_enum) to the creator in user_brand_permissions.
-- 2. Align its signature with parameters passed from /api/brands POST route, including
--    brand_color_input and approved_content_types_input.
-- 3. Handle insertion of new fields: brand_color and approved_content_types into the brands table.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_brand_and_set_admin(
    creator_user_id uuid,
    brand_name text,
    brand_website_url text default null,
    brand_country text default null,
    brand_language text default null,
    brand_identity_text text default null,
    brand_tone_of_voice text default null,
    brand_guardrails text default null,
    brand_content_vetting_agencies_input text default null, -- Assuming this is a text representation (e.g., comma-separated IDs)
    brand_color_input text default null,
    approved_content_types_input jsonb default null -- Assuming JSONB for structured data
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_brand_id uuid;
BEGIN
  -- Insert the new brand, including new fields
  INSERT INTO public.brands (
    name,
    website_url,
    country,
    language,
    brand_identity,
    tone_of_voice,
    guardrails,
    content_vetting_agencies, -- Corresponds to brand_content_vetting_agencies_input
    brand_color,              -- New field
    approved_content_types    -- New field
  ) VALUES (
    brand_name,
    brand_website_url,
    brand_country,
    brand_language,
    brand_identity_text,
    brand_tone_of_voice,
    brand_guardrails,
    brand_content_vetting_agencies_input,
    brand_color_input,
    approved_content_types_input
  )
  RETURNING id INTO new_brand_id;

  -- Assign the creator as a 'admin' for the new brand
  INSERT INTO public.user_brand_permissions (user_id, brand_id, role)
  VALUES (creator_user_id, new_brand_id, 'admin'::public.user_brand_role_enum);

  -- Return the ID of the newly created brand
  RETURN new_brand_id;
END;
$$;

-- Ensure the authenticated role can execute this function with the new signature
-- Drop existing grant if signature changed significantly, then re-grant. 
-- It's safer to be explicit if unsure.

-- Attempt to revoke previous grant if it exists (might fail if no exact match, which is fine)
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.create_brand_and_set_admin(uuid, text, text, text, text, text, text, text, text) FROM authenticated;
EXCEPTION
  WHEN undefined_function THEN -- Do nothing if the old function signature doesn't exist
    NULL;
END $$;

-- Grant execute permission for the new function signature
GRANT EXECUTE ON FUNCTION public.create_brand_and_set_admin(
    uuid, -- creator_user_id
    text, -- brand_name
    text, -- brand_website_url
    text, -- brand_country
    text, -- brand_language
    text, -- brand_identity_text
    text, -- brand_tone_of_voice
    text, -- brand_guardrails
    text, -- brand_content_vetting_agencies_input
    text, -- brand_color_input
    jsonb -- approved_content_types_input
) TO authenticated;

COMMIT; 
-- Fix brand_admin role issue in create_brand_and_set_admin function
-- The user_brand_role_enum only accepts 'admin', 'editor', 'viewer' but the function tries to insert 'brand_admin'

-- Drop and recreate the function with the correct role value
CREATE OR REPLACE FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text" DEFAULT NULL::"text", "brand_country" "text" DEFAULT NULL::"text", "brand_language" "text" DEFAULT NULL::"text", "brand_identity_text" "text" DEFAULT NULL::"text", "brand_tone_of_voice" "text" DEFAULT NULL::"text", "brand_guardrails" "text" DEFAULT NULL::"text", "brand_content_vetting_agencies_input" "text"[] DEFAULT NULL::"text"[], "brand_color_input" "text" DEFAULT NULL::"text", "approved_content_types_input" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_brand_id uuid;
BEGIN
  INSERT INTO public.brands (
    name,
    website_url,
    country,
    language,
    brand_identity,
    tone_of_voice,
    guardrails,
    content_vetting_agencies,
    brand_color,
    approved_content_types
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

  -- Fixed: Changed 'brand_admin' to 'admin' to match the enum
  INSERT INTO public.user_brand_permissions (user_id, brand_id, role)
  VALUES (creator_user_id, new_brand_id, 'admin'::public.user_brand_role_enum);

  RETURN new_brand_id;
END;
$$;

-- Also fix any existing records that might have been affected (though this should fail due to enum constraint)
-- This is just a safety check
DO $$
BEGIN
  -- Check if there are any invalid role values (this should not be possible due to enum constraint)
  IF EXISTS (
    SELECT 1 FROM public.user_brand_permissions 
    WHERE role NOT IN ('admin', 'editor', 'viewer')
  ) THEN
    RAISE NOTICE 'Found invalid role values in user_brand_permissions table';
  END IF;
END $$;

-- Update RLS policy comments to clarify that 'admin' role in user_brand_permissions table means brand admin
COMMENT ON POLICY "Admins can delete their brands" ON "public"."brands" IS 'Users with admin role for a specific brand in user_brand_permissions can delete that brand. Note: "admin" in user_brand_permissions means brand admin, not global admin.';

COMMENT ON POLICY "Admins can insert brands" ON "public"."brands" IS 'Users with admin role for any brand in user_brand_permissions can insert new brands. Note: "admin" in user_brand_permissions means brand admin, not global admin.';

COMMENT ON POLICY "Admins can update their brands" ON "public"."brands" IS 'Users with admin role for a specific brand in user_brand_permissions can update that brand. Note: "admin" in user_brand_permissions means brand admin, not global admin.';
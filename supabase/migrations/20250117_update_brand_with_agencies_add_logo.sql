-- Migration: Update update_brand_with_agencies function to include logo_url parameter
-- Description: Adds logo_url parameter to the update_brand_with_agencies RPC function
-- Date: 2025-01-17

CREATE OR REPLACE FUNCTION "public"."update_brand_with_agencies"(
    "p_brand_id_to_update" "uuid", 
    "p_name" "text", 
    "p_website_url" "text", 
    "p_additional_website_urls" "text"[], 
    "p_country" "text", 
    "p_language" "text", 
    "p_brand_identity" "text", 
    "p_tone_of_voice" "text", 
    "p_guardrails" "text", 
    "p_brand_color" "text", 
    "p_master_claim_brand_id" "uuid", 
    "p_selected_agency_ids" "uuid"[], 
    "p_new_custom_agency_names" "text"[], 
    "p_user_id" "uuid",
    "p_logo_url" "text" DEFAULT NULL
) RETURNS "json"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_custom_agency_id uuid;
    v_custom_agency_name text;
    v_brand_country_for_custom_agency text;
    v_existing_agency_id uuid;
    v_normalized_website_domain text;
    v_new_agency_ids uuid[] := '{}';
    v_created_agency_ids jsonb := '[]'::jsonb;
BEGIN
    -- Normalize the main website domain
    v_normalized_website_domain := CASE 
        WHEN p_website_url IS NOT NULL AND p_website_url != '' 
        THEN normalize_website_domain(p_website_url)
        ELSE NULL
    END;

    -- Check if brand exists and user has permission
    IF NOT EXISTS (
        SELECT 1 FROM public.brands WHERE id = p_brand_id_to_update
    ) THEN
        RAISE EXCEPTION 'Brand not found';
    END IF;

    -- Update the brand
    UPDATE public.brands
    SET
        name = p_name,
        website_url = p_website_url,
        normalized_website_domain = v_normalized_website_domain,
        additional_website_urls = p_additional_website_urls,
        country = p_country,
        language = p_language,
        brand_identity = p_brand_identity,
        tone_of_voice = p_tone_of_voice,
        guardrails = p_guardrails,
        brand_color = p_brand_color,
        master_claim_brand_id = p_master_claim_brand_id,
        logo_url = COALESCE(p_logo_url, logo_url),  -- Added logo_url, preserving existing if not provided
        updated_at = NOW()
    WHERE id = p_brand_id_to_update;

    -- Delete existing brand-agency relationships
    DELETE FROM public.brand_selected_agencies 
    WHERE brand_id = p_brand_id_to_update;

    -- Create custom agencies if needed and collect their IDs
    IF p_new_custom_agency_names IS NOT NULL AND array_length(p_new_custom_agency_names, 1) > 0 THEN
        SELECT country INTO v_brand_country_for_custom_agency 
        FROM brands 
        WHERE id = p_brand_id_to_update;
        
        IF v_brand_country_for_custom_agency IS NULL THEN
            v_brand_country_for_custom_agency := p_country;
        END IF;

        FOREACH v_custom_agency_name IN ARRAY p_new_custom_agency_names
        LOOP
            -- Check if agency already exists with same name and country
            SELECT id INTO v_existing_agency_id
            FROM public.content_vetting_agencies
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_custom_agency_name))
              AND country_code = v_brand_country_for_custom_agency
              AND is_custom = true
            LIMIT 1;

            IF v_existing_agency_id IS NOT NULL THEN
                v_custom_agency_id := v_existing_agency_id;
            ELSE
                -- Create new custom agency
                INSERT INTO public.content_vetting_agencies (
                    name, 
                    country_code, 
                    is_custom, 
                    created_by,
                    priority
                )
                VALUES (
                    TRIM(v_custom_agency_name), 
                    v_brand_country_for_custom_agency, 
                    true, 
                    p_user_id,
                    'Low'
                )
                RETURNING id INTO v_custom_agency_id;
            END IF;

            -- Add to array of new agency IDs
            v_new_agency_ids := array_append(v_new_agency_ids, v_custom_agency_id);
            
            -- Add to JSON array for response
            v_created_agency_ids := v_created_agency_ids || 
                jsonb_build_object('id', v_custom_agency_id, 'name', TRIM(v_custom_agency_name));
        END LOOP;
    END IF;

    -- Insert all selected agencies (existing + newly created)
    IF p_selected_agency_ids IS NOT NULL AND array_length(p_selected_agency_ids, 1) > 0 THEN
        INSERT INTO public.brand_selected_agencies (brand_id, agency_id)
        SELECT p_brand_id_to_update, unnest(p_selected_agency_ids);
    END IF;

    -- Insert newly created custom agencies
    IF array_length(v_new_agency_ids, 1) > 0 THEN
        INSERT INTO public.brand_selected_agencies (brand_id, agency_id)
        SELECT p_brand_id_to_update, unnest(v_new_agency_ids);
    END IF;

    -- Return success with created agency IDs
    RETURN json_build_object(
        'success', true,
        'brand_id', p_brand_id_to_update,
        'created_custom_agencies', v_created_agency_ids
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;
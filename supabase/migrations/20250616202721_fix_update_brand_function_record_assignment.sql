-- Fix the update_brand_with_agencies function to properly handle NULL master_claim_brand_id
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
    "p_user_id" "uuid"
) RETURNS "json"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
        DECLARE
            v_normalized_website_domain TEXT;
            v_agency_id UUID;
            v_custom_agency_name TEXT;
            v_brand_country_for_custom_agency TEXT;
            updated_brand_record RECORD;
            selected_agencies_json JSON;
            brand_admins_json JSON;
            master_claim_brand_name TEXT;  -- Changed from RECORD to TEXT
        BEGIN
            IF p_website_url IS NOT NULL AND p_website_url <> '' THEN
                v_normalized_website_domain := (SELECT (regexp_matches(p_website_url, '^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)'))[1]);
            ELSE
                v_normalized_website_domain := NULL;
            END IF;

            SELECT country INTO v_brand_country_for_custom_agency FROM brands WHERE id = p_brand_id_to_update;
            IF v_brand_country_for_custom_agency IS NULL THEN
                v_brand_country_for_custom_agency := p_country;
            END IF;

            UPDATE brands
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
                content_vetting_agencies = NULL,
                updated_at = NOW()
            WHERE id = p_brand_id_to_update;

            DELETE FROM brand_selected_agencies WHERE brand_id = p_brand_id_to_update;

            IF p_selected_agency_ids IS NOT NULL THEN
                FOREACH v_agency_id IN ARRAY p_selected_agency_ids LOOP
                    INSERT INTO brand_selected_agencies (brand_id, agency_id)
                    VALUES (p_brand_id_to_update, v_agency_id)
                    ON CONFLICT (brand_id, agency_id) DO NOTHING;
                END LOOP;
            END IF;

            IF p_new_custom_agency_names IS NOT NULL THEN
                FOREACH v_custom_agency_name IN ARRAY p_new_custom_agency_names LOOP
                    IF v_custom_agency_name IS NOT NULL AND v_custom_agency_name <> '' THEN
                        SELECT id INTO v_agency_id FROM content_vetting_agencies WHERE name = v_custom_agency_name LIMIT 1;

                        IF v_agency_id IS NULL THEN
                            INSERT INTO content_vetting_agencies (name, country_code, priority, description)
                            VALUES (
                                v_custom_agency_name,
                                v_brand_country_for_custom_agency,
                                'Low',
                                'Custom agency added for brand ' || p_name
                            )
                            RETURNING id INTO v_agency_id;
                        END IF;

                        IF v_agency_id IS NOT NULL THEN
                            INSERT INTO brand_selected_agencies (brand_id, agency_id)
                            VALUES (p_brand_id_to_update, v_agency_id)
                            ON CONFLICT (brand_id, agency_id) DO NOTHING;
                        END IF;
                    END IF;
                END LOOP;
            END IF;

            SELECT * INTO updated_brand_record FROM brands WHERE id = p_brand_id_to_update;

            -- Fixed: Only query for master claim brand name if ID is not null
            IF updated_brand_record.master_claim_brand_id IS NOT NULL THEN
                SELECT name INTO master_claim_brand_name FROM master_claim_brands WHERE id = updated_brand_record.master_claim_brand_id;
            ELSE
                master_claim_brand_name := NULL;
            END IF;

            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', cva.id,
                    'name', cva.name,
                    'description', cva.description,
                    'country_code', cva.country_code,
                    'priority', CASE cva.priority
                                    WHEN 'High' THEN 1
                                    WHEN 'Medium' THEN 2
                                    WHEN 'Low' THEN 3
                                    ELSE 4
                                END
                ) ORDER BY CASE cva.priority
                                WHEN 'High' THEN 1
                                WHEN 'Medium' THEN 2
                                WHEN 'Low' THEN 3
                                ELSE 4
                            END, cva.name ASC
            ), '[]'::json)
            INTO selected_agencies_json
            FROM brand_selected_agencies bsa
            JOIN content_vetting_agencies cva ON bsa.agency_id = cva.id
            WHERE bsa.brand_id = p_brand_id_to_update;

            SELECT COALESCE(json_agg(
                json_build_object(
                    'id', p.id,
                    'full_name', p.full_name,
                    'email', p.email,
                    'avatar_url', p.avatar_url,
                    'job_title', p.job_title
                )
            ), '[]'::json)
            INTO brand_admins_json
            FROM user_brand_permissions ubp
            JOIN profiles p ON ubp.user_id = p.id
            WHERE ubp.brand_id = p_brand_id_to_update AND ubp.role = 'admin';
            
            RETURN json_build_object(
                'id', updated_brand_record.id,
                'name', updated_brand_record.name,
                'website_url', updated_brand_record.website_url,
                'additional_website_urls', updated_brand_record.additional_website_urls,
                'country', updated_brand_record.country,
                'language', updated_brand_record.language,
                'brand_identity', updated_brand_record.brand_identity,
                'tone_of_voice', updated_brand_record.tone_of_voice,
                'guardrails', updated_brand_record.guardrails,
                'brand_color', updated_brand_record.brand_color,
                'master_claim_brand_id', updated_brand_record.master_claim_brand_id,
                'master_claim_brand_name', master_claim_brand_name,  -- Now using the TEXT variable
                'created_at', updated_brand_record.created_at,
                'updated_at', updated_brand_record.updated_at,
                'normalized_website_domain', updated_brand_record.normalized_website_domain,
                'selected_vetting_agencies', selected_agencies_json,
                'admins', brand_admins_json
            );
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Error in update_brand_with_agencies function: %', SQLERRM;
                RETURN json_build_object('success', false, 'error', SQLERRM);
        END;
        $$;
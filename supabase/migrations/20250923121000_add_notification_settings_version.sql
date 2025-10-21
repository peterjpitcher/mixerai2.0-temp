

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."claim_category_enum" AS ENUM (
    'Quality',
    'Dairy Base',
    'Texture',
    'Specific Ingredients',
    'Product Quality',
    'Ingredient Simplicity',
    'Dietary Restrictions',
    'Origin of ingredient',
    'No/No/No',
    'Stabilisers/Additives',
    'Heritage',
    'Craftmanship',
    'Best consumed',
    'Coating',
    'General',
    'Brand Promise',
    'Brand Tag Line',
    'Allergen Information',
    'Nutritional Information',
    'Sustainability/Sourcing',
    'Promotional'
);


ALTER TYPE "public"."claim_category_enum" OWNER TO "postgres";


CREATE TYPE "public"."claim_level_enum" AS ENUM (
    'brand',
    'product',
    'ingredient'
);


ALTER TYPE "public"."claim_level_enum" OWNER TO "postgres";


CREATE TYPE "public"."claim_type_enum" AS ENUM (
    'allowed',
    'disallowed'
);


ALTER TYPE "public"."claim_type_enum" OWNER TO "postgres";


COMMENT ON TYPE "public"."claim_type_enum" IS 'Claim types restricted to allowed and disallowed only. Mandatory and conditional types were removed on 2025-01-20.';



CREATE TYPE "public"."content_status" AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'published',
    'rejected',
    'cancelled'
);


ALTER TYPE "public"."content_status" OWNER TO "postgres";


CREATE TYPE "public"."feedback_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."feedback_priority" OWNER TO "postgres";


CREATE TYPE "public"."feedback_status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed',
    'wont_fix'
);


ALTER TYPE "public"."feedback_status" OWNER TO "postgres";


CREATE TYPE "public"."feedback_type" AS ENUM (
    'bug',
    'enhancement'
);


ALTER TYPE "public"."feedback_type" OWNER TO "postgres";


CREATE TYPE "public"."tool_run_status" AS ENUM (
    'success',
    'failure'
);


ALTER TYPE "public"."tool_run_status" OWNER TO "postgres";


CREATE TYPE "public"."user_brand_role_enum" AS ENUM (
    'admin',
    'editor',
    'viewer'
);


ALTER TYPE "public"."user_brand_role_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'editor',
    'viewer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'inactive',
    'pending',
    'suspended'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE TYPE "public"."vetting_agency_priority_level" AS ENUM (
    'High',
    'Medium',
    'Low'
);


ALTER TYPE "public"."vetting_agency_priority_level" OWNER TO "postgres";


CREATE TYPE "public"."workflow_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE "public"."workflow_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text" DEFAULT ''::"text", "p_reviewer_id" "uuid" DEFAULT NULL::"uuid", "p_comment" "text" DEFAULT NULL::"text", "p_updated_claim_text" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_current_step_id UUID;
  v_workflow_id UUID;
  v_next_step_id UUID;
  v_first_step_id UUID;
  v_step_name TEXT;
  v_result JSONB;
BEGIN
  -- Get current workflow info
  SELECT current_workflow_step, workflow_id
  INTO v_current_step_id, v_workflow_id
  FROM claims
  WHERE id = p_claim_id;

  IF v_current_step_id IS NULL OR v_workflow_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Claim has no active workflow'
    );
  END IF;

  -- Get step name
  SELECT name INTO v_step_name
  FROM claims_workflow_steps
  WHERE id = v_current_step_id;

  -- Record the action in history with new fields
  INSERT INTO claim_workflow_history (
    claim_id,
    workflow_step_id,
    step_name,
    action_status,
    feedback,
    reviewer_id,
    created_at,
    comment,
    updated_claim_text
  ) VALUES (
    p_claim_id,
    v_current_step_id,
    v_step_name,
    CASE
      WHEN p_action = 'approve' THEN 'approved'
      WHEN p_action = 'reject' THEN 'rejected'
      ELSE 'pending_review'
    END,
    p_feedback,
    p_reviewer_id,
    NOW(),
    p_comment,
    p_updated_claim_text
  );

  -- Handle approval
  IF p_action = 'approve' THEN
    -- Add current step to completed steps
    UPDATE claims
    SET completed_workflow_steps = array_append(
      COALESCE(completed_workflow_steps, ARRAY[]::UUID[]),
      v_current_step_id
    )
    WHERE id = p_claim_id;

    -- Get next step
    SELECT id INTO v_next_step_id
    FROM claims_workflow_steps
    WHERE workflow_id = v_workflow_id
      AND step_order > (
        SELECT step_order
        FROM claims_workflow_steps
        WHERE id = v_current_step_id
      )
    ORDER BY step_order
    LIMIT 1;

    IF v_next_step_id IS NOT NULL THEN
      -- Move to next step
      UPDATE claims
      SET
        current_workflow_step = v_next_step_id,
        workflow_status = 'pending_review',
        updated_at = NOW(),
        updated_by = p_reviewer_id
      WHERE id = p_claim_id;
    ELSE
      -- Workflow completed
      UPDATE claims
      SET
        current_workflow_step = NULL,
        workflow_status = 'approved',
        updated_at = NOW(),
        updated_by = p_reviewer_id
      WHERE id = p_claim_id;
    END IF;

  -- Handle rejection
  ELSIF p_action = 'reject' THEN
    -- Get first step of the workflow
    SELECT id INTO v_first_step_id
    FROM claims_workflow_steps
    WHERE workflow_id = v_workflow_id
    ORDER BY step_order
    LIMIT 1;

    -- Reset to first step and clear completed steps
    UPDATE claims
    SET
      current_workflow_step = v_first_step_id,
      completed_workflow_steps = ARRAY[]::UUID[],
      workflow_status = 'pending_review',
      updated_at = NOW(),
      updated_by = p_reviewer_id
    WHERE id = p_claim_id;

  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid action. Must be "approve" or "reject"'
    );
  END IF;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'action', p_action,
    'next_step_id', CASE
      WHEN p_action = 'approve' THEN v_next_step_id
      ELSE v_first_step_id
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid", "p_comment" "text", "p_updated_claim_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_first_step UUID;
    v_result JSONB;
BEGIN
    -- Get first step of workflow
    SELECT id INTO v_first_step
    FROM public.claims_workflow_steps
    WHERE workflow_id = p_workflow_id
    ORDER BY step_order
    LIMIT 1;

    IF v_first_step IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Workflow has no steps defined'
        );
    END IF;

    -- Update claim with workflow
    UPDATE public.claims
    SET workflow_id = p_workflow_id,
        current_workflow_step = v_first_step,
        workflow_status = 'pending_review',
        updated_at = NOW()
    WHERE id = p_claim_id;

    -- Create initial history entry
    INSERT INTO public.claim_workflow_history (
        claim_id,
        workflow_step_id,
        step_name,
        action_status,
        feedback,
        reviewer_id
    )
    SELECT 
        p_claim_id,
        v_first_step,
        ws.name,
        'pending_review',
        'Workflow assigned to claim',
        NULL
    FROM public.claims_workflow_steps ws
    WHERE ws.id = v_first_step;

    v_result := jsonb_build_object(
        'success', true,
        'message', 'Workflow assigned successfully',
        'workflow_id', p_workflow_id,
        'first_step_id', v_first_step
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_deactivate_user"("p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_user_role text;
  v_active_admin_count int;
BEGIN
  -- Get user role
  SELECT raw_user_meta_data->>'role' INTO v_user_role
  FROM auth.users WHERE id = p_user_id;
  
  -- If not an admin, can deactivate
  IF v_user_role != 'admin' THEN
    RETURN true;
  END IF;
  
  -- Count active admins
  SELECT COUNT(*) INTO v_active_admin_count
  FROM auth.users u
  JOIN public.user_accounts ua ON ua.id = u.id
  WHERE u.raw_user_meta_data->>'role' = 'admin'
  AND ua.status = 'active'
  AND u.id != p_user_id;
  
  -- Can't deactivate if this is the last active admin
  RETURN v_active_admin_count > 0;
END;
$$;


ALTER FUNCTION "public"."can_deactivate_user"("p_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."notification_outbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "text" NOT NULL,
    "recipient_id" "uuid",
    "recipient_email" "text",
    "subject" "text" NOT NULL,
    "template_name" "text" NOT NULL,
    "template_data" "jsonb" NOT NULL,
    "priority" integer DEFAULT 5,
    "status" "text" DEFAULT 'pending'::"text",
    "attempts" integer DEFAULT 0,
    "max_attempts" integer DEFAULT 3,
    "scheduled_for" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "notification_outbox_priority_check" CHECK ((("priority" >= 1) AND ("priority" <= 10))),
    CONSTRAINT "notification_outbox_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'sent'::"text", 'failed'::"text"]))),
    CONSTRAINT "notification_outbox_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'in_app'::"text", 'webhook'::"text"]))),
    CONSTRAINT "require_recipient" CHECK ((("recipient_id" IS NOT NULL) OR ("recipient_email" IS NOT NULL)))
);


ALTER TABLE "public"."notification_outbox" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_outbox" IS 'Queue for async notification delivery with exactly-once semantics';



CREATE OR REPLACE FUNCTION "public"."claim_notifications"("p_limit" integer DEFAULT 25) RETURNS SETOF "public"."notification_outbox"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
  UPDATE notification_outbox n
  SET status = 'processing', attempts = attempts + 1
  WHERE n.id IN (
    SELECT id 
    FROM notification_outbox
    WHERE status = 'pending' 
      AND scheduled_for <= NOW() 
      AND attempts < max_attempts
    ORDER BY priority DESC, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  RETURNING *;
$$;


ALTER FUNCTION "public"."claim_notifications"("p_limit" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."claim_notifications"("p_limit" integer) IS 'Atomically claim notifications for processing with skip-locked to prevent double-sends';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_activity_logs"("p_retention_days" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Delete logs older than retention period
  -- Keep PII data for shorter period (90 days)
  -- Keep non-PII data longer if needed
  
  -- First, clear PII from old records
  UPDATE public.user_activity_log
  SET 
    ip_address = NULL,
    user_agent = NULL,
    session_id = NULL
  WHERE created_at < NOW() - INTERVAL '1 day' * p_retention_days
  AND (ip_address IS NOT NULL OR user_agent IS NOT NULL OR session_id IS NOT NULL);
  
  -- Optionally delete very old records (e.g., > 365 days)
  DELETE FROM public.user_activity_log
  WHERE created_at < NOW() - INTERVAL '365 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_activity_logs"("p_retention_days" integer) OWNER TO "postgres";


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


ALTER FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_brand_with_permissions"("p_creator_user_id" "uuid", "p_brand_name" "text", "p_website_url" "text" DEFAULT NULL::"text", "p_country" "text" DEFAULT NULL::"text", "p_language" "text" DEFAULT NULL::"text", "p_brand_identity" "text" DEFAULT NULL::"text", "p_tone_of_voice" "text" DEFAULT NULL::"text", "p_guardrails" "text" DEFAULT NULL::"text", "p_brand_color" "text" DEFAULT NULL::"text", "p_logo_url" "text" DEFAULT NULL::"text", "p_approved_content_types" "jsonb" DEFAULT NULL::"jsonb", "p_master_claim_brand_id" "uuid" DEFAULT NULL::"uuid", "p_agency_ids" "uuid"[] DEFAULT NULL::"uuid"[]) RETURNS TABLE("brand_id" "uuid", "success" boolean, "error_message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_new_brand_id UUID;
  v_normalized_domain TEXT;
  v_agency_id UUID;
BEGIN
  -- Start transaction block
  BEGIN
    -- Insert the brand
    INSERT INTO brands (
      name,
      website_url,
      country,
      language,
      brand_identity,
      tone_of_voice,
      guardrails,
      brand_color,
      logo_url,
      approved_content_types,
      master_claim_brand_id
    ) VALUES (
      p_brand_name,
      p_website_url,
      p_country,
      p_language,
      p_brand_identity,
      p_tone_of_voice,
      p_guardrails,
      p_brand_color,
      p_logo_url,
      p_approved_content_types,
      p_master_claim_brand_id
    ) RETURNING id INTO v_new_brand_id;

    -- Create admin permission for the creator
    INSERT INTO user_brand_permissions (
      user_id,
      brand_id,
      role
    ) VALUES (
      p_creator_user_id,
      v_new_brand_id,
      'admin'
    );

    -- Update normalized website domain if URL provided
    IF p_website_url IS NOT NULL THEN
      v_normalized_domain := normalize_website_domain(p_website_url);
      IF v_normalized_domain IS NOT NULL THEN
        UPDATE brands 
        SET normalized_website_domain = v_normalized_domain
        WHERE id = v_new_brand_id;
      END IF;
    END IF;

    -- Add agency associations if provided
    IF p_agency_ids IS NOT NULL AND array_length(p_agency_ids, 1) > 0 THEN
      FOREACH v_agency_id IN ARRAY p_agency_ids
      LOOP
        INSERT INTO brand_selected_agencies (brand_id, agency_id)
        VALUES (v_new_brand_id, v_agency_id)
        ON CONFLICT (brand_id, agency_id) DO NOTHING;
      END LOOP;
    END IF;

    -- Return success
    RETURN QUERY SELECT v_new_brand_id, true::boolean, NULL::text;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in PL/pgSQL functions
      RETURN QUERY SELECT NULL::uuid, false::boolean, SQLERRM::text;
  END;
END;
$$;


ALTER FUNCTION "public"."create_brand_with_permissions"("p_creator_user_id" "uuid", "p_brand_name" "text", "p_website_url" "text", "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_logo_url" "text", "p_approved_content_types" "jsonb", "p_master_claim_brand_id" "uuid", "p_agency_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "text", "p_level" "text", "p_master_brand_id" "uuid" DEFAULT NULL::"uuid", "p_ingredient_id" "uuid" DEFAULT NULL::"uuid", "p_ingredient_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_product_ids" "uuid"[] DEFAULT '{}'::"uuid"[], "p_country_codes" "text"[] DEFAULT '{}'::"text"[], "p_description" "text" DEFAULT NULL::"text", "p_created_by" "uuid" DEFAULT NULL::"uuid", "p_workflow_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_claim_id UUID;
    v_country_code TEXT;
    v_product_id UUID;
    v_ingredient_id UUID;
BEGIN
    -- Generate a UUID for the claim (in case the claims table doesn't exist yet)
    v_claim_id := gen_random_uuid();
    
    -- Only create claim if claims table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'claims') THEN
        INSERT INTO claims (
            id,
            claim_text,
            claim_type,
            level,
            master_brand_id,
            ingredient_id,
            product_id,
            country_code,
            description,
            created_by,
            workflow_id
        ) VALUES (
            v_claim_id,
            p_claim_text,
            p_claim_type,
            p_level,
            p_master_brand_id,
            CASE WHEN p_level = 'ingredient' AND p_ingredient_id IS NOT NULL THEN p_ingredient_id END,
            CASE WHEN p_level = 'product' AND array_length(p_product_ids, 1) = 1 THEN p_product_ids[1] END,
            CASE WHEN array_length(p_country_codes, 1) > 0 THEN p_country_codes[1] END,
            p_description,
            p_created_by,
            p_workflow_id
        );
    END IF;

    -- Insert junction table data
    FOREACH v_country_code IN ARRAY p_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code)
        VALUES (v_claim_id, v_country_code)
        ON CONFLICT (claim_id, country_code) DO NOTHING;
    END LOOP;

    IF p_level = 'product' AND array_length(p_product_ids, 1) > 0 THEN
        FOREACH v_product_id IN ARRAY p_product_ids
        LOOP
            INSERT INTO claim_products (claim_id, product_id)
            VALUES (v_claim_id, v_product_id)
            ON CONFLICT (claim_id, product_id) DO NOTHING;
        END LOOP;
    END IF;

    IF p_level = 'ingredient' THEN
        IF p_ingredient_id IS NOT NULL THEN
            INSERT INTO claim_ingredients (claim_id, ingredient_id)
            VALUES (v_claim_id, p_ingredient_id)
            ON CONFLICT (claim_id, ingredient_id) DO NOTHING;
        END IF;
        
        IF array_length(p_ingredient_ids, 1) > 0 THEN
            FOREACH v_ingredient_id IN ARRAY p_ingredient_ids
            LOOP
                INSERT INTO claim_ingredients (claim_id, ingredient_id)
                VALUES (v_claim_id, v_ingredient_id)
                ON CONFLICT (claim_id, ingredient_id) DO NOTHING;
            END LOOP;
        END IF;
    END IF;

    RETURN v_claim_id;
END;
$$;


ALTER FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "text", "p_level" "text", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "public"."claim_type_enum", "p_level" "public"."claim_level_enum", "p_master_brand_id" "uuid" DEFAULT NULL::"uuid", "p_ingredient_id" "uuid" DEFAULT NULL::"uuid", "p_ingredient_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[], "p_product_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[], "p_country_codes" "text"[] DEFAULT ARRAY[]::"text"[], "p_description" "text" DEFAULT NULL::"text", "p_created_by" "uuid" DEFAULT "auth"."uid"(), "p_workflow_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_claim_id UUID;
  v_product_id UUID;
  v_ingredient_id UUID;
  v_country_code TEXT;
BEGIN
  -- Handle backward compatibility - if old parameter is used, convert to array
  IF p_ingredient_id IS NOT NULL AND (p_ingredient_ids IS NULL OR array_length(p_ingredient_ids, 1) = 0) THEN
    p_ingredient_ids := ARRAY[p_ingredient_id];
  END IF;

  -- Validate input based on level
  IF p_level = 'brand' AND p_master_brand_id IS NULL THEN
    RAISE EXCEPTION 'master_brand_id is required for brand-level claims';
  END IF;
  
  IF p_level = 'product' AND (p_product_ids IS NULL OR array_length(p_product_ids, 1) = 0) THEN
    RAISE EXCEPTION 'At least one product_id is required for product-level claims';
  END IF;
  
  IF p_level = 'ingredient' AND (p_ingredient_ids IS NULL OR array_length(p_ingredient_ids, 1) = 0) THEN
    RAISE EXCEPTION 'At least one ingredient_id is required for ingredient-level claims';
  END IF;
  
  IF p_country_codes IS NULL OR array_length(p_country_codes, 1) = 0 THEN
    RAISE EXCEPTION 'At least one country_code is required';
  END IF;

  -- For backward compatibility with the check constraint, we need to set the legacy columns
  -- Use the first ID from arrays for the deprecated single-value columns
  DECLARE
    v_legacy_product_id UUID := NULL;
    v_legacy_ingredient_id UUID := NULL;
    v_legacy_country_code TEXT := NULL;
  BEGIN
    IF p_level = 'product' AND array_length(p_product_ids, 1) > 0 THEN
      v_legacy_product_id := p_product_ids[1];
    END IF;
    
    IF p_level = 'ingredient' AND array_length(p_ingredient_ids, 1) > 0 THEN
      v_legacy_ingredient_id := p_ingredient_ids[1];
    END IF;

    -- Use the first country code for the legacy country_code column
    IF array_length(p_country_codes, 1) > 0 THEN
      v_legacy_country_code := p_country_codes[1];
    END IF;

    -- Insert the claim with legacy columns for backward compatibility
    INSERT INTO claims (
      claim_text,
      claim_type,
      level,
      master_brand_id,
      product_id,  -- Legacy column
      ingredient_id,  -- Legacy column
      country_code,  -- This was missing! Now populated with first country code
      description,
      created_by,
      workflow_id
    ) VALUES (
      p_claim_text,
      p_claim_type,
      p_level,
      CASE WHEN p_level = 'brand' THEN p_master_brand_id ELSE NULL END,
      v_legacy_product_id,  -- Set for backward compatibility
      v_legacy_ingredient_id,  -- Set for backward compatibility
      v_legacy_country_code,  -- Set for backward compatibility
      p_description,
      p_created_by,
      p_workflow_id
    ) RETURNING id INTO v_claim_id;
  END;

  -- Insert product associations
  IF p_level = 'product' AND p_product_ids IS NOT NULL THEN
    FOREACH v_product_id IN ARRAY p_product_ids
    LOOP
      INSERT INTO claim_products (claim_id, product_id)
      VALUES (v_claim_id, v_product_id);
    END LOOP;
  END IF;

  -- Insert ingredient associations
  IF p_level = 'ingredient' AND p_ingredient_ids IS NOT NULL THEN
    FOREACH v_ingredient_id IN ARRAY p_ingredient_ids
    LOOP
      INSERT INTO claim_ingredients (claim_id, ingredient_id)
      VALUES (v_claim_id, v_ingredient_id);
    END LOOP;
  END IF;

  -- Insert country associations
  IF p_country_codes IS NOT NULL THEN
    FOREACH v_country_code IN ARRAY p_country_codes
    LOOP
      INSERT INTO claim_countries (claim_id, country_code)
      VALUES (v_claim_id, v_country_code);
    END LOOP;
  END IF;

  RETURN v_claim_id;
END;
$$;


ALTER FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "public"."claim_type_enum", "p_level" "public"."claim_level_enum", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "public"."claim_type_enum", "p_level" "public"."claim_level_enum", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") IS 'Creates a claim with proper associations to products, ingredients, and countries using junction tables. Maintains backward compatibility with legacy single-value columns.';



CREATE OR REPLACE FUNCTION "public"."create_claims_batch"("p_claims" "jsonb", "p_workflow_id" "uuid" DEFAULT NULL::"uuid", "p_created_by" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("success" boolean, "error_message" "text", "created_claim_ids" "uuid"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_claim JSONB;
  v_claim_id UUID;
  v_claim_ids UUID[] := '{}';
BEGIN
  BEGIN
    -- Validate input
    IF p_claims IS NULL OR jsonb_array_length(p_claims) = 0 THEN
      RETURN QUERY SELECT false, 'No claims provided'::text, NULL::uuid[];
      RETURN;
    END IF;
    
    -- Process each claim
    FOR v_claim IN SELECT * FROM jsonb_array_elements(p_claims)
    LOOP
      INSERT INTO claims (
        claim_text,
        claim_type,
        level,
        master_brand_id,
        product_id,
        ingredient_id,
        country_code,
        description,
        created_by,
        workflow_id
      ) VALUES (
        v_claim->>'claim_text',
        (v_claim->>'claim_type')::claim_type_enum,
        (v_claim->>'level')::claim_level_enum,
        (v_claim->>'master_brand_id')::uuid,
        (v_claim->>'product_id')::uuid,
        (v_claim->>'ingredient_id')::uuid,
        v_claim->>'country_code',
        v_claim->>'description',
        p_created_by,
        p_workflow_id
      ) RETURNING id INTO v_claim_id;
      
      v_claim_ids := array_append(v_claim_ids, v_claim_id);
      
      -- If workflow provided, initialize workflow status
      IF p_workflow_id IS NOT NULL THEN
        UPDATE claims
        SET 
          workflow_status = 'pending',
          current_workflow_step = 0
        WHERE id = v_claim_id;
      END IF;
    END LOOP;
    
    RETURN QUERY SELECT true, NULL::text, v_claim_ids;
    
  EXCEPTION
    WHEN OTHERS THEN
      RETURN QUERY SELECT false, SQLERRM::text, NULL::uuid[];
  END;
END;
$$;


ALTER FUNCTION "public"."create_claims_batch"("p_claims" "jsonb", "p_workflow_id" "uuid", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_for_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, job_title, company)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_profile_for_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_account"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_accounts (id, status)
  VALUES (NEW.id, 'active')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_workflow_id UUID;
  step_data JSONB;           -- Individual step definition from p_steps_definition
  assignee_data JSONB;       -- Individual assignee object from step_data->'assignees'
  step_assignee_uuids UUID[]; -- Array to hold UUIDs of assignees for the current step
  step_order_counter INTEGER := 0;
  invitation_item JSONB;
  target_step_id_for_invitation UUID;
BEGIN
  -- Insert the new workflow (without the old 'steps' JSON column)
  INSERT INTO workflows (name, brand_id, created_by)
  VALUES (p_name, p_brand_id, p_created_by)
  RETURNING id INTO new_workflow_id;

  -- Iterate through the provided step definitions and insert them into workflow_steps
  IF jsonb_array_length(p_steps_definition) > 0 THEN
    FOR step_data IN SELECT * FROM jsonb_array_elements(p_steps_definition)
    LOOP
      step_order_counter := step_order_counter + 1;
      step_assignee_uuids := ARRAY[]::UUID[]; -- Initialize as empty array for each step

      -- Check if step_data has an 'assignees' array and it's not empty
      IF jsonb_typeof(step_data->'assignees') = 'array' AND jsonb_array_length(step_data->'assignees') > 0 THEN
        FOR assignee_data IN SELECT * FROM jsonb_array_elements(step_data->'assignees')
        LOOP
          -- Only add if the assignee object has an 'id' (UUID)
          IF assignee_data->>'id' IS NOT NULL THEN
            step_assignee_uuids := array_append(step_assignee_uuids, (assignee_data->>'id')::UUID);
          END IF;
        END LOOP;
      END IF;

      INSERT INTO workflow_steps (
        workflow_id,
        name,
        description,
        role,
        step_order,
        approval_required,
        assigned_user_ids -- New column
      )
      VALUES (
        new_workflow_id,
        step_data->>'name',
        step_data->>'description',
        (step_data->>'role')::user_role,
        step_order_counter,
        COALESCE((step_data->>'approvalRequired')::BOOLEAN, FALSE),
        step_assignee_uuids -- Store the collected UUIDs
      );
    END LOOP;
  END IF;

  -- Insert invitation items if any are provided
  IF jsonb_array_length(p_invitation_items) > 0 THEN
    FOR invitation_item IN SELECT * FROM jsonb_array_elements(p_invitation_items)
    LOOP
      SELECT id INTO target_step_id_for_invitation
      FROM workflow_steps ws
      WHERE ws.workflow_id = new_workflow_id AND ws.step_order = (invitation_item->>'step_order')::INTEGER;

      IF target_step_id_for_invitation IS NOT NULL THEN
        INSERT INTO workflow_invitations (
          workflow_id,
          step_id,
          email,
          role,
          invite_token,
          expires_at,
          status
        ) VALUES (
          new_workflow_id,
          target_step_id_for_invitation,
          invitation_item->>'email',
          (invitation_item->>'role')::user_role,
          invitation_item->>'invite_token',
          (invitation_item->>'expires_at')::TIMESTAMPTZ,
          'pending'
        );
      ELSE
        RAISE WARNING 'No matching step found for step_order % in workflow % for invitation to %',
          (invitation_item->>'step_order'), new_workflow_id, invitation_item->>'email';
      END IF;
    END LOOP;
  END IF;

  RETURN new_workflow_id;
END;
$$;


ALTER FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_workflow_and_log_invitations"("p_brand_id" "uuid", "p_workflow_name" "text", "p_workflow_description" "text", "p_created_by" "uuid", "p_workflow_steps" "jsonb", "p_template_id" "uuid" DEFAULT NULL::"uuid", "p_status" "text" DEFAULT 'active'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_workflow_id uuid;
  v_step record;
  v_step_id uuid;
  v_assignment record;
  v_user_index int;
BEGIN
  -- Validate input
  IF p_workflow_name IS NULL OR trim(p_workflow_name) = '' THEN
    RAISE EXCEPTION 'Workflow name is required';
  END IF;
  
  IF p_brand_id IS NULL THEN
    RAISE EXCEPTION 'Brand ID is required';
  END IF;
  
  IF p_workflow_steps IS NULL OR jsonb_array_length(p_workflow_steps) = 0 THEN
    RAISE EXCEPTION 'At least one workflow step is required';
  END IF;

  -- Start transaction
  BEGIN
    -- Create workflow
    INSERT INTO workflows (
      brand_id, 
      name, 
      description, 
      created_by, 
      template_id, 
      status,
      published_at,
      created_at,
      updated_at
    )
    VALUES (
      p_brand_id, 
      p_workflow_name, 
      p_workflow_description, 
      p_created_by, 
      p_template_id, 
      p_status,
      CASE WHEN p_status = 'active' THEN NOW() ELSE NULL END,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_workflow_id;

    -- Create steps with proper assignments
    FOR v_step IN SELECT * FROM jsonb_array_elements(p_workflow_steps)
    LOOP
      -- Validate step data
      IF v_step.value->>'name' IS NULL THEN
        RAISE EXCEPTION 'Step name is required';
      END IF;
      
      -- Create the step
      INSERT INTO workflow_steps (
        workflow_id,
        name,
        type,
        order_index,
        created_at,
        updated_at
      )
      VALUES (
        v_workflow_id,
        v_step.value->>'name',
        COALESCE(v_step.value->>'type', 'review'),
        COALESCE((v_step.value->>'order')::int, (v_step.value->>'order_index')::int, 0),
        NOW(),
        NOW()
      )
      RETURNING id INTO v_step_id;

      -- Create assignments in the relational table
      IF v_step.value->'assigned_user_ids' IS NOT NULL THEN
        FOR v_user_index IN 0..jsonb_array_length(v_step.value->'assigned_user_ids') - 1
        LOOP
          INSERT INTO workflow_step_assignments (
            step_id,
            user_id,
            role
          )
          VALUES (
            v_step_id,
            (v_step.value->'assigned_user_ids'->>v_user_index)::uuid,
            COALESCE(
              v_step.value->'assigned_roles'->>v_user_index,
              v_step.value->'role_mapping'->>(v_step.value->'assigned_user_ids'->>v_user_index),
              'reviewer' -- Default role
            )::text
          )
          ON CONFLICT (step_id, user_id) DO UPDATE
          SET role = EXCLUDED.role, updated_at = NOW();
        END LOOP;
      END IF;

      -- Log invitations if needed
      IF v_step.value->'assigned_user_ids' IS NOT NULL THEN
        INSERT INTO invitation_logs (
          workflow_step_id,
          user_id,
          invited_at,
          role
        )
        SELECT 
          v_step_id,
          (user_id_text)::uuid,
          NOW(),
          COALESCE(
            v_step.value->'assigned_roles'->>idx::text,
            v_step.value->'role_mapping'->>user_id_text,
            'reviewer'
          )::text
        FROM jsonb_array_elements_text(v_step.value->'assigned_user_ids') 
        WITH ORDINALITY AS t(user_id_text, idx);
      END IF;
    END LOOP;

    RETURN v_workflow_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback and re-raise with context
      RAISE EXCEPTION 'Failed to create workflow: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION "public"."create_workflow_and_log_invitations"("p_brand_id" "uuid", "p_workflow_name" "text", "p_workflow_description" "text", "p_created_by" "uuid", "p_workflow_steps" "jsonb", "p_template_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_workflow_and_log_invitations"("p_brand_id" "uuid", "p_workflow_name" "text", "p_workflow_description" "text", "p_created_by" "uuid", "p_workflow_steps" "jsonb", "p_template_id" "uuid", "p_status" "text") IS 'Atomically creates workflow with steps and assignments';



CREATE OR REPLACE FUNCTION "public"."deactivate_user"("p_user_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_changed_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_status text;
  v_result jsonb;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM public.user_accounts
  WHERE id = p_user_id;
  
  IF v_old_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_old_status = 'inactive' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already inactive');
  END IF;
  
  -- Update status
  UPDATE public.user_accounts
  SET 
    status = 'inactive',
    status_reason = p_reason,
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record history
  INSERT INTO public.user_status_history (
    user_id, old_status, new_status, reason, changed_by
  ) VALUES (
    p_user_id, v_old_status, 'inactive', p_reason, p_changed_by
  );
  
  -- Note: Session revocation must be done via Supabase Admin API
  -- from an Edge Function or backend with service role key
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_status', v_old_status,
    'new_status', 'inactive'
  );
END;
$$;


ALTER FUNCTION "public"."deactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Delete associated user_brand_permissions
  DELETE FROM public.user_brand_permissions WHERE brand_id = brand_id_to_delete;

  -- Delete associated workflows (this will set content.workflow_id to NULL due to ON DELETE SET NULL)
  -- It will also cascade to workflow_invitations if that table has ON DELETE CASCADE for workflow_id.
  DELETE FROM public.workflows WHERE brand_id = brand_id_to_delete;
  
  -- Delete the brand itself (this will cascade to content.brand_id due to ON DELETE CASCADE)
  DELETE FROM public.brands WHERE id = brand_id_to_delete;

  -- Check if the brand was actually deleted. If not, it means it wasn't found or some RLS prevented it.
  IF NOT FOUND THEN
    RAISE WARNING 'Brand with ID % not found or not deleted during delete_brand_and_dependents.', brand_id_to_delete;
    -- You might want to raise an exception here if not finding the brand is a critical error for the function's contract
    -- RAISE EXCEPTION 'Brand not found: %', brand_id_to_delete;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (optional, requires appropriate logging setup in Postgres)
    RAISE WARNING 'Error in delete_brand_and_dependents for brand %: % - % ', brand_id_to_delete, SQLSTATE, SQLERRM;
    -- Re-raise the exception to ensure transaction rollback and alert the caller
    RAISE;
END;
$$;


ALTER FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") IS 'Atomically deletes a brand and its direct dependents like user_brand_permissions and workflows. Content linked to the brand is cascade deleted. Content linked to workflows of the brand has its workflow_id set to NULL.';



CREATE OR REPLACE FUNCTION "public"."delete_brand_cascade"("p_brand_id" "uuid", "p_deleting_user_id" "uuid") RETURNS TABLE("success" boolean, "error_message" "text", "deleted_content_count" integer, "deleted_workflow_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_content_count INTEGER;
  v_workflow_count INTEGER;
BEGIN
  BEGIN
    -- Count items to be deleted for reporting
    SELECT COUNT(*) INTO v_content_count FROM content WHERE brand_id = p_brand_id;
    SELECT COUNT(*) INTO v_workflow_count FROM workflows WHERE brand_id = p_brand_id;

    -- Delete in correct order to respect foreign key constraints
    
    -- 1. Delete content versions (references content)
    DELETE FROM content_versions 
    WHERE content_id IN (SELECT id FROM content WHERE brand_id = p_brand_id);
    
    -- 2. Delete content
    DELETE FROM content WHERE brand_id = p_brand_id;
    
    -- 3. Delete workflow steps and related data
    DELETE FROM workflow_user_assignments 
    WHERE workflow_id IN (SELECT id FROM workflows WHERE brand_id = p_brand_id);
    
    DELETE FROM workflow_steps 
    WHERE workflow_id IN (SELECT id FROM workflows WHERE brand_id = p_brand_id);
    
    -- 4. Delete workflows
    DELETE FROM workflows WHERE brand_id = p_brand_id;
    
    -- 5. Delete brand permissions
    DELETE FROM user_brand_permissions WHERE brand_id = p_brand_id;
    
    -- 6. Delete agency associations
    DELETE FROM brand_selected_agencies WHERE brand_id = p_brand_id;
    
    -- 7. Finally delete the brand
    DELETE FROM brands WHERE id = p_brand_id;
    
    RETURN QUERY SELECT true, NULL::text, v_content_count, v_workflow_count;
    
  EXCEPTION
    WHEN foreign_key_violation THEN
      RETURN QUERY SELECT false, 
        'Cannot delete brand due to existing dependencies: ' || SQLERRM::text, 
        0, 0;
    WHEN OTHERS THEN
      RETURN QUERY SELECT false, SQLERRM::text, 0, 0;
  END;
END;
$$;


ALTER FUNCTION "public"."delete_brand_cascade"("p_brand_id" "uuid", "p_deleting_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  template_exists boolean;
begin
  -- Verify the template exists before attempting to delete.
  select exists (
    select 1
    from public.content_templates
    where id = template_id_to_delete
  )
  into template_exists;

  if not template_exists then
    raise exception 'Content template not found: %', template_id_to_delete
      using errcode = 'P0002';
  end if;

  -- Null out template references on dependent records to avoid orphaned pointers.
  update public.content
  set template_id = null,
      updated_at = now()
  where template_id = template_id_to_delete;

  update public.workflows
  set template_id = null,
      updated_at = now()
  where template_id = template_id_to_delete;

  -- Remove the template itself.
  delete from public.content_templates
  where id = template_id_to_delete;

  if not found then
    raise exception 'Failed to delete content template: %', template_id_to_delete
      using errcode = 'P0002';
  end if;
exception
  when others then
    -- Re-raise to ensure the transaction is rolled back and surfaced to callers.
    raise;
end;
$$;


ALTER FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") IS 'Atomically clears references to a content template before deleting it.';



CREATE OR REPLACE FUNCTION "public"."enqueue_notification"("p_type" "text", "p_subject" "text", "p_template_name" "text", "p_template_data" "jsonb", "p_recipient_id" "uuid" DEFAULT NULL::"uuid", "p_recipient_email" "text" DEFAULT NULL::"text", "p_priority" integer DEFAULT 5, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Validate input
  IF p_recipient_id IS NULL AND p_recipient_email IS NULL THEN
    RAISE EXCEPTION 'Either recipient_id or recipient_email must be provided';
  END IF;
  
  IF p_subject IS NULL OR trim(p_subject) = '' THEN
    RAISE EXCEPTION 'Subject is required';
  END IF;
  
  IF p_template_name IS NULL OR trim(p_template_name) = '' THEN
    RAISE EXCEPTION 'Template name is required';
  END IF;

  -- Insert notification
  INSERT INTO notification_outbox (
    type,
    recipient_id,
    recipient_email,
    subject,
    template_name,
    template_data,
    priority,
    metadata,
    scheduled_for
  )
  VALUES (
    p_type,
    p_recipient_id,
    p_recipient_email,
    p_subject,
    p_template_name,
    p_template_data,
    p_priority,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."enqueue_notification"("p_type" "text", "p_subject" "text", "p_template_name" "text", "p_template_data" "jsonb", "p_recipient_id" "uuid", "p_recipient_email" "text", "p_priority" integer, "p_metadata" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enqueue_notification"("p_type" "text", "p_subject" "text", "p_template_name" "text", "p_template_data" "jsonb", "p_recipient_id" "uuid", "p_recipient_email" "text", "p_priority" integer, "p_metadata" "jsonb") IS 'Helper to enqueue notifications with validation';



CREATE OR REPLACE FUNCTION "public"."enqueue_workflow_notification"("p_content_id" "uuid", "p_workflow_id" "uuid", "p_step_id" "uuid", "p_recipient_id" "uuid", "p_action" "text", "p_content_title" "text", "p_brand_name" "text", "p_step_name" "text", "p_comment" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_notification_id uuid;
  v_recipient_email text;
  v_subject text;
  v_template_name text;
BEGIN
  -- Get recipient email
  SELECT email INTO v_recipient_email
  FROM auth.users
  WHERE id = p_recipient_id;
  
  IF v_recipient_email IS NULL THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;
  
  -- Determine subject and template based on action
  IF p_action = 'review_required' THEN
    v_subject := 'Review Required: ' || p_content_title;
    v_template_name := 'workflow_review_required';
  ELSIF p_action = 'approved' THEN
    v_subject := 'Content Approved: ' || p_content_title;
    v_template_name := 'workflow_approved';
  ELSIF p_action = 'rejected' THEN
    v_subject := 'Content Rejected: ' || p_content_title;
    v_template_name := 'workflow_rejected';
  ELSE
    v_subject := 'Workflow Update: ' || p_content_title;
    v_template_name := 'workflow_update';
  END IF;
  
  -- Enqueue the notification
  v_notification_id := enqueue_notification(
    p_type := 'email',
    p_recipient_id := p_recipient_id,
    p_recipient_email := v_recipient_email,
    p_subject := v_subject,
    p_template_name := v_template_name,
    p_template_data := jsonb_build_object(
      'contentId', p_content_id,
      'contentTitle', p_content_title,
      'brandName', p_brand_name,
      'workflowStep', p_step_name,
      'action', p_action,
      'comment', p_comment,
      'actionUrl', format('%s/dashboard/content/%s/review', 
        current_setting('app.base_url', true), 
        p_content_id)
    ),
    p_priority := CASE 
      WHEN p_action = 'review_required' THEN 8
      WHEN p_action = 'rejected' THEN 7
      ELSE 5
    END,
    p_metadata := jsonb_build_object(
      'content_id', p_content_id,
      'workflow_id', p_workflow_id,
      'step_id', p_step_id,
      'action', p_action
    )
  );
  
  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION "public"."enqueue_workflow_notification"("p_content_id" "uuid", "p_workflow_id" "uuid", "p_step_id" "uuid", "p_recipient_id" "uuid", "p_action" "text", "p_content_title" "text", "p_brand_name" "text", "p_step_name" "text", "p_comment" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enqueue_workflow_notification"("p_content_id" "uuid", "p_workflow_id" "uuid", "p_step_id" "uuid", "p_recipient_id" "uuid", "p_action" "text", "p_content_title" "text", "p_brand_name" "text", "p_step_name" "text", "p_comment" "text") IS 'Specialized function for workflow-related notifications';



CREATE OR REPLACE FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") RETURNS "text"[]
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(website_urls) 
      FROM brands 
      WHERE id = brand_uuid
    ),
    ARRAY[]::text[]
  );
$$;


ALTER FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") RETURNS "text"[]
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT country_code 
      FROM claim_countries 
      WHERE claim_id = claim_uuid 
      ORDER BY country_code
    ),
    ARRAY[]::text[]
  );
$$;


ALTER FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_claim_ingredients"("claim_uuid" "uuid") RETURNS "uuid"[]
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT ingredient_id 
      FROM claim_ingredients 
      WHERE claim_id = claim_uuid
    ),
    ARRAY[]::uuid[]
  );
$$;


ALTER FUNCTION "public"."get_claim_ingredients"("claim_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") RETURNS "uuid"[]
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT product_id 
      FROM claim_products 
      WHERE claim_id = claim_uuid
    ),
    ARRAY[]::uuid[]
  );
$$;


ALTER FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_days" integer DEFAULT 30) RETURNS TABLE("id" "uuid", "action_type" "text", "action_category" "text", "resource_type" "text", "resource_id" "uuid", "resource_name" "text", "brand_id" "uuid", "duration_ms" integer, "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ual.id,
    ual.action_type,
    ual.action_category,
    ual.resource_type,
    ual.resource_id,
    ual.resource_name,
    ual.brand_id,
    ual.duration_ms,
    ual.metadata,
    ual.created_at
  FROM public.user_activity_log ual
  WHERE ual.user_id = p_user_id
  AND ual.created_at >= NOW() - INTERVAL '1 day' * p_days
  ORDER BY ual.created_at DESC
  LIMIT 1000; -- Reasonable limit for UI display
END;
$$;


ALTER FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid", "p_days" integer DEFAULT 30) RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_summary jsonb;
BEGIN
  WITH activity_data AS (
    SELECT * FROM public.user_activity_log
    WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '1 day' * p_days
  ),
  category_counts AS (
    SELECT 
      action_category,
      COUNT(*) as count
    FROM activity_data
    GROUP BY action_category
  ),
  daily_counts AS (
    SELECT 
      DATE(created_at) as day,
      COUNT(*) as count
    FROM activity_data
    GROUP BY DATE(created_at)
  ),
  hourly_distribution AS (
    SELECT 
      EXTRACT(HOUR FROM created_at)::int as hour,
      COUNT(*) as count
    FROM activity_data
    GROUP BY EXTRACT(HOUR FROM created_at)
  ),
  recent_resources AS (
    SELECT DISTINCT ON (resource_id)
      resource_type,
      resource_id,
      resource_name,
      created_at
    FROM activity_data
    WHERE resource_id IS NOT NULL
    ORDER BY resource_id, created_at DESC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'total_actions', (SELECT COUNT(*) FROM activity_data),
    'by_category', (SELECT jsonb_object_agg(action_category, count) FROM category_counts),
    'by_day', (SELECT jsonb_object_agg(day::text, count) FROM daily_counts),
    'by_hour', (SELECT jsonb_object_agg(hour::text, count) FROM hourly_distribution),
    'recent_items', (SELECT jsonb_agg(row_to_json(r)) FROM recent_resources r),
    'date_range', jsonb_build_object(
      'start', (SELECT MIN(created_at) FROM activity_data),
      'end', (SELECT MAX(created_at) FROM activity_data)
    )
  ) INTO v_summary;
  
  RETURN v_summary;
END;
$$;


ALTER FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_content_workflow_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_assignee_id UUID;
BEGIN
    -- Only proceed if the content has a workflow and assigned users
    IF NEW.workflow_id IS NOT NULL AND NEW.assigned_to IS NOT NULL AND array_length(NEW.assigned_to, 1) > 0 THEN
        -- Create a task for each assigned user
        FOREACH v_assignee_id IN ARRAY NEW.assigned_to
        LOOP
            INSERT INTO user_tasks (
                user_id, 
                content_id, 
                workflow_id, 
                workflow_step_id,
                workflow_step_name,
                status,
                due_date
            ) VALUES (
                v_assignee_id,
                NEW.id,
                NEW.workflow_id,
                COALESCE(NEW.current_step, gen_random_uuid()), -- Use current_step or generate a placeholder
                'Initial Review', -- Default step name
                'pending',
                NEW.due_date
            )
            ON CONFLICT (user_id, content_id, workflow_step_id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_content_workflow_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'avatar_url', ''),
    new.email
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_workflow_assignment_task_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_content_record RECORD;
    v_step_name TEXT;
BEGIN
    -- Get step name
    SELECT name INTO v_step_name
    FROM workflow_steps
    WHERE id = NEW.step_id;

    -- Find all content items for this workflow that are at this step
    FOR v_content_record IN 
        SELECT id, due_date 
        FROM content 
        WHERE workflow_id = NEW.workflow_id 
        AND current_step = NEW.step_id
    LOOP
        -- Create task for the new assignment
        INSERT INTO user_tasks (
            user_id, 
            content_id, 
            workflow_id, 
            workflow_step_id,
            workflow_step_name,
            status,
            due_date
        ) VALUES (
            NEW.user_id,
            v_content_record.id,
            NEW.workflow_id,
            NEW.step_id,
            v_step_name,
            'pending',
            v_content_record.due_date
        )
        ON CONFLICT (user_id, content_id, workflow_step_id) DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_workflow_assignment_task_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_brand_permission"("user_id" "uuid", "target_brand_id" "uuid", "allowed_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $_$
    SELECT EXISTS (
        SELECT 1 FROM user_brand_permissions
        WHERE user_brand_permissions.user_id = $1 
        AND brand_id = $2 
        AND role::text = ANY($3)
    );
$_$;


ALTER FUNCTION "public"."has_brand_permission"("user_id" "uuid", "target_brand_id" "uuid", "allowed_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_global_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_system_roles
        WHERE user_id = auth.uid() AND role = 'superadmin'
    );
$$;


ALTER FUNCTION "public"."is_global_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_global_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $_$
    SELECT EXISTS (
        SELECT 1 FROM user_system_roles
        WHERE user_system_roles.user_id = $1 AND role = 'superadmin'
    );
$_$;


ALTER FUNCTION "public"."is_global_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_active"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_accounts 
    WHERE id = user_id AND status = 'active'
  );
END;
$$;


ALTER FUNCTION "public"."is_user_active"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO security_logs (event_type, user_id, ip_address, details)
    VALUES (p_event_type, COALESCE(p_user_id, auth.uid()), p_ip_address, p_details)
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;


ALTER FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action_type" "text", "p_action_category" "text", "p_resource_type" "text" DEFAULT NULL::"text", "p_resource_id" "uuid" DEFAULT NULL::"uuid", "p_resource_name" "text" DEFAULT NULL::"text", "p_brand_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "inet" DEFAULT NULL::"inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_session_id" "text" DEFAULT NULL::"text", "p_duration_ms" integer DEFAULT NULL::integer, "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO public.user_activity_log (
    user_id, action_type, action_category,
    resource_type, resource_id, resource_name,
    brand_id, ip_address, user_agent,
    session_id, duration_ms, metadata
  ) VALUES (
    p_user_id, p_action_type, p_action_category,
    p_resource_type, p_resource_id, p_resource_name,
    p_brand_id, p_ip_address, p_user_agent,
    p_session_id, p_duration_ms, p_metadata
  ) RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;


ALTER FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action_type" "text", "p_action_category" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_resource_name" "text", "p_brand_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" "text", "p_duration_ms" integer, "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_website_domain"("url" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
DECLARE
    v_domain TEXT;
BEGIN
    IF url IS NULL OR url = '' THEN
        RETURN NULL;
    END IF;

    -- Remove protocol
    v_domain := regexp_replace(url, '^https?://', '', 'i');
    
    -- Remove www prefix
    v_domain := regexp_replace(v_domain, '^www\.', '', 'i');
    
    -- Remove trailing slash and path
    v_domain := regexp_replace(v_domain, '/.*$', '');
    
    -- Remove port if present
    v_domain := regexp_replace(v_domain, ':[0-9]+$', '');
    
    -- Convert to lowercase
    v_domain := lower(v_domain);
    
    -- Basic validation - must contain at least one dot
    IF v_domain !~ '\.' THEN
        RETURN NULL;
    END IF;
    
    RETURN v_domain;
END;
$_$;


ALTER FUNCTION "public"."normalize_website_domain"("url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reactivate_user"("p_user_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_changed_by" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM public.user_accounts
  WHERE id = p_user_id;
  
  IF v_old_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF v_old_status = 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already active');
  END IF;
  
  -- Update status
  UPDATE public.user_accounts
  SET 
    status = 'active',
    status_reason = p_reason,
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Record history
  INSERT INTO public.user_status_history (
    user_id, old_status, new_status, reason, changed_by
  ) VALUES (
    p_user_id, v_old_status, 'active', p_reason, p_changed_by
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_status', v_old_status,
    'new_status', 'active'
  );
END;
$$;


ALTER FUNCTION "public"."reactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brand_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Generate brand summary based on brand name and other details
    IF NEW.brand_summary IS NULL OR NEW.brand_summary = '' THEN
        NEW.brand_summary := CASE
            WHEN NEW.brand_identity IS NOT NULL AND LENGTH(NEW.brand_identity) > 0 THEN
                SUBSTRING(NEW.brand_identity FROM 1 FOR 150) || 
                CASE WHEN LENGTH(NEW.brand_identity) > 150 THEN '...' ELSE '' END
            ELSE
                NEW.name || COALESCE(' - ' || NEW.country, '') || 
                COALESCE(' (' || NEW.language || ')', '')
        END;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_brand_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_feedback_item_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_feedback_item_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_tasks_modtime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_tasks_modtime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflow_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Set published_at when transitioning to active
  IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    NEW.published_at = NOW();
  -- Clear published_at when transitioning away from active
  ELSIF NEW.status != 'active' AND OLD.status = 'active' THEN
    NEW.published_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_workflow_published_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_market_claim_override_references"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_claim_level claim_level_enum;
    v_claim_product_ids uuid[];
BEGIN
    -- Get the claim level
    SELECT level INTO v_claim_level
    FROM claims
    WHERE id = NEW.master_claim_id;
    
    -- If claim is not at product level, it cannot be overridden
    IF v_claim_level != 'product' THEN
        RAISE EXCEPTION 'Only product-level claims can be overridden';
    END IF;
    
    -- Get all products associated with the claim
    v_claim_product_ids := get_claim_products(NEW.master_claim_id);
    
    -- Check if target product is in the claim's product list
    IF NOT (NEW.target_product_id = ANY(v_claim_product_ids)) THEN
        RAISE EXCEPTION 'Target product % is not associated with claim %', 
            NEW.target_product_id, NEW.master_claim_id;
    END IF;
    
    -- If replacement claim is provided, verify it exists
    IF NEW.replacement_claim_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM claims WHERE id = NEW.replacement_claim_id) THEN
            RAISE EXCEPTION 'Replacement claim % does not exist', NEW.replacement_claim_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_market_claim_override_references"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_market_country_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Allow the special __ALL_COUNTRIES__ value
    IF NEW.market_country_code = '__ALL_COUNTRIES__' THEN
        RETURN NEW;
    END IF;
    
    -- Otherwise, check if the country code exists in the countries table
    IF NOT EXISTS (
        SELECT 1 FROM countries 
        WHERE code = NEW.market_country_code
    ) THEN
        RAISE EXCEPTION 'Invalid country code: %', NEW.market_country_code;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_market_country_code"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."analytics" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "content_id" "uuid",
    "views" integer DEFAULT 0,
    "shares" integer DEFAULT 0,
    "likes" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brand_master_claim_brands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "master_claim_brand_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."brand_master_claim_brands" OWNER TO "postgres";


COMMENT ON TABLE "public"."brand_master_claim_brands" IS 'Junction table linking MixerAI brands to master claim brands in a many-to-many relationship';



CREATE TABLE IF NOT EXISTS "public"."brand_selected_agencies" (
    "brand_id" "uuid" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brand_selected_agencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "website_url" "text",
    "country" "text",
    "language" "text",
    "brand_identity" "text",
    "tone_of_voice" "text",
    "guardrails" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "brand_color" "text" DEFAULT '#3498db'::"text",
    "brand_summary" "text",
    "brand_admin_id" "uuid",
    "normalized_website_domain" "text",
    "content_vetting_agencies" "text"[],
    "approved_content_types" "jsonb",
    "master_claim_brand_id" "uuid",
    "website_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "logo_url" "text",
    "additional_website_urls" "text"[] DEFAULT ARRAY[]::"text"[],
    CONSTRAINT "check_website_urls_is_array" CHECK (("jsonb_typeof"("website_urls") = 'array'::"text"))
);

ALTER TABLE ONLY "public"."brands" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" OWNER TO "postgres";


COMMENT ON COLUMN "public"."brands"."brand_color" IS 'HEX color code for brand visual identity, generated by AI or manually set';



COMMENT ON COLUMN "public"."brands"."brand_summary" IS 'Short summary of the brand for display in listings';



COMMENT ON COLUMN "public"."brands"."brand_admin_id" IS 'Designated admin for handling rejected content in workflows';



COMMENT ON COLUMN "public"."brands"."content_vetting_agencies" IS 'Array of IDs or names of selected content vetting agencies associated with the brand.';



COMMENT ON COLUMN "public"."brands"."approved_content_types" IS 'JSONB array or object storing approved content types for the brand (e.g., array of content type IDs or names).';



COMMENT ON COLUMN "public"."brands"."master_claim_brand_id" IS 'Foreign key to the master_claim_brands table, linking a brand to its corresponding master claim brand for claims management.';



COMMENT ON COLUMN "public"."brands"."website_urls" IS 'Array of website URLs with structure: [{id: string, url: string, isPrimary?: boolean}]';



COMMENT ON COLUMN "public"."brands"."logo_url" IS 'URL to brand logo image stored in Supabase Storage or external URL';



COMMENT ON COLUMN "public"."brands"."additional_website_urls" IS 'Additional website URLs associated with the brand';



CREATE TABLE IF NOT EXISTS "public"."claim_countries" (
    "claim_id" "uuid" NOT NULL,
    "country_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_ingredients" (
    "claim_id" "uuid" NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_ingredients" OWNER TO "postgres";


COMMENT ON TABLE "public"."claim_ingredients" IS 'Junction table to support multiple ingredients per claim';



CREATE TABLE IF NOT EXISTS "public"."claim_products" (
    "claim_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."claim_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "master_claim_brand_id" "uuid" NOT NULL,
    "country_code" character varying(2) NOT NULL,
    "review_data" "jsonb" NOT NULL,
    "reviewed_by" "uuid" NOT NULL,
    "reviewed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_reviews" OWNER TO "postgres";


COMMENT ON TABLE "public"."claim_reviews" IS 'Stores AI-generated claim review results for master claim brands by country';



COMMENT ON COLUMN "public"."claim_reviews"."review_data" IS 'JSON object containing the full review details including individual claim reviews';



CREATE TABLE IF NOT EXISTS "public"."claim_workflow_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "workflow_step_id" "uuid",
    "step_name" "text",
    "action_status" "text" NOT NULL,
    "feedback" "text",
    "reviewer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_claim_text" "text",
    "comment" "text"
);


ALTER TABLE "public"."claim_workflow_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."claim_workflow_history" IS 'Audit trail of claim approval workflow actions';



CREATE TABLE IF NOT EXISTS "public"."claims" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "claim_text" "text" NOT NULL,
    "claim_type" "public"."claim_type_enum" NOT NULL,
    "level" "public"."claim_level_enum" NOT NULL,
    "product_id" "uuid",
    "ingredient_id" "uuid",
    "country_code" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "master_brand_id" "uuid",
    "created_by" "uuid",
    "workflow_id" "uuid",
    "current_workflow_step" "uuid",
    "workflow_status" "public"."content_status" DEFAULT 'draft'::"public"."content_status",
    "completed_workflow_steps" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "updated_by" "uuid",
    CONSTRAINT "chk_claim_level_reference" CHECK (((("level" = 'brand'::"public"."claim_level_enum") AND ("master_brand_id" IS NOT NULL) AND ("product_id" IS NULL) AND ("ingredient_id" IS NULL)) OR (("level" = 'product'::"public"."claim_level_enum") AND ("product_id" IS NOT NULL) AND ("master_brand_id" IS NULL) AND ("ingredient_id" IS NULL)) OR (("level" = 'ingredient'::"public"."claim_level_enum") AND ("ingredient_id" IS NOT NULL) AND ("master_brand_id" IS NULL) AND ("product_id" IS NULL))))
);


ALTER TABLE "public"."claims" OWNER TO "postgres";


COMMENT ON TABLE "public"."claims" IS 'Stores marketing claims related to brands, products, or ingredients.';



COMMENT ON COLUMN "public"."claims"."claim_text" IS 'The actual text of the claim.';



COMMENT ON COLUMN "public"."claims"."claim_type" IS 'allowed: Can be used freely, disallowed: Cannot be used, conditional: Has specific conditions, mandatory: Must be included';



COMMENT ON COLUMN "public"."claims"."level" IS 'brand: Applies to entire brand, product: Specific to a product/SKU, ingredient: Specific to an ingredient';



COMMENT ON COLUMN "public"."claims"."product_id" IS 'DEPRECATED: Use claim_products junction table instead';



COMMENT ON COLUMN "public"."claims"."ingredient_id" IS 'FK to ingredients table if claim is at ingredient level. NULL otherwise.';



COMMENT ON COLUMN "public"."claims"."country_code" IS 'DEPRECATED: Use claim_countries junction table instead';



COMMENT ON COLUMN "public"."claims"."description" IS 'Optional internal notes or context about the claim.';



COMMENT ON COLUMN "public"."claims"."master_brand_id" IS 'FK to master_claim_brands(id) if claim is at brand level. (Renamed from global_brand_id)';



COMMENT ON COLUMN "public"."claims"."created_by" IS 'Tracks the user ID of the user who originally created the claim. References auth.users.';



COMMENT ON COLUMN "public"."claims"."workflow_id" IS 'Optional workflow for claim approval process';



COMMENT ON COLUMN "public"."claims"."current_workflow_step" IS 'Current step in the approval workflow';



COMMENT ON COLUMN "public"."claims"."workflow_status" IS 'Status of the claim in the workflow';



CREATE TABLE IF NOT EXISTS "public"."claims_workflow_steps" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "step_order" integer NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "role" "text" NOT NULL,
    "approval_required" boolean DEFAULT true NOT NULL,
    "assigned_user_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "claims_workflow_steps_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text", 'legal'::"text", 'compliance'::"text", 'marketing'::"text", 'lrc'::"text", 'bdt'::"text", 'mat'::"text", 'sme'::"text"])))
);


ALTER TABLE "public"."claims_workflow_steps" OWNER TO "postgres";


COMMENT ON TABLE "public"."claims_workflow_steps" IS 'Steps within claims approval workflows';



COMMENT ON COLUMN "public"."claims_workflow_steps"."role" IS 'Role required to complete this step (includes legal, lrc, bdt, mat, sme)';



CREATE TABLE IF NOT EXISTS "public"."claims_workflows" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "brand_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."claims_workflows" OWNER TO "postgres";


COMMENT ON TABLE "public"."claims_workflows" IS 'Workflow definitions specifically for claims approval processes';



COMMENT ON COLUMN "public"."claims_workflows"."brand_id" IS 'Optional brand association - claims workflows are typically global';



CREATE TABLE IF NOT EXISTS "public"."ingredients" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ingredients" OWNER TO "postgres";


COMMENT ON TABLE "public"."ingredients" IS 'Stores information about ingredients that can be used in products.';



COMMENT ON COLUMN "public"."ingredients"."name" IS 'Name of the ingredient, must be unique.';



COMMENT ON COLUMN "public"."ingredients"."description" IS 'Optional description for the ingredient.';



CREATE TABLE IF NOT EXISTS "public"."master_claim_brands" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "mixerai_brand_id" "uuid"
);


ALTER TABLE "public"."master_claim_brands" OWNER TO "postgres";


COMMENT ON TABLE "public"."master_claim_brands" IS 'Stores master brand entities for claims management. (Renamed from global_claim_brands)';



COMMENT ON COLUMN "public"."master_claim_brands"."id" IS 'Unique identifier for the global claim brand.';



COMMENT ON COLUMN "public"."master_claim_brands"."name" IS 'Name of the global claim brand (e.g., "Häagen-Dazs", "Betty Crocker"). Must be unique.';



COMMENT ON COLUMN "public"."master_claim_brands"."created_at" IS 'Timestamp of when the global claim brand was created.';



COMMENT ON COLUMN "public"."master_claim_brands"."updated_at" IS 'Timestamp of when the global claim brand was last updated.';



COMMENT ON COLUMN "public"."master_claim_brands"."mixerai_brand_id" IS 'Foreign key linking to the main MixerAI brands table. Enables permissions based on main brand ownership and cascades deletes.';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "master_brand_id" "uuid"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Stores information about individual products, linked to a global_claim_brand.';



COMMENT ON COLUMN "public"."products"."name" IS 'Name of the product, unique within its brand.';



COMMENT ON COLUMN "public"."products"."description" IS 'Optional description for the product.';



COMMENT ON COLUMN "public"."products"."master_brand_id" IS 'Foreign key referencing the master_claim_brands(id) this product belongs to. (Renamed from global_brand_id)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "job_title" "text",
    "company" "text",
    "email" "text",
    "notification_settings" "jsonb" DEFAULT '{"weeklyDigest": false, "productUpdates": true, "marketingEmails": false, "emailNotifications": true, "workflowNotifications": true}'::"jsonb",
    "email_notifications_enabled" boolean DEFAULT true,
    "email_frequency" "text" DEFAULT 'immediate'::"text",
    "email_preferences" "jsonb" DEFAULT '{"task_assignments": true, "workflow_updates": true, "deadline_reminders": true}'::"jsonb",
    "notification_settings_version" bigint DEFAULT 0 NOT NULL,
    CONSTRAINT "profiles_email_frequency_check" CHECK (("email_frequency" = ANY (ARRAY['immediate'::"text", 'daily'::"text", 'weekly'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL to user profile avatar image stored in Supabase Storage';



COMMENT ON COLUMN "public"."profiles"."job_title" IS 'User''s job title or role within their organization';



COMMENT ON COLUMN "public"."profiles"."company" IS 'Company or organization where the user is employed';



COMMENT ON COLUMN "public"."profiles"."email" IS 'Email address of the user, used for workflows and notifications';



COMMENT ON COLUMN "public"."profiles"."notification_settings" IS 'User notification preferences as JSON object';



COMMENT ON COLUMN "public"."profiles"."email_notifications_enabled" IS 'Whether the user wants to receive email notifications';



COMMENT ON COLUMN "public"."profiles"."email_frequency" IS 'How often the user wants to receive email notifications (immediate, daily digest, weekly digest)';



COMMENT ON COLUMN "public"."profiles"."email_preferences" IS 'JSON object containing email notification preferences for different event types';



COMMENT ON COLUMN "public"."profiles"."notification_settings_version" IS 'Monotonic counter used for notification preference concurrency control.';



CREATE OR REPLACE VIEW "public"."claims_pending_approval" AS
 SELECT "c"."id",
    "c"."claim_text",
    "c"."claim_type",
    "c"."level",
    "c"."description",
    "c"."workflow_id",
    "c"."current_workflow_step",
    "c"."workflow_status",
    "c"."created_at",
    "c"."created_by",
    "cw"."name" AS "workflow_name",
    "ws"."name" AS "current_step_name",
    "ws"."role" AS "current_step_role",
    "ws"."assigned_user_ids" AS "current_step_assignees",
    "p"."full_name" AS "creator_name",
        CASE
            WHEN ("c"."level" = 'brand'::"public"."claim_level_enum") THEN "mcb"."name"
            WHEN ("c"."level" = 'product'::"public"."claim_level_enum") THEN "prod"."name"
            WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN "ing"."name"
            ELSE NULL::"text"
        END AS "entity_name",
    COALESCE("cw"."brand_id", "b"."id", "mcb_brand"."id") AS "brand_id",
    COALESCE("b"."name", "mcb_brand"."name") AS "brand_name",
    COALESCE("b"."logo_url", "mcb_brand"."logo_url") AS "brand_logo_url",
    COALESCE("b"."brand_color", "mcb_brand"."brand_color") AS "brand_primary_color"
   FROM (((((((("public"."claims" "c"
     LEFT JOIN "public"."claims_workflows" "cw" ON (("c"."workflow_id" = "cw"."id")))
     LEFT JOIN "public"."claims_workflow_steps" "ws" ON (("c"."current_workflow_step" = "ws"."id")))
     LEFT JOIN "public"."profiles" "p" ON (("c"."created_by" = "p"."id")))
     LEFT JOIN "public"."master_claim_brands" "mcb" ON (("c"."master_brand_id" = "mcb"."id")))
     LEFT JOIN "public"."products" "prod" ON (("c"."product_id" = "prod"."id")))
     LEFT JOIN "public"."ingredients" "ing" ON (("c"."ingredient_id" = "ing"."id")))
     LEFT JOIN "public"."brands" "b" ON (("cw"."brand_id" = "b"."id")))
     LEFT JOIN "public"."brands" "mcb_brand" ON (("mcb"."mixerai_brand_id" = "mcb_brand"."id")))
  WHERE (("c"."workflow_status" = 'pending_review'::"public"."content_status") AND ("c"."workflow_id" IS NOT NULL));


ALTER TABLE "public"."claims_pending_approval" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."claims_with_arrays" AS
 SELECT "c"."id",
    "c"."claim_text",
    "c"."claim_type",
    "c"."level",
    "c"."master_brand_id",
    "c"."ingredient_id",
    "c"."description",
    "c"."created_at",
    "c"."updated_at",
    "c"."created_by",
    "c"."workflow_id",
    "c"."current_workflow_step",
    "c"."workflow_status",
    "c"."completed_workflow_steps",
    "c"."updated_by",
    "public"."get_claim_products"("c"."id") AS "product_ids",
    "public"."get_claim_countries"("c"."id") AS "country_codes",
    "public"."get_claim_ingredients"("c"."id") AS "ingredient_ids",
        CASE
            WHEN ("c"."level" = 'brand'::"public"."claim_level_enum") THEN "mcb"."name"
            WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN ( SELECT "string_agg"("i"."name", ', '::"text" ORDER BY "i"."name") AS "string_agg"
               FROM ("public"."claim_ingredients" "ci"
                 JOIN "public"."ingredients" "i" ON (("ci"."ingredient_id" = "i"."id")))
              WHERE ("ci"."claim_id" = "c"."id"))
            ELSE NULL::"text"
        END AS "entity_name",
        CASE
            WHEN ("c"."level" = 'product'::"public"."claim_level_enum") THEN ( SELECT "string_agg"("p"."name", ', '::"text" ORDER BY "p"."name") AS "string_agg"
               FROM ("public"."claim_products" "cp"
                 JOIN "public"."products" "p" ON (("cp"."product_id" = "p"."id")))
              WHERE ("cp"."claim_id" = "c"."id"))
            ELSE NULL::"text"
        END AS "product_names",
        CASE
            WHEN ("c"."level" = 'ingredient'::"public"."claim_level_enum") THEN ( SELECT "string_agg"("i"."name", ', '::"text" ORDER BY "i"."name") AS "string_agg"
               FROM ("public"."claim_ingredients" "ci"
                 JOIN "public"."ingredients" "i" ON (("ci"."ingredient_id" = "i"."id")))
              WHERE ("ci"."claim_id" = "c"."id"))
            ELSE NULL::"text"
        END AS "ingredient_names"
   FROM ("public"."claims" "c"
     LEFT JOIN "public"."master_claim_brands" "mcb" ON (("c"."master_brand_id" = "mcb"."id")));


ALTER TABLE "public"."claims_with_arrays" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "workflow_id" "uuid",
    "created_by" "uuid",
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "meta_title" "text",
    "meta_description" "text",
    "status" "public"."content_status" DEFAULT 'draft'::"public"."content_status" NOT NULL,
    "current_step" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "template_id" "uuid",
    "content_data" "jsonb",
    "version" integer DEFAULT 1,
    "published_version" integer,
    "content_type_id" "uuid",
    "assigned_to" "uuid"[],
    "fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "due_date" timestamp with time zone,
    "published_url" "text"
);

ALTER TABLE ONLY "public"."content" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."content" OWNER TO "postgres";


COMMENT ON COLUMN "public"."content"."assigned_to" IS 'Array of user IDs assigned to the current step of the content. No direct FK to profiles; integrity checked by app.';



COMMENT ON COLUMN "public"."content"."fields" IS 'Stores data for custom fields defined in a content template.';



COMMENT ON COLUMN "public"."content"."due_date" IS 'Optional due date for content completion';



CREATE TABLE IF NOT EXISTS "public"."content_ownership_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "content_id" "uuid",
    "previous_owner" "uuid",
    "new_owner" "uuid",
    "changed_by" "uuid",
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_ownership_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_templates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "fields" "jsonb" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "brand_id" "uuid",
    CONSTRAINT "check_fields_structure" CHECK ((("fields" IS NOT NULL) AND ("jsonb_typeof"("fields") = 'object'::"text") AND ("fields" ? 'inputFields'::"text") AND ("fields" ? 'outputFields'::"text") AND ("jsonb_typeof"(("fields" -> 'inputFields'::"text")) = 'array'::"text") AND ("jsonb_typeof"(("fields" -> 'outputFields'::"text")) = 'array'::"text")))
);

ALTER TABLE ONLY "public"."content_templates" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."content_templates" IS 'Stores content template definitions with customizable fields';



COMMENT ON COLUMN "public"."content_templates"."fields" IS 'Template field definitions with structure: {inputFields: InputField[], outputFields: OutputField[]}';



CREATE TABLE IF NOT EXISTS "public"."content_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."content_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."content_versions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "content_id" "uuid" NOT NULL,
    "workflow_step_identifier" "text" NOT NULL,
    "step_name" "text",
    "version_number" integer NOT NULL,
    "content_json" "jsonb",
    "action_status" "text" NOT NULL,
    "feedback" "text",
    "reviewer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_url" "text"
);


ALTER TABLE "public"."content_versions" OWNER TO "postgres";


COMMENT ON TABLE "public"."content_versions" IS 'Tracks versions of content as it moves through approval steps';



CREATE TABLE IF NOT EXISTS "public"."content_vetting_agencies" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "country_code" character varying(2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "priority" "public"."vetting_agency_priority_level"
);


ALTER TABLE "public"."content_vetting_agencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."countries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" character(2) NOT NULL,
    "name" character varying(255) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."countries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."error_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "severity" "text",
    "fingerprint" "text",
    "payload" "jsonb" NOT NULL,
    "reporter_ip" "text",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."error_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "type" "public"."feedback_type" NOT NULL,
    "title" "text",
    "description" "text",
    "priority" "public"."feedback_priority" NOT NULL,
    "status" "public"."feedback_status" DEFAULT 'open'::"public"."feedback_status" NOT NULL,
    "affected_area" "text",
    "steps_to_reproduce" "text",
    "expected_behavior" "text",
    "actual_behavior" "text",
    "attachments_metadata" "jsonb",
    "app_version" "text",
    "user_impact_details" "text",
    "url" "text",
    "browser_info" "text",
    "os_info" "text",
    "resolution_details" "text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "assigned_to" "uuid",
    "updated_by" "uuid"
);


ALTER TABLE "public"."feedback_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."feedback_items" IS 'Stores bug reports and enhancement requests submitted by users.';



CREATE TABLE IF NOT EXISTS "public"."global_override_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "override_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "affected_countries" "text"[] NOT NULL,
    "previous_state" "jsonb",
    "new_state" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "global_override_audit_action_check" CHECK (("action" = ANY (ARRAY['created'::"text", 'updated'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."global_override_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invitation_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "success" boolean NOT NULL,
    "error_message" "text",
    "invited_by" "uuid",
    "brand_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invitation_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."market_claim_overrides" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "master_claim_id" "uuid" NOT NULL,
    "market_country_code" "text" NOT NULL,
    "target_product_id" "uuid" NOT NULL,
    "is_blocked" boolean DEFAULT true NOT NULL,
    "replacement_claim_id" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."market_claim_overrides" OWNER TO "postgres";


COMMENT ON TABLE "public"."market_claim_overrides" IS 'Stores claim overrides by market. Use __ALL_COUNTRIES__ for global blocks. Precedence: Country-specific > Global > Base claims';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "action_url" "text",
    "action_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_archived" boolean DEFAULT false NOT NULL,
    "archived_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores user notifications for in-app notification system';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Notification type: success, error, warning, or info';



COMMENT ON COLUMN "public"."notifications"."is_archived" IS 'Soft delete flag - archived notifications are hidden but not deleted';



CREATE TABLE IF NOT EXISTS "public"."product_ingredients" (
    "product_id" "uuid" NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_ingredients" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_ingredients" IS 'Join table linking products to their ingredients.';



CREATE OR REPLACE VIEW "public"."profiles_view" AS
 SELECT "p"."id",
    "p"."full_name",
    "p"."avatar_url",
    "u"."email",
    "p"."created_at",
    "p"."updated_at"
   FROM ("public"."profiles" "p"
     JOIN "auth"."users" "u" ON (("p"."id" = "u"."id")));


ALTER TABLE "public"."profiles_view" OWNER TO "postgres";


COMMENT ON VIEW "public"."profiles_view" IS 'View that joins profiles with auth.users to provide access to email addresses';



CREATE TABLE IF NOT EXISTS "public"."security_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "user_id" "uuid",
    "ip_address" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_logs" IS 'Audit trail for security-related events like login attempts, password changes, and permission modifications';



CREATE TABLE IF NOT EXISTS "public"."tool_run_history" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "tool_name" "text" NOT NULL,
    "brand_id" "uuid",
    "inputs" "jsonb" NOT NULL,
    "outputs" "jsonb" NOT NULL,
    "run_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "public"."tool_run_status" DEFAULT 'success'::"public"."tool_run_status" NOT NULL,
    "error_message" "text",
    "batch_id" "uuid",
    "batch_sequence" integer,
    CONSTRAINT "check_tool_name" CHECK (("tool_name" = ANY (ARRAY['alt_text_generator'::"text", 'metadata_generator'::"text", 'content_transcreator'::"text"])))
);


ALTER TABLE "public"."tool_run_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."tool_run_history" IS 'Stores the history of runs for various AI tools.';



COMMENT ON COLUMN "public"."tool_run_history"."user_id" IS 'The user who ran the tool. Becomes NULL if the user is deleted.';



COMMENT ON COLUMN "public"."tool_run_history"."tool_name" IS 'Identifier for the tool that was run (e.g., alt_text_generator).';



COMMENT ON COLUMN "public"."tool_run_history"."brand_id" IS 'Optional brand associated with this tool run. Becomes NULL if the brand is deleted.';



COMMENT ON COLUMN "public"."tool_run_history"."inputs" IS 'JSON object containing the input parameters for the tool run.';



COMMENT ON COLUMN "public"."tool_run_history"."outputs" IS 'JSON object containing the results generated by the tool.';



COMMENT ON COLUMN "public"."tool_run_history"."run_at" IS 'Timestamp of when the tool run was executed.';



COMMENT ON COLUMN "public"."tool_run_history"."status" IS 'Status of the tool run (success or failure).';



COMMENT ON COLUMN "public"."tool_run_history"."error_message" IS 'Error message if the tool run failed.';



COMMENT ON COLUMN "public"."tool_run_history"."batch_id" IS 'Groups multiple tool runs that were executed together as a batch';



COMMENT ON COLUMN "public"."tool_run_history"."batch_sequence" IS 'Order of execution within a batch (1, 2, 3, etc.)';



CREATE TABLE IF NOT EXISTS "public"."user_accounts" (
    "id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "status_reason" "text",
    "status_changed_at" timestamp with time zone DEFAULT "now"(),
    "status_changed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_accounts_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."user_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_category" "text" NOT NULL,
    "resource_type" "text",
    "resource_id" "uuid",
    "resource_name" "text",
    "brand_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "session_id" "text",
    "duration_ms" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_activity_log_action_category_check" CHECK (("action_category" = ANY (ARRAY['authentication'::"text", 'content_management'::"text", 'workflow'::"text", 'user_management'::"text", 'template_management'::"text", 'settings'::"text", 'api_usage'::"text", 'file_operations'::"text"])))
);


ALTER TABLE "public"."user_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_brand_permissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "brand_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."user_brand_role_enum" DEFAULT 'viewer'::"public"."user_brand_role_enum" NOT NULL
);


ALTER TABLE "public"."user_brand_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workflow_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" NOT NULL,
    "invite_token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL,
    "step_id" "uuid",
    "user_id" "uuid"
);


ALTER TABLE "public"."workflow_invitations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_invitation_status" AS
 SELECT DISTINCT ON ("p"."id") "p"."id",
    "p"."email",
    "p"."full_name",
    "au"."last_sign_in_at",
    "wi"."expires_at",
    "wi"."status" AS "invitation_status",
        CASE
            WHEN ("au"."last_sign_in_at" IS NOT NULL) THEN 'active'::"text"
            WHEN ("wi"."expires_at" < "now"()) THEN 'expired'::"text"
            WHEN ("wi"."status" = 'pending'::"text") THEN 'pending'::"text"
            ELSE 'no_invitation'::"text"
        END AS "user_status"
   FROM (("public"."profiles" "p"
     LEFT JOIN "auth"."users" "au" ON (("p"."id" = "au"."id")))
     LEFT JOIN "public"."workflow_invitations" "wi" ON (("p"."email" = "wi"."email")))
  ORDER BY "p"."id", COALESCE("wi"."created_at", "au"."created_at") DESC;


ALTER TABLE "public"."user_invitation_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_invitations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "email" "text" NOT NULL,
    "invite_token" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "invitation_source" "text" NOT NULL,
    "source_id" "uuid",
    "invited_by" "uuid",
    "role" "text" NOT NULL,
    "last_reminder_at" timestamp with time zone,
    "reminder_count" integer DEFAULT 0,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_invitations_invitation_source_check" CHECK (("invitation_source" = ANY (ARRAY['workflow'::"text", 'brand'::"text", 'system'::"text"]))),
    CONSTRAINT "user_invitations_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'viewer'::"text", 'superadmin'::"text"]))),
    CONSTRAINT "user_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text"])))
);

ALTER TABLE ONLY "public"."user_invitations" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "old_status" "text",
    "new_status" "text" NOT NULL,
    "reason" "text",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."user_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_system_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_system_roles_role_check" CHECK (("role" = 'superadmin'::"text"))
);


ALTER TABLE "public"."user_system_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_tasks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content_id" "uuid" NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "workflow_step_id" "uuid" NOT NULL,
    "workflow_step_name" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "due_date" timestamp with time zone
);


ALTER TABLE "public"."user_tasks" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_tasks" IS 'Stores tasks assigned to users for specific content workflow steps.';



COMMENT ON COLUMN "public"."user_tasks"."workflow_step_id" IS 'Identifier of the workflow step, currently expected to be the 0-based index of the step in the workflow.steps JSONB array.';



COMMENT ON COLUMN "public"."user_tasks"."status" IS 'Status of the task, e.g., pending, in_progress, completed, rejected.';



CREATE TABLE IF NOT EXISTS "public"."waitlist_subscribers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."waitlist_subscribers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_step_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "step_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "workflow_step_assignments_role_check" CHECK (("role" = ANY (ARRAY['reviewer'::"text", 'approver'::"text", 'editor'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."workflow_step_assignments" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_step_assignments" IS 'Canonical source of user-role assignments for workflow steps';



CREATE TABLE IF NOT EXISTS "public"."workflow_steps" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "step_order" integer NOT NULL,
    "role" "text",
    "description" "text",
    "is_optional" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approval_required" boolean DEFAULT false,
    "step_id" "uuid" DEFAULT "extensions"."uuid_generate_v4"(),
    "assigned_user_ids" "uuid"[],
    "form_requirements" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."workflow_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflow_user_assignments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "workflow_id" "uuid",
    "step_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."workflow_user_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workflows" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "brand_id" "uuid",
    "name" "text" NOT NULL,
    "steps" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "template_id" "uuid",
    "description" "text",
    "status" "public"."workflow_status" DEFAULT 'draft'::"public"."workflow_status" NOT NULL
);

ALTER TABLE ONLY "public"."workflows" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflows" OWNER TO "postgres";


COMMENT ON COLUMN "public"."workflows"."created_by" IS 'The user who created this workflow';



COMMENT ON COLUMN "public"."workflows"."status" IS 'The current status of the workflow (e.g., active, draft, archived).';



ALTER TABLE ONLY "public"."analytics"
    ADD CONSTRAINT "analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_master_claim_brands"
    ADD CONSTRAINT "brand_master_claim_brands_brand_id_master_claim_brand_id_key" UNIQUE ("brand_id", "master_claim_brand_id");



ALTER TABLE ONLY "public"."brand_master_claim_brands"
    ADD CONSTRAINT "brand_master_claim_brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brand_selected_agencies"
    ADD CONSTRAINT "brand_selected_agencies_pkey" PRIMARY KEY ("brand_id", "agency_id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_countries"
    ADD CONSTRAINT "claim_countries_pkey" PRIMARY KEY ("claim_id", "country_code");



ALTER TABLE ONLY "public"."claim_ingredients"
    ADD CONSTRAINT "claim_ingredients_pkey" PRIMARY KEY ("claim_id", "ingredient_id");



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "claim_products_pkey" PRIMARY KEY ("claim_id", "product_id");



ALTER TABLE ONLY "public"."claim_reviews"
    ADD CONSTRAINT "claim_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_workflow_history"
    ADD CONSTRAINT "claim_workflow_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_uniqueness" UNIQUE ("claim_text", "level", "master_brand_id", "product_id", "ingredient_id", "country_code", "claim_type");



ALTER TABLE ONLY "public"."claims_workflow_steps"
    ADD CONSTRAINT "claims_workflow_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claims_workflow_steps"
    ADD CONSTRAINT "claims_workflow_steps_workflow_id_step_order_key" UNIQUE ("workflow_id", "step_order");



ALTER TABLE ONLY "public"."claims_workflows"
    ADD CONSTRAINT "claims_workflows_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."claims_workflows"
    ADD CONSTRAINT "claims_workflows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_types"
    ADD CONSTRAINT "content_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."content_types"
    ADD CONSTRAINT "content_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_versions"
    ADD CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_vetting_agencies"
    ADD CONSTRAINT "content_vetting_agencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."countries"
    ADD CONSTRAINT "countries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."error_reports"
    ADD CONSTRAINT "error_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "global_claim_brands_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "global_claim_brands_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "global_claim_brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_override_audit"
    ADD CONSTRAINT "global_override_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_logs"
    ADD CONSTRAINT "invitation_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_uniqueness" UNIQUE ("master_claim_id", "market_country_code", "target_product_id");



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_ingredients"
    ADD CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("product_id", "ingredient_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_global_brand_id_name_unique" UNIQUE ("master_brand_id", "name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_name_master_brand_id_key" UNIQUE ("name", "master_brand_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tool_run_history"
    ADD CONSTRAINT "tool_run_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."content_vetting_agencies"
    ADD CONSTRAINT "unique_agency_name_country" UNIQUE ("name", "country_code");



ALTER TABLE ONLY "public"."ingredients"
    ADD CONSTRAINT "uq_ingredients_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "uq_user_content_step" UNIQUE ("user_id", "content_id", "workflow_step_id");



ALTER TABLE ONLY "public"."user_accounts"
    ADD CONSTRAINT "user_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_user_id_brand_id_key" UNIQUE ("user_id", "brand_id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_status_history"
    ADD CONSTRAINT "user_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_user_content_step_unique" UNIQUE ("user_id", "content_id", "workflow_step_id");



ALTER TABLE ONLY "public"."waitlist_subscribers"
    ADD CONSTRAINT "waitlist_subscribers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_step_assignments"
    ADD CONSTRAINT "workflow_step_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_step_assignments"
    ADD CONSTRAINT "workflow_step_assignments_step_id_user_id_key" UNIQUE ("step_id", "user_id");



ALTER TABLE ONLY "public"."workflow_steps"
    ADD CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_steps"
    ADD CONSTRAINT "workflow_steps_workflow_id_step_order_key" UNIQUE ("workflow_id", "step_order");



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "workflow_user_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "workflow_user_assignments_workflow_id_step_id_user_id_key" UNIQUE ("workflow_id", "step_id", "user_id");



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_pkey" PRIMARY KEY ("id");



CREATE INDEX "error_reports_created_at_idx" ON "public"."error_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "error_reports_user_id_idx" ON "public"."error_reports" USING "btree" ("user_id");



CREATE INDEX "idx_activity_brand" ON "public"."user_activity_log" USING "btree" ("brand_id", "created_at" DESC) WHERE ("brand_id" IS NOT NULL);



CREATE INDEX "idx_activity_category" ON "public"."user_activity_log" USING "btree" ("action_category", "created_at" DESC);



CREATE INDEX "idx_activity_resource" ON "public"."user_activity_log" USING "btree" ("resource_type", "resource_id") WHERE ("resource_id" IS NOT NULL);



CREATE INDEX "idx_activity_user_30d" ON "public"."user_activity_log" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_brand_master_claim_brands_brand_id" ON "public"."brand_master_claim_brands" USING "btree" ("brand_id");



CREATE INDEX "idx_brand_master_claim_brands_master_claim_brand_id" ON "public"."brand_master_claim_brands" USING "btree" ("master_claim_brand_id");



CREATE INDEX "idx_brand_selected_agencies_agency_id" ON "public"."brand_selected_agencies" USING "btree" ("agency_id");



CREATE INDEX "idx_brand_selected_agencies_brand_id" ON "public"."brand_selected_agencies" USING "btree" ("brand_id");



CREATE INDEX "idx_brands_created_at" ON "public"."brands" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_brands_master_claim_brand_id" ON "public"."brands" USING "btree" ("master_claim_brand_id");



CREATE INDEX "idx_brands_name" ON "public"."brands" USING "btree" ("name");



CREATE INDEX "idx_brands_normalized_website_domain" ON "public"."brands" USING "btree" ("normalized_website_domain");



CREATE INDEX "idx_brands_updated_at" ON "public"."brands" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_brands_website_urls_gin" ON "public"."brands" USING "gin" ("website_urls");



CREATE INDEX "idx_claim_countries_claim_id" ON "public"."claim_countries" USING "btree" ("claim_id");



CREATE INDEX "idx_claim_countries_composite" ON "public"."claim_countries" USING "btree" ("claim_id", "country_code");



CREATE INDEX "idx_claim_countries_country_code" ON "public"."claim_countries" USING "btree" ("country_code");



CREATE INDEX "idx_claim_ingredients_claim_id" ON "public"."claim_ingredients" USING "btree" ("claim_id");



CREATE INDEX "idx_claim_ingredients_composite" ON "public"."claim_ingredients" USING "btree" ("claim_id", "ingredient_id");



CREATE INDEX "idx_claim_ingredients_ingredient_id" ON "public"."claim_ingredients" USING "btree" ("ingredient_id");



CREATE INDEX "idx_claim_products_claim_id" ON "public"."claim_products" USING "btree" ("claim_id");



CREATE INDEX "idx_claim_products_composite" ON "public"."claim_products" USING "btree" ("claim_id", "product_id");



CREATE INDEX "idx_claim_products_product_id" ON "public"."claim_products" USING "btree" ("product_id");



CREATE INDEX "idx_claim_reviews_brand" ON "public"."claim_reviews" USING "btree" ("master_claim_brand_id");



CREATE INDEX "idx_claim_reviews_country" ON "public"."claim_reviews" USING "btree" ("country_code");



CREATE INDEX "idx_claim_reviews_country_code" ON "public"."claim_reviews" USING "btree" ("country_code");



CREATE INDEX "idx_claim_reviews_date" ON "public"."claim_reviews" USING "btree" ("reviewed_at" DESC);



CREATE INDEX "idx_claim_reviews_master_claim_brand_id" ON "public"."claim_reviews" USING "btree" ("master_claim_brand_id");



CREATE INDEX "idx_claim_reviews_reviewed_at" ON "public"."claim_reviews" USING "btree" ("reviewed_at" DESC);



CREATE INDEX "idx_claim_reviews_reviewed_by" ON "public"."claim_reviews" USING "btree" ("reviewed_by");



CREATE INDEX "idx_claim_reviews_reviewer" ON "public"."claim_reviews" USING "btree" ("reviewed_by");



CREATE INDEX "idx_claim_workflow_history_claim_id" ON "public"."claim_workflow_history" USING "btree" ("claim_id");



CREATE INDEX "idx_claim_workflow_history_created_at" ON "public"."claim_workflow_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_claims_brand_level" ON "public"."claims" USING "btree" ("master_brand_id", "level") WHERE ("master_brand_id" IS NOT NULL);



CREATE INDEX "idx_claims_created_at" ON "public"."claims" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_claims_current_workflow_step" ON "public"."claims" USING "btree" ("current_workflow_step");



CREATE INDEX "idx_claims_description_search" ON "public"."claims" USING "gin" ("to_tsvector"('"english"'::"regconfig", COALESCE("description", ''::"text")));



CREATE INDEX "idx_claims_ingredient_level" ON "public"."claims" USING "btree" ("ingredient_id", "level") WHERE ("ingredient_id" IS NOT NULL);



CREATE INDEX "idx_claims_master_brand_id" ON "public"."claims" USING "btree" ("master_brand_id");



CREATE INDEX "idx_claims_product_id" ON "public"."claims" USING "btree" ("product_id");



CREATE INDEX "idx_claims_product_level" ON "public"."claims" USING "btree" ("level") WHERE ("level" = 'product'::"public"."claim_level_enum");



CREATE INDEX "idx_claims_text_search" ON "public"."claims" USING "gin" ("to_tsvector"('"english"'::"regconfig", "claim_text"));



CREATE INDEX "idx_claims_updated_at" ON "public"."claims" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_claims_workflow_id" ON "public"."claims" USING "btree" ("workflow_id");



CREATE INDEX "idx_claims_workflow_status" ON "public"."claims" USING "btree" ("workflow_status");



CREATE INDEX "idx_claims_workflow_steps_assigned_users" ON "public"."claims_workflow_steps" USING "gin" ("assigned_user_ids");



CREATE INDEX "idx_claims_workflow_steps_workflow_id" ON "public"."claims_workflow_steps" USING "btree" ("workflow_id");



CREATE INDEX "idx_claims_workflows_brand_id" ON "public"."claims_workflows" USING "btree" ("brand_id");



CREATE INDEX "idx_claims_workflows_created_by" ON "public"."claims_workflows" USING "btree" ("created_by");



CREATE INDEX "idx_content_body_search" ON "public"."content" USING "gin" ("to_tsvector"('"english"'::"regconfig", "body"));



CREATE INDEX "idx_content_brand_created" ON "public"."content" USING "btree" ("brand_id", "created_at" DESC);



COMMENT ON INDEX "public"."idx_content_brand_created" IS 'Improves content listing sorted by creation date';



CREATE INDEX "idx_content_brand_id" ON "public"."content" USING "btree" ("brand_id");



CREATE INDEX "idx_content_brand_status" ON "public"."content" USING "btree" ("brand_id", "status");



COMMENT ON INDEX "public"."idx_content_brand_status" IS 'Improves content filtering by brand and status';



CREATE INDEX "idx_content_created_at" ON "public"."content" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_content_created_by" ON "public"."content" USING "btree" ("created_by");



CREATE INDEX "idx_content_due_date" ON "public"."content" USING "btree" ("due_date");



CREATE INDEX "idx_content_ownership_content_id" ON "public"."content_ownership_history" USING "btree" ("content_id");



CREATE INDEX "idx_content_ownership_new_owner" ON "public"."content_ownership_history" USING "btree" ("new_owner");



CREATE INDEX "idx_content_ownership_previous_owner" ON "public"."content_ownership_history" USING "btree" ("previous_owner");



CREATE INDEX "idx_content_template_id" ON "public"."content" USING "btree" ("template_id");



CREATE INDEX "idx_content_templates_brand_id" ON "public"."content_templates" USING "btree" ("brand_id") WHERE ("brand_id" IS NOT NULL);



CREATE INDEX "idx_content_templates_name" ON "public"."content_templates" USING "btree" ("name");



CREATE INDEX "idx_content_title_search" ON "public"."content" USING "gin" ("to_tsvector"('"english"'::"regconfig", "title"));



CREATE INDEX "idx_content_updated_at" ON "public"."content" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_content_versions_content_created" ON "public"."content_versions" USING "btree" ("content_id", "created_at" DESC);



CREATE INDEX "idx_content_versions_content_id_version" ON "public"."content_versions" USING "btree" ("content_id", "version_number");



CREATE INDEX "idx_content_versions_step_id_created" ON "public"."content_versions" USING "btree" ("content_id", "workflow_step_identifier", "created_at");



CREATE INDEX "idx_content_workflow_id" ON "public"."content" USING "btree" ("workflow_id");



CREATE INDEX "idx_feedback_items_assigned_to" ON "public"."feedback_items" USING "btree" ("assigned_to");



CREATE INDEX "idx_feedback_items_created_at" ON "public"."feedback_items" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feedback_items_priority" ON "public"."feedback_items" USING "btree" ("priority");



CREATE INDEX "idx_feedback_items_status" ON "public"."feedback_items" USING "btree" ("status");



CREATE INDEX "idx_feedback_items_updated_by" ON "public"."feedback_items" USING "btree" ("updated_by");



CREATE INDEX "idx_global_override_audit_override_id" ON "public"."global_override_audit" USING "btree" ("override_id");



CREATE INDEX "idx_global_override_audit_user_id" ON "public"."global_override_audit" USING "btree" ("user_id");



CREATE INDEX "idx_invitation_logs_email" ON "public"."invitation_logs" USING "btree" ("email");



CREATE INDEX "idx_market_claim_overrides_global" ON "public"."market_claim_overrides" USING "btree" ("master_claim_id", "target_product_id", "market_country_code") WHERE ("market_country_code" = '__ALL_COUNTRIES__'::"text");



CREATE INDEX "idx_notification_outbox_pending" ON "public"."notification_outbox" USING "btree" ("scheduled_for", "priority" DESC) WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_notification_outbox_recipient" ON "public"."notification_outbox" USING "btree" ("recipient_id", "created_at" DESC);



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_archived" ON "public"."notifications" USING "btree" ("is_archived");



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_updated_at" ON "public"."notifications" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



COMMENT ON INDEX "public"."idx_notifications_user_unread" IS 'Improves unread notification queries';



CREATE INDEX "idx_products_master_brand_id" ON "public"."products" USING "btree" ("master_brand_id");



CREATE INDEX "idx_products_name" ON "public"."products" USING "btree" ("name");



CREATE INDEX "idx_profiles_notification_settings" ON "public"."profiles" USING "gin" ("notification_settings");



CREATE INDEX "idx_security_logs_event_type" ON "public"."security_logs" USING "btree" ("event_type");



CREATE INDEX "idx_security_logs_ip_address" ON "public"."security_logs" USING "btree" ("ip_address");



CREATE INDEX "idx_security_logs_timestamp" ON "public"."security_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_security_logs_user_id" ON "public"."security_logs" USING "btree" ("user_id");



CREATE INDEX "idx_tool_run_history_run_at" ON "public"."tool_run_history" USING "btree" ("run_at");



CREATE INDEX "idx_tool_run_history_tool_name" ON "public"."tool_run_history" USING "btree" ("tool_name");



CREATE INDEX "idx_tool_run_history_user_id" ON "public"."tool_run_history" USING "btree" ("user_id");



CREATE INDEX "idx_user_accounts_status" ON "public"."user_accounts" USING "btree" ("status") WHERE ("status" <> 'active'::"text");



CREATE INDEX "idx_user_brand_permissions_brand_id" ON "public"."user_brand_permissions" USING "btree" ("brand_id");



CREATE INDEX "idx_user_brand_permissions_created_at" ON "public"."user_brand_permissions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_brand_permissions_user_brand" ON "public"."user_brand_permissions" USING "btree" ("user_id", "brand_id");



COMMENT ON INDEX "public"."idx_user_brand_permissions_user_brand" IS 'Improves permission checks for user-brand combinations';



CREATE INDEX "idx_user_brand_permissions_user_id" ON "public"."user_brand_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_user_invitations_source" ON "public"."user_invitations" USING "btree" ("invitation_source", "source_id");



CREATE INDEX "idx_user_invitations_status" ON "public"."user_invitations" USING "btree" ("status");



CREATE INDEX "idx_user_status_history_user" ON "public"."user_status_history" USING "btree" ("user_id", "changed_at" DESC);



CREATE INDEX "idx_user_tasks_due_date" ON "public"."user_tasks" USING "btree" ("due_date") WHERE (("due_date" IS NOT NULL) AND ("status" = 'pending'::"text"));



CREATE INDEX "idx_user_tasks_user_id_status" ON "public"."user_tasks" USING "btree" ("user_id", "status");



CREATE INDEX "idx_user_tasks_user_status" ON "public"."user_tasks" USING "btree" ("user_id", "status") WHERE ("status" = 'pending'::"text");



COMMENT ON INDEX "public"."idx_user_tasks_user_status" IS 'Improves pending task queries for users';



CREATE INDEX "idx_workflow_invitations_email" ON "public"."workflow_invitations" USING "btree" ("email");



CREATE INDEX "idx_workflow_invitations_expires_at" ON "public"."workflow_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_workflow_invitations_status" ON "public"."workflow_invitations" USING "btree" ("status");



CREATE INDEX "idx_workflow_invitations_user_id" ON "public"."workflow_invitations" USING "btree" ("user_id");



CREATE INDEX "idx_workflow_step_assignments_step_id" ON "public"."workflow_step_assignments" USING "btree" ("step_id");



CREATE INDEX "idx_workflow_step_assignments_user_id" ON "public"."workflow_step_assignments" USING "btree" ("user_id");



CREATE INDEX "idx_workflow_steps_order" ON "public"."workflow_steps" USING "btree" ("step_order");



CREATE INDEX "idx_workflow_steps_workflow" ON "public"."workflow_steps" USING "btree" ("workflow_id", "step_order");



CREATE INDEX "idx_workflow_steps_workflow_id" ON "public"."workflow_steps" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflow_user_assignments_composite" ON "public"."workflow_user_assignments" USING "btree" ("workflow_id", "step_id", "user_id");



CREATE INDEX "idx_workflows_brand_id" ON "public"."workflows" USING "btree" ("brand_id");



CREATE INDEX "idx_workflows_brand_template" ON "public"."workflows" USING "btree" ("brand_id", "template_id");



COMMENT ON INDEX "public"."idx_workflows_brand_template" IS 'Improves workflow queries filtered by brand and template';



CREATE INDEX "idx_workflows_created_at" ON "public"."workflows" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_workflows_status" ON "public"."workflows" USING "btree" ("status");



CREATE INDEX "idx_workflows_template_id" ON "public"."workflows" USING "btree" ("template_id");



CREATE INDEX "idx_workflows_updated_at" ON "public"."workflows" USING "btree" ("updated_at" DESC);



CREATE UNIQUE INDEX "notif_dedupe" ON "public"."notification_outbox" USING "btree" ((("metadata" ->> 'content_id'::"text")), (("metadata" ->> 'step_id'::"text")), COALESCE(("recipient_id")::"text", "recipient_email")) WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text"]));



CREATE INDEX "tool_run_history_batch_id_idx" ON "public"."tool_run_history" USING "btree" ("batch_id");



CREATE INDEX "tool_run_history_batch_id_sequence_idx" ON "public"."tool_run_history" USING "btree" ("batch_id", "batch_sequence");



CREATE UNIQUE INDEX "waitlist_subscribers_email_key" ON "public"."waitlist_subscribers" USING "btree" ("lower"("email"));



CREATE OR REPLACE TRIGGER "handle_updated_at_global_claim_brands" BEFORE UPDATE ON "public"."master_claim_brands" FOR EACH ROW EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');



CREATE OR REPLACE TRIGGER "set_claims_updated_at" BEFORE UPDATE ON "public"."claims" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_ingredients_updated_at" BEFORE UPDATE ON "public"."ingredients" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_timestamp"();



CREATE OR REPLACE TRIGGER "trg_validate_market_claim_override_references" BEFORE INSERT OR UPDATE ON "public"."market_claim_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."validate_market_claim_override_references"();



CREATE OR REPLACE TRIGGER "trigger_create_tasks_on_new_content" AFTER INSERT ON "public"."content" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_content_workflow_assignment"();



CREATE OR REPLACE TRIGGER "trigger_feedback_item_updated_at" BEFORE UPDATE ON "public"."feedback_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_feedback_item_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_handle_new_assignment_task" AFTER INSERT ON "public"."workflow_user_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_workflow_assignment_task_creation"();



COMMENT ON TRIGGER "trigger_handle_new_assignment_task" ON "public"."workflow_user_assignments" IS 'After a user is assigned to a workflow step, creates relevant pending tasks.';



CREATE OR REPLACE TRIGGER "trigger_set_workflow_steps_updated_at" BEFORE UPDATE ON "public"."workflow_steps" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trigger_update_user_tasks_modtime" BEFORE UPDATE ON "public"."user_tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_tasks_modtime"();



CREATE OR REPLACE TRIGGER "update_brand_summary_trigger" BEFORE INSERT OR UPDATE ON "public"."brands" FOR EACH ROW EXECUTE FUNCTION "public"."update_brand_summary"();



CREATE OR REPLACE TRIGGER "update_notifications_updated_at" BEFORE UPDATE ON "public"."notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_invitations_modtime" BEFORE UPDATE ON "public"."user_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_user_system_roles_modtime" BEFORE UPDATE ON "public"."user_system_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "validate_market_country_code_trigger" BEFORE INSERT OR UPDATE ON "public"."market_claim_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."validate_market_country_code"();



ALTER TABLE ONLY "public"."analytics"
    ADD CONSTRAINT "analytics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_master_claim_brands"
    ADD CONSTRAINT "brand_master_claim_brands_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_master_claim_brands"
    ADD CONSTRAINT "brand_master_claim_brands_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brand_master_claim_brands"
    ADD CONSTRAINT "brand_master_claim_brands_master_claim_brand_id_fkey" FOREIGN KEY ("master_claim_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_selected_agencies"
    ADD CONSTRAINT "brand_selected_agencies_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."content_vetting_agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_selected_agencies"
    ADD CONSTRAINT "brand_selected_agencies_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_brand_admin_id_fkey" FOREIGN KEY ("brand_admin_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_master_claim_brand_id_fkey" FOREIGN KEY ("master_claim_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_countries"
    ADD CONSTRAINT "claim_countries_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_ingredients"
    ADD CONSTRAINT "claim_ingredients_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_ingredients"
    ADD CONSTRAINT "claim_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "claim_products_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "claim_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_reviews"
    ADD CONSTRAINT "claim_reviews_master_claim_brand_id_fkey" FOREIGN KEY ("master_claim_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_reviews"
    ADD CONSTRAINT "claim_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."claim_workflow_history"
    ADD CONSTRAINT "claim_workflow_history_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_workflow_history"
    ADD CONSTRAINT "claim_workflow_history_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_workflow_history"
    ADD CONSTRAINT "claim_workflow_history_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."claims_workflow_steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_current_workflow_step_fkey" FOREIGN KEY ("current_workflow_step") REFERENCES "public"."claims_workflow_steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_master_brand_id_fkey" FOREIGN KEY ("master_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."claims_workflows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims_workflow_steps"
    ADD CONSTRAINT "claims_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."claims_workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims_workflows"
    ADD CONSTRAINT "claims_workflows_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims_workflows"
    ADD CONSTRAINT "claims_workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_current_step_fkey" FOREIGN KEY ("current_step") REFERENCES "public"."workflow_steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_new_owner_fkey" FOREIGN KEY ("new_owner") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_previous_owner_fkey" FOREIGN KEY ("previous_owner") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."content_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_versions"
    ADD CONSTRAINT "content_versions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_versions"
    ADD CONSTRAINT "content_versions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."error_reports"
    ADD CONSTRAINT "error_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_countries"
    ADD CONSTRAINT "fk_claim_countries_claim_id" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_ingredients"
    ADD CONSTRAINT "fk_claim_ingredients_claim_id" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_ingredients"
    ADD CONSTRAINT "fk_claim_ingredients_ingredient_id" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "fk_claim_products_claim_id" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "fk_claim_products_product_id" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."global_override_audit"
    ADD CONSTRAINT "global_override_audit_override_id_fkey" FOREIGN KEY ("override_id") REFERENCES "public"."market_claim_overrides"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."global_override_audit"
    ADD CONSTRAINT "global_override_audit_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invitation_logs"
    ADD CONSTRAINT "invitation_logs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitation_logs"
    ADD CONSTRAINT "invitation_logs_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_master_claim_id_fkey" FOREIGN KEY ("master_claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_replacement_claim_id_fkey" FOREIGN KEY ("replacement_claim_id") REFERENCES "public"."claims"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_target_product_id_fkey" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "master_claim_brands_mixerai_brand_id_fkey" FOREIGN KEY ("mixerai_brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_outbox"
    ADD CONSTRAINT "notification_outbox_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_ingredients"
    ADD CONSTRAINT "product_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_ingredients"
    ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_master_brand_id_fkey" FOREIGN KEY ("master_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_run_history"
    ADD CONSTRAINT "tool_run_history_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_run_history"
    ADD CONSTRAINT "tool_run_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_accounts"
    ADD CONSTRAINT "user_accounts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_accounts"
    ADD CONSTRAINT "user_accounts_status_changed_by_fkey" FOREIGN KEY ("status_changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_status_history"
    ADD CONSTRAINT "user_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_status_history"
    ADD CONSTRAINT "user_status_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_step_assignments"
    ADD CONSTRAINT "workflow_step_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."workflow_steps"
    ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "workflow_user_assignments_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "workflow_user_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "workflow_user_assignments_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."content_templates"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can delete content" ON "public"."content" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Admins can delete their brands" ON "public"."brands" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "brands"."id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



COMMENT ON POLICY "Admins can delete their brands" ON "public"."brands" IS 'Users with admin role for a specific brand in user_brand_permissions can delete that brand. Note: "admin" in user_brand_permissions means brand admin, not global admin.';



CREATE POLICY "Admins can insert brands" ON "public"."brands" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage workflows" ON "public"."workflows" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "workflows"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "workflows"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Admins can update their brands" ON "public"."brands" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "brands"."id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "brands"."id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Admins can view all activity" ON "public"."user_activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins can view status history" ON "public"."user_status_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Admins can view user accounts" ON "public"."user_accounts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "auth"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text")))));



CREATE POLICY "Allow admins to delete feedback" ON "public"."feedback_items" FOR DELETE TO "authenticated" USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text") OR (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Allow admins to update feedback" ON "public"."feedback_items" FOR UPDATE TO "authenticated" USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text") OR (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text") OR (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Allow any authenticated user to update feedback items" ON "public"."feedback_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert feedback" ON "public"."feedback_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read all feedback" ON "public"."feedback_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read global_claim_brands" ON "public"."master_claim_brands" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated users to select claim_countries" ON "public"."claim_countries" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select claim_ingredients" ON "public"."claim_ingredients" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to select claim_products" ON "public"."claim_products" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow global admins full access on global_claim_brands" ON "public"."master_claim_brands" USING ("public"."is_global_admin"()) WITH CHECK ("public"."is_global_admin"());



CREATE POLICY "Assigned users can view their assignments" ON "public"."workflow_user_assignments" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Basic access policy" ON "public"."workflow_step_assignments" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Brand admins can manage brand invitations" ON "public"."user_invitations" TO "authenticated" USING ((("invitation_source" = 'brand'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "user_invitations"."source_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))))) WITH CHECK ((("invitation_source" = 'brand'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "user_invitations"."source_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum"))))));



CREATE POLICY "Brand admins can manage brand master claim brand links" ON "public"."brand_master_claim_brands" USING ((("auth"."uid"() IN ( SELECT "user_brand_permissions"."user_id"
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."brand_id" = "brand_master_claim_brands"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))) OR "public"."is_global_admin"())) WITH CHECK ((("auth"."uid"() IN ( SELECT "user_brand_permissions"."user_id"
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."brand_id" = "brand_master_claim_brands"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))) OR "public"."is_global_admin"()));



CREATE POLICY "Brand admins can manage workflow assignments" ON "public"."workflow_user_assignments" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workflows" "w"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "w"."brand_id")))
  WHERE (("w"."id" = "workflow_user_assignments"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workflows" "w"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "w"."brand_id")))
  WHERE (("w"."id" = "workflow_user_assignments"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Brand admins can manage workflow steps" ON "public"."workflow_steps" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workflows" "w"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "w"."brand_id")))
  WHERE (("w"."id" = "workflow_steps"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workflows" "w"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "w"."brand_id")))
  WHERE (("w"."id" = "workflow_steps"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Brand users can view workflow steps" ON "public"."workflow_steps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workflows" "w"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "w"."brand_id")))
  WHERE (("w"."id" = "workflow_steps"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Claims - Global Admins - Full Access" ON "public"."claims" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "Claims - Users can view based on master brand permissions" ON "public"."claims" FOR SELECT USING ((("level" = 'brand'::"public"."claim_level_enum") AND ("master_brand_id" IN ( SELECT "mcb"."id"
   FROM ("public"."master_claim_brands" "mcb"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "mcb"."mixerai_brand_id")))
  WHERE ("ubp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Content Versions - Brand users can view" ON "public"."content_versions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."content" "c"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "c"."brand_id")))
  WHERE (("c"."id" = "content_versions"."content_id") AND ("ubp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Content Versions - Editors can create" ON "public"."content_versions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."content" "c"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "c"."brand_id")))
  WHERE (("c"."id" = "content_versions"."content_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = ANY (ARRAY['admin'::"public"."user_brand_role_enum", 'editor'::"public"."user_brand_role_enum"]))))));



CREATE POLICY "Content ownership - Admins can create" ON "public"."content_ownership_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."content" "c"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "c"."brand_id")))
  WHERE (("c"."id" = "content_ownership_history"."content_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Content ownership - Brand users can view" ON "public"."content_ownership_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."content" "c"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "c"."brand_id")))
  WHERE (("c"."id" = "content_ownership_history"."content_id") AND ("ubp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Content templates - Allow all authenticated to read" ON "public"."content_templates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Content templates - Brand admins can manage" ON "public"."content_templates" TO "authenticated" USING (((("brand_id" IS NULL) AND ("auth"."uid"() = "created_by")) OR (("brand_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content_templates"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum"))))))) WITH CHECK (((("brand_id" IS NULL) AND ("auth"."uid"() = "created_by")) OR (("brand_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content_templates"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))))));



CREATE POLICY "Editors and Admins can insert content" ON "public"."content" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = ANY (ARRAY['admin'::"public"."user_brand_role_enum", 'editor'::"public"."user_brand_role_enum"]))))));



CREATE POLICY "Editors and Admins can update content" ON "public"."content" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = ANY (ARRAY['admin'::"public"."user_brand_role_enum", 'editor'::"public"."user_brand_role_enum"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = ANY (ARRAY['admin'::"public"."user_brand_role_enum", 'editor'::"public"."user_brand_role_enum"]))))));



CREATE POLICY "Editors and admins can create claim reviews" ON "public"."claim_reviews" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."master_claim_brands" "mcb"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "mcb"."mixerai_brand_id")))
  WHERE (("mcb"."id" = "claim_reviews"."master_claim_brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = ANY (ARRAY['admin'::"public"."user_brand_role_enum", 'editor'::"public"."user_brand_role_enum"]))))));



CREATE POLICY "Everyone can view analytics" ON "public"."analytics" FOR SELECT USING (true);



CREATE POLICY "Everyone can view brands" ON "public"."brands" FOR SELECT USING (true);



CREATE POLICY "Global admins can view all permissions" ON "public"."user_brand_permissions" FOR SELECT TO "authenticated" USING ("public"."is_global_admin"());



CREATE POLICY "Only brand admins can modify permissions" ON "public"."user_brand_permissions" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."brand_id" = "user_brand_permissions"."brand_id") AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."brand_id" = "user_brand_permissions"."brand_id") AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Only service role can manage" ON "public"."notification_outbox" USING (false) WITH CHECK (false);



CREATE POLICY "Profiles - Users can read all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Profiles - Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Security logs - Global admins can view all" ON "public"."security_logs" FOR SELECT TO "authenticated" USING ("public"."is_global_admin"());



CREATE POLICY "Security logs - Users can view own events" ON "public"."security_logs" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Tool runs - Users can create runs" ON "public"."tool_run_history" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Tool runs - Users can view own runs" ON "public"."tool_run_history" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can create tasks" ON "public"."user_tasks" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own tasks" ON "public"."user_tasks" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view claim reviews for their brands" ON "public"."claim_reviews" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."master_claim_brands" "mcb"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "mcb"."mixerai_brand_id")))
  WHERE (("mcb"."id" = "claim_reviews"."master_claim_brand_id") AND ("ubp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view content from their brands" ON "public"."content" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id")))));



CREATE POLICY "Users can view invitations sent to their email" ON "public"."workflow_invitations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."email" = "workflow_invitations"."email")))));



CREATE POLICY "Users can view own activity" ON "public"."user_activity_log" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own brand permissions" ON "public"."user_brand_permissions" FOR SELECT USING ((("auth"."role"() = 'service_role'::"text") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view their own invitations" ON "public"."user_invitations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."email" = "user_invitations"."email")))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own permissions" ON "public"."user_brand_permissions" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own tasks" ON "public"."user_tasks" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view workflows from their brands" ON "public"."workflows" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "workflows"."brand_id")))));



CREATE POLICY "Workflow creators can manage invitations" ON "public"."workflow_invitations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workflows"
  WHERE (("workflows"."id" = "workflow_invitations"."workflow_id") AND ("workflows"."created_by" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workflows"
  WHERE (("workflows"."id" = "workflow_invitations"."workflow_id") AND ("workflows"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."error_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_outbox" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service-role-only" ON "public"."error_reports" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."user_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waitlist_subscribers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_step_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflows" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




















































































































































































GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid", "p_comment" "text", "p_updated_claim_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid", "p_comment" "text", "p_updated_claim_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid", "p_comment" "text", "p_updated_claim_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_deactivate_user"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_deactivate_user"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_deactivate_user"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."notification_outbox" TO "anon";
GRANT ALL ON TABLE "public"."notification_outbox" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_outbox" TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_notifications"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_notifications"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."claim_notifications"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_notifications"("p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_activity_logs"("p_retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_activity_logs"("p_retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_activity_logs"("p_retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_brand_with_permissions"("p_creator_user_id" "uuid", "p_brand_name" "text", "p_website_url" "text", "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_logo_url" "text", "p_approved_content_types" "jsonb", "p_master_claim_brand_id" "uuid", "p_agency_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_brand_with_permissions"("p_creator_user_id" "uuid", "p_brand_name" "text", "p_website_url" "text", "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_logo_url" "text", "p_approved_content_types" "jsonb", "p_master_claim_brand_id" "uuid", "p_agency_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_brand_with_permissions"("p_creator_user_id" "uuid", "p_brand_name" "text", "p_website_url" "text", "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_logo_url" "text", "p_approved_content_types" "jsonb", "p_master_claim_brand_id" "uuid", "p_agency_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "text", "p_level" "text", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "text", "p_level" "text", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "text", "p_level" "text", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "public"."claim_type_enum", "p_level" "public"."claim_level_enum", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "public"."claim_type_enum", "p_level" "public"."claim_level_enum", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_claim_with_associations"("p_claim_text" "text", "p_claim_type" "public"."claim_type_enum", "p_level" "public"."claim_level_enum", "p_master_brand_id" "uuid", "p_ingredient_id" "uuid", "p_ingredient_ids" "uuid"[], "p_product_ids" "uuid"[], "p_country_codes" "text"[], "p_description" "text", "p_created_by" "uuid", "p_workflow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_claims_batch"("p_claims" "jsonb", "p_workflow_id" "uuid", "p_created_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_claims_batch"("p_claims" "jsonb", "p_workflow_id" "uuid", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_claims_batch"("p_claims" "jsonb", "p_workflow_id" "uuid", "p_created_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_brand_id" "uuid", "p_workflow_name" "text", "p_workflow_description" "text", "p_created_by" "uuid", "p_workflow_steps" "jsonb", "p_template_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_brand_id" "uuid", "p_workflow_name" "text", "p_workflow_description" "text", "p_created_by" "uuid", "p_workflow_steps" "jsonb", "p_template_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_brand_id" "uuid", "p_workflow_name" "text", "p_workflow_description" "text", "p_created_by" "uuid", "p_workflow_steps" "jsonb", "p_template_id" "uuid", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."deactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_brand_cascade"("p_brand_id" "uuid", "p_deleting_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_brand_cascade"("p_brand_id" "uuid", "p_deleting_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_brand_cascade"("p_brand_id" "uuid", "p_deleting_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_notification"("p_type" "text", "p_subject" "text", "p_template_name" "text", "p_template_data" "jsonb", "p_recipient_id" "uuid", "p_recipient_email" "text", "p_priority" integer, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_notification"("p_type" "text", "p_subject" "text", "p_template_name" "text", "p_template_data" "jsonb", "p_recipient_id" "uuid", "p_recipient_email" "text", "p_priority" integer, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_notification"("p_type" "text", "p_subject" "text", "p_template_name" "text", "p_template_data" "jsonb", "p_recipient_id" "uuid", "p_recipient_email" "text", "p_priority" integer, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_workflow_notification"("p_content_id" "uuid", "p_workflow_id" "uuid", "p_step_id" "uuid", "p_recipient_id" "uuid", "p_action" "text", "p_content_title" "text", "p_brand_name" "text", "p_step_name" "text", "p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_workflow_notification"("p_content_id" "uuid", "p_workflow_id" "uuid", "p_step_id" "uuid", "p_recipient_id" "uuid", "p_action" "text", "p_content_title" "text", "p_brand_name" "text", "p_step_name" "text", "p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_workflow_notification"("p_content_id" "uuid", "p_workflow_id" "uuid", "p_step_id" "uuid", "p_recipient_id" "uuid", "p_action" "text", "p_content_title" "text", "p_brand_name" "text", "p_step_name" "text", "p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_claim_ingredients"("claim_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_claim_ingredients"("claim_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_claim_ingredients"("claim_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity"("p_user_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_activity_summary"("p_user_id" "uuid", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_content_workflow_assignment"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_content_workflow_assignment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_content_workflow_assignment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_workflow_assignment_task_creation"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_workflow_assignment_task_creation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_workflow_assignment_task_creation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_brand_permission"("user_id" "uuid", "target_brand_id" "uuid", "allowed_roles" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."has_brand_permission"("user_id" "uuid", "target_brand_id" "uuid", "allowed_roles" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_brand_permission"("user_id" "uuid", "target_brand_id" "uuid", "allowed_roles" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_global_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_global_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_global_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_active"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_active"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_active"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action_type" "text", "p_action_category" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_resource_name" "text", "p_brand_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" "text", "p_duration_ms" integer, "p_metadata" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action_type" "text", "p_action_category" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_resource_name" "text", "p_brand_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" "text", "p_duration_ms" integer, "p_metadata" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_user_activity"("p_user_id" "uuid", "p_action_type" "text", "p_action_category" "text", "p_resource_type" "text", "p_resource_id" "uuid", "p_resource_name" "text", "p_brand_id" "uuid", "p_ip_address" "inet", "p_user_agent" "text", "p_session_id" "text", "p_duration_ms" integer, "p_metadata" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_website_domain"("url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_website_domain"("url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_website_domain"("url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reactivate_user"("p_user_id" "uuid", "p_reason" "text", "p_changed_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feedback_item_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_feedback_item_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feedback_item_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_tasks_modtime"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_tasks_modtime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_tasks_modtime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workflow_published_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_workflow_published_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_workflow_published_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_market_claim_override_references"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_market_claim_override_references"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_market_claim_override_references"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_market_country_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_market_country_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_market_country_code"() TO "service_role";


















GRANT ALL ON TABLE "public"."analytics" TO "anon";
GRANT ALL ON TABLE "public"."analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics" TO "service_role";



GRANT ALL ON TABLE "public"."brand_master_claim_brands" TO "anon";
GRANT ALL ON TABLE "public"."brand_master_claim_brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_master_claim_brands" TO "service_role";



GRANT ALL ON TABLE "public"."brand_selected_agencies" TO "anon";
GRANT ALL ON TABLE "public"."brand_selected_agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_selected_agencies" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."claim_countries" TO "anon";
GRANT ALL ON TABLE "public"."claim_countries" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_countries" TO "service_role";



GRANT ALL ON TABLE "public"."claim_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."claim_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."claim_products" TO "anon";
GRANT ALL ON TABLE "public"."claim_products" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_products" TO "service_role";



GRANT ALL ON TABLE "public"."claim_reviews" TO "anon";
GRANT ALL ON TABLE "public"."claim_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."claim_workflow_history" TO "anon";
GRANT ALL ON TABLE "public"."claim_workflow_history" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_workflow_history" TO "service_role";



GRANT ALL ON TABLE "public"."claims" TO "anon";
GRANT ALL ON TABLE "public"."claims" TO "authenticated";
GRANT ALL ON TABLE "public"."claims" TO "service_role";



GRANT ALL ON TABLE "public"."claims_workflow_steps" TO "anon";
GRANT ALL ON TABLE "public"."claims_workflow_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."claims_workflow_steps" TO "service_role";



GRANT ALL ON TABLE "public"."claims_workflows" TO "anon";
GRANT ALL ON TABLE "public"."claims_workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."claims_workflows" TO "service_role";



GRANT ALL ON TABLE "public"."ingredients" TO "anon";
GRANT ALL ON TABLE "public"."ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."master_claim_brands" TO "anon";
GRANT ALL ON TABLE "public"."master_claim_brands" TO "authenticated";
GRANT ALL ON TABLE "public"."master_claim_brands" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."claims_pending_approval" TO "anon";
GRANT ALL ON TABLE "public"."claims_pending_approval" TO "authenticated";
GRANT ALL ON TABLE "public"."claims_pending_approval" TO "service_role";



GRANT ALL ON TABLE "public"."claims_with_arrays" TO "anon";
GRANT ALL ON TABLE "public"."claims_with_arrays" TO "authenticated";
GRANT ALL ON TABLE "public"."claims_with_arrays" TO "service_role";



GRANT ALL ON TABLE "public"."content" TO "anon";
GRANT ALL ON TABLE "public"."content" TO "authenticated";
GRANT ALL ON TABLE "public"."content" TO "service_role";



GRANT ALL ON TABLE "public"."content_ownership_history" TO "anon";
GRANT ALL ON TABLE "public"."content_ownership_history" TO "authenticated";
GRANT ALL ON TABLE "public"."content_ownership_history" TO "service_role";



GRANT ALL ON TABLE "public"."content_templates" TO "anon";
GRANT ALL ON TABLE "public"."content_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."content_templates" TO "service_role";



GRANT ALL ON TABLE "public"."content_types" TO "anon";
GRANT ALL ON TABLE "public"."content_types" TO "authenticated";
GRANT ALL ON TABLE "public"."content_types" TO "service_role";



GRANT ALL ON TABLE "public"."content_versions" TO "anon";
GRANT ALL ON TABLE "public"."content_versions" TO "authenticated";
GRANT ALL ON TABLE "public"."content_versions" TO "service_role";



GRANT ALL ON TABLE "public"."content_vetting_agencies" TO "anon";
GRANT ALL ON TABLE "public"."content_vetting_agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."content_vetting_agencies" TO "service_role";



GRANT ALL ON TABLE "public"."countries" TO "anon";
GRANT ALL ON TABLE "public"."countries" TO "authenticated";
GRANT ALL ON TABLE "public"."countries" TO "service_role";



GRANT ALL ON TABLE "public"."error_reports" TO "anon";
GRANT ALL ON TABLE "public"."error_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."error_reports" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_items" TO "anon";
GRANT ALL ON TABLE "public"."feedback_items" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_items" TO "service_role";



GRANT ALL ON TABLE "public"."global_override_audit" TO "anon";
GRANT ALL ON TABLE "public"."global_override_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."global_override_audit" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_logs" TO "anon";
GRANT ALL ON TABLE "public"."invitation_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_logs" TO "service_role";



GRANT ALL ON TABLE "public"."market_claim_overrides" TO "anon";
GRANT ALL ON TABLE "public"."market_claim_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."market_claim_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."product_ingredients" TO "anon";
GRANT ALL ON TABLE "public"."product_ingredients" TO "authenticated";
GRANT ALL ON TABLE "public"."product_ingredients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles_view" TO "anon";
GRANT ALL ON TABLE "public"."profiles_view" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles_view" TO "service_role";



GRANT ALL ON TABLE "public"."security_logs" TO "anon";
GRANT ALL ON TABLE "public"."security_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."security_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tool_run_history" TO "anon";
GRANT ALL ON TABLE "public"."tool_run_history" TO "authenticated";
GRANT ALL ON TABLE "public"."tool_run_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_accounts" TO "anon";
GRANT ALL ON TABLE "public"."user_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."user_brand_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_brand_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_brand_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_invitations" TO "anon";
GRANT ALL ON TABLE "public"."workflow_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitation_status" TO "anon";
GRANT ALL ON TABLE "public"."user_invitation_status" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitation_status" TO "service_role";



GRANT ALL ON TABLE "public"."user_invitations" TO "anon";
GRANT ALL ON TABLE "public"."user_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."user_status_history" TO "anon";
GRANT ALL ON TABLE "public"."user_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."user_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_system_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_system_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_system_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_tasks" TO "anon";
GRANT ALL ON TABLE "public"."user_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."waitlist_subscribers" TO "anon";
GRANT ALL ON TABLE "public"."waitlist_subscribers" TO "authenticated";
GRANT ALL ON TABLE "public"."waitlist_subscribers" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_step_assignments" TO "anon";
GRANT ALL ON TABLE "public"."workflow_step_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_step_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_steps" TO "anon";
GRANT ALL ON TABLE "public"."workflow_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_steps" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_user_assignments" TO "anon";
GRANT ALL ON TABLE "public"."workflow_user_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_user_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."workflows" TO "anon";
GRANT ALL ON TABLE "public"."workflows" TO "authenticated";
GRANT ALL ON TABLE "public"."workflows" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;

--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



CREATE OR REPLACE TRIGGER "on_auth_user_created_create_user_account" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_account"();



SET SESSION AUTHORIZATION "postgres";
GRANT SELECT ON TABLE "auth"."users" TO "authenticated";
RESET SESSION AUTHORIZATION;

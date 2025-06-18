

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



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
    'disallowed',
    'mandatory',
    'conditional'
);


ALTER TYPE "public"."claim_type_enum" OWNER TO "postgres";


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


CREATE TYPE "public"."vetting_agency_priority_level" AS ENUM (
    'High',
    'Medium',
    'Low'
);


ALTER TYPE "public"."vetting_agency_priority_level" OWNER TO "postgres";


CREATE TYPE "public"."workflow_status" AS ENUM (
    'active',
    'draft',
    'archived'
);


ALTER TYPE "public"."workflow_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_current_step UUID;
    v_workflow_id UUID;
    v_next_step UUID;
    v_result JSONB;
BEGIN
    -- Get current workflow info
    SELECT current_workflow_step, workflow_id 
    INTO v_current_step, v_workflow_id
    FROM public.claims
    WHERE id = p_claim_id;

    -- Log the action in history
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
        v_current_step,
        ws.name,
        CASE 
            WHEN p_action = 'approve' THEN 'approved'
            WHEN p_action = 'reject' THEN 'rejected'
            ELSE 'pending_review'
        END,
        p_feedback,
        p_reviewer_id
    FROM public.claims_workflow_steps ws
    WHERE ws.id = v_current_step;

    -- Handle approval
    IF p_action = 'approve' THEN
        -- Find next step
        SELECT ws2.id INTO v_next_step
        FROM public.claims_workflow_steps ws1
        JOIN public.claims_workflow_steps ws2 ON ws1.workflow_id = ws2.workflow_id 
            AND ws2.step_order = ws1.step_order + 1
        WHERE ws1.id = v_current_step;

        IF v_next_step IS NOT NULL THEN
            -- Move to next step
            UPDATE public.claims
            SET current_workflow_step = v_next_step,
                workflow_status = 'pending_review',
                updated_at = NOW()
            WHERE id = p_claim_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'message', 'Claim approved and moved to next step',
                'next_step_id', v_next_step
            );
        ELSE
            -- No more steps - mark as approved
            UPDATE public.claims
            SET workflow_status = 'approved',
                updated_at = NOW()
            WHERE id = p_claim_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'message', 'Claim fully approved',
                'status', 'approved'
            );
        END IF;
    
    -- Handle rejection
    ELSIF p_action = 'reject' THEN
        UPDATE public.claims
        SET workflow_status = 'rejected',
            updated_at = NOW()
        WHERE id = p_claim_id;
        
        v_result := jsonb_build_object(
            'success', true,
            'message', 'Claim rejected',
            'status', 'rejected'
        );
    
    ELSE
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Invalid action. Must be approve or reject'
        );
    END IF;

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid") OWNER TO "postgres";


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
          workflow_status = 'completed',
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
    content_vetting_agencies, -- This column is TEXT[]
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
    brand_content_vetting_agencies_input, -- Now correctly passing TEXT[]
    brand_color_input,
    approved_content_types_input
  )
  RETURNING id INTO new_brand_id;

  INSERT INTO public.user_brand_permissions (user_id, brand_id, role)
  VALUES (creator_user_id, new_brand_id, 'brand_admin'::public.user_brand_role_enum);

  RETURN new_brand_id;
END;
$$;


ALTER FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_profile_for_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
        BEGIN
          INSERT INTO public.profiles (id, full_name, avatar_url, email, job_title, job_description, company)
          VALUES (
            NEW.id, 
            COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
            COALESCE(NEW.raw_user_meta_data->>'job_description', ''),
            COALESCE(NEW.raw_user_meta_data->>'company', '')
          );
          RETURN NEW;
        END;
        $$;


ALTER FUNCTION "public"."create_profile_for_user"() OWNER TO "postgres";


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



CREATE OR REPLACE FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Update content items associated with this template
  UPDATE public.content
  SET template_id = NULL,
      status = 'rejected', -- Ensures content reflects template removal
      updated_at = NOW()
  WHERE template_id = template_id_to_delete;

  -- Delete the content template itself
  DELETE FROM public.content_templates
  WHERE id = template_id_to_delete;

  -- Check if the template was actually deleted. 
  -- If NOT FOUND, it means the template_id_to_delete didn't exist or RLS prevented deletion.
  IF NOT FOUND THEN
    RAISE WARNING 'Content template with ID % not found or not deleted during delete_template_and_update_content.', template_id_to_delete;
    -- Depending on requirements, you might want to RAISE EXCEPTION here if the template must exist.
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in delete_template_and_update_content for template %: % - %', template_id_to_delete, SQLSTATE, SQLERRM;
    RAISE; -- Re-raise the exception to ensure transaction rollback
END;
$$;


ALTER FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") IS 'Atomically deletes a content template and updates associated content items (sets template_id to NULL and status to rejected).';



CREATE OR REPLACE FUNCTION "public"."delete_user_and_reassign_tasks"("p_user_id_to_delete" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."delete_user_and_reassign_tasks"("p_user_id_to_delete" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid") RETURNS TABLE("claim_text" "text", "claim_type" "text", "level" "text", "country_code" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Brand-level claims
    RETURN QUERY
    SELECT
        c.claim_text,
        c.claim_type::TEXT,
        'brand'::TEXT AS level,
        c.country_code
    FROM claims c
    WHERE c.master_brand_id = master_brand_id_param;

    -- Product-level claims
    RETURN QUERY
    SELECT
        c.claim_text,
        c.claim_type::TEXT,
        'product'::TEXT AS level,
        c.country_code
    FROM claims c
    JOIN products p ON c.product_id = p.id
    WHERE p.master_brand_id = master_brand_id_param;

    -- Ingredient-level claims
    RETURN QUERY
    SELECT DISTINCT
        c.claim_text,
        c.claim_type::TEXT,
        'ingredient'::TEXT AS level,
        c.country_code
    FROM claims c
    JOIN product_ingredients pi ON c.ingredient_id = pi.ingredient_id
    JOIN products p ON pi.product_id = p.id
    WHERE p.master_brand_id = master_brand_id_param;

END;
$$;


ALTER FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid", "product_id_param" "uuid" DEFAULT NULL::"uuid", "country_code_param" "text" DEFAULT NULL::"text") RETURNS TABLE("claim_text" "text", "claim_type" "text", "level" "text", "country_code" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    -- Brand-level claims
    SELECT
        c.claim_text, c.claim_type::TEXT, 'brand'::TEXT, c.country_code
    FROM claims AS c
    WHERE c.level = 'brand'
      AND c.master_brand_id = master_brand_id_param
      AND (country_code_param IS NULL OR c.country_code = country_code_param OR c.country_code IN ('__ALL_COUNTRIES__', '__GLOBAL__'))

    UNION ALL

    -- Product-level claims
    SELECT
        c.claim_text, c.claim_type::TEXT, 'product'::TEXT, c.country_code
    FROM claims AS c
    JOIN products AS p ON c.product_id = p.id
    WHERE c.level = 'product'
      AND p.master_brand_id = master_brand_id_param
      AND (product_id_param IS NULL OR p.id = product_id_param)
      AND (country_code_param IS NULL OR c.country_code = country_code_param OR c.country_code IN ('__ALL_COUNTRIES__', '__GLOBAL__'))
      
    UNION ALL

    -- Ingredient-level claims
    SELECT DISTINCT
        c.claim_text, c.claim_type::TEXT, 'ingredient'::TEXT, c.country_code
    FROM claims AS c
    JOIN product_ingredients AS pi ON c.ingredient_id = pi.ingredient_id
    JOIN products AS p ON pi.product_id = p.id
    WHERE c.level = 'ingredient'
      AND p.master_brand_id = master_brand_id_param
      AND (product_id_param IS NULL OR p.id = product_id_param)
      AND (country_code_param IS NULL OR c.country_code = country_code_param OR c.country_code IN ('__ALL_COUNTRIES__', '__GLOBAL__'));
END;
$$;


ALTER FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid", "product_id_param" "uuid", "country_code_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_brand_details_by_id"("p_brand_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
declare
    brand_details jsonb;
begin
    select
        jsonb_build_object(
            'id', b.id,
            'name', b.name,
            'website_url', b.website_url,
            'country', b.country,
            'language', b.language,
            'brand_identity', b.brand_identity,
            'tone_of_voice', b.tone_of_voice,
            'brand_summary', b.brand_summary,
            'brand_color', b.brand_color,
            'logo_url', b.logo_url,  -- Added logo_url
            'created_at', b.created_at,
            'updated_at', b.updated_at,
            'master_claim_brand_name', mcb.name,
            'contentCount', (select count(*) from public.content where brand_id = b.id),
            'workflowCount', (select count(*) from public.workflows where brand_id = b.id),
            'admins', (
                select coalesce(jsonb_agg(jsonb_build_object(
                    'id', p.id,
                    'full_name', p.full_name,
                    'email', p.email,
                    'avatar_url', p.avatar_url,
                    'job_title', p.job_title
                )), '[]'::jsonb)
                from public.user_brand_permissions ubp
                join public.profiles p on p.id = ubp.user_id
                where ubp.brand_id = b.id and ubp.role = 'admin'
            )
        ) into brand_details
    from
        public.brands b
        left join public.brands mcb on b.master_claim_brand_id = mcb.id
    where
        b.id = p_brand_id;

    return brand_details;
end;
$$;


ALTER FUNCTION "public"."get_brand_details_by_id"("p_brand_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") RETURNS "text"[]
    LANGUAGE "sql" STABLE
    AS $$
  SELECT ARRAY_AGG(url_obj->>'url')
  FROM brands,
  LATERAL jsonb_array_elements(COALESCE(website_urls, '[]'::jsonb)) AS url_obj
  WHERE brands.id = brand_uuid;
$$;


ALTER FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") RETURNS "text"[]
    LANGUAGE "sql" STABLE
    AS $$
  SELECT ARRAY_AGG(country_code) 
  FROM claim_countries 
  WHERE claim_id = claim_uuid;
$$;


ALTER FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") RETURNS "uuid"[]
    LANGUAGE "sql" STABLE
    AS $$
  SELECT ARRAY_AGG(product_id) 
  FROM claim_products 
  WHERE claim_id = claim_uuid;
$$;


ALTER FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
DECLARE
    metadata_text TEXT;
    user_role_from_metadata TEXT;
BEGIN
    -- Attempt to get user_metadata from the JWT.
    -- This expression itself (auth.jwt() ->> 'user_metadata') should not error out even if claims are missing.
    metadata_text := auth.jwt() ->> 'user_metadata';

    -- If user_metadata claim is not present or is SQL NULL
    IF metadata_text IS NULL THEN
        RETURN NULL; 
    END IF;

    -- Safely attempt to parse metadata_text as JSONB and extract the role
    BEGIN
        IF jsonb_typeof(metadata_text::jsonb) = 'object' THEN
            user_role_from_metadata := metadata_text::jsonb ->> 'role';
            RETURN user_role_from_metadata; -- This will be NULL if 'role' key doesn't exist
        ELSE
            -- It was valid JSON, but not a JSON object (e.g., a JSON array or scalar)
            RETURN NULL;
        END IF;
    EXCEPTION
        WHEN invalid_text_representation THEN 
            -- This catches errors if metadata_text is not valid JSON and casting to jsonb fails.
            RETURN NULL;
        WHEN others THEN
            -- For any other unexpected errors during JSON processing.
            -- You could log this error for debugging if necessary:
            -- RAISE WARNING 'Unexpected error processing user_metadata for auth.uid(): % - % ', auth.uid(), SQLERRM;
            RETURN NULL;
    END;
END;
$$;


ALTER FUNCTION "public"."get_current_user_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_current_user_role"() IS 'Safely retrieves the role from the user_metadata claim in the auth.jwt() token. 
Returns the role as text if found, or NULL if metadata is missing, not valid JSON, not an object, or the role key is not present.';



CREATE OR REPLACE FUNCTION "public"."get_template_input_fields"("template_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(fields->'inputFields', '[]'::jsonb)
  FROM content_templates
  WHERE id = template_uuid;
$$;


ALTER FUNCTION "public"."get_template_input_fields"("template_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_template_output_fields"("template_uuid" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    AS $$
  SELECT COALESCE(fields->'outputFields', '[]'::jsonb)
  FROM content_templates
  WHERE id = template_uuid;
$$;


ALTER FUNCTION "public"."get_template_output_fields"("template_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_by_email"("user_email" "text") RETURNS SETOF "auth"."users"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY SELECT au.* FROM auth.users au WHERE lower(au.email) = lower(user_email) LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_by_email"("user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_by_email"("user_email" "text") IS 'Retrieves a user directly from auth.users by email, case-insensitive. To be called by service_role. Returns SETOF auth.users to match table structure.';



CREATE OR REPLACE FUNCTION "public"."get_user_details"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
declare
    user_details jsonb;
begin
    select
        jsonb_build_object(
            'id', u.id,
            'email', u.email,
            'full_name', p.full_name,
            'job_title', p.job_title,
            'company', p.company,
            'avatar_url', p.avatar_url,
            'globalRole', u.raw_user_meta_data->>'role', -- Corrected alias
            'created_at', u.created_at,
            'last_sign_in_at', u.last_sign_in_at,
            'brand_permissions', (
                select coalesce(jsonb_agg(jsonb_build_object(
                    'id', ubp.id,
                    'brand_id', ubp.brand_id,
                    'role', ubp.role,
                    'brand', jsonb_build_object('id', b.id, 'name', b.name)
                )), '[]'::jsonb)
                from public.user_brand_permissions ubp
                join public.brands b on ubp.brand_id = b.id
                where ubp.user_id = p_user_id
            )
        )
    into user_details
    from
        auth.users u
    join
        public.profiles p on u.id = p.id
    where
        u.id = p_user_id;

    return user_details;
end;
$$;


ALTER FUNCTION "public"."get_user_details"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_content_workflow_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
        step_assignees UUID[];
        step_name_var TEXT;
        assignee_user_id UUID;
    BEGIN
        IF NEW.workflow_id IS NOT NULL AND NEW.current_step IS NOT NULL THEN -- NEW.current_step is UUID
            SELECT ws.assigned_user_ids, ws.name
            INTO step_assignees, step_name_var
            FROM public.workflow_steps ws
            WHERE ws.id = NEW.current_step;

            IF step_name_var IS NOT NULL AND step_assignees IS NOT NULL AND array_length(step_assignees, 1) > 0 THEN
                FOREACH assignee_user_id IN ARRAY step_assignees
                LOOP
                    IF assignee_user_id IS NOT NULL THEN
                        INSERT INTO public.user_tasks (
                            user_id, content_id, workflow_id, workflow_step_id, workflow_step_name, status
                        ) VALUES (
                            assignee_user_id, NEW.id, NEW.workflow_id, NEW.current_step, step_name_var, 'pending'
                        )
                        ON CONFLICT (user_id, content_id, workflow_step_id) DO NOTHING;
                    END IF;
                END LOOP;
            END IF;
        END IF;
        RETURN NEW;
    END;
    $$;


ALTER FUNCTION "public"."handle_new_content_workflow_assignment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_content_workflow_assignment"() IS 'Trigger function to create tasks in user_tasks when new content is assigned to a workflow.';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Automatically creates a profile record when a new user signs up';



CREATE OR REPLACE FUNCTION "public"."handle_new_workflow_assignment_task_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
    DECLARE
        content_record RECORD;
        step_name_var TEXT;
    BEGIN
        SELECT ws.name INTO step_name_var
        FROM public.workflow_steps ws
        WHERE ws.id = NEW.step_id; -- NEW.step_id is now UUID

        IF step_name_var IS NULL THEN
            RAISE WARNING '[TaskTriggerWUA] Workflow step definition not found for step_id: %', NEW.step_id;
            RETURN NEW;
        END IF;

        FOR content_record IN
            SELECT c.id, c.title
            FROM public.content c
            WHERE c.workflow_id = NEW.workflow_id
              AND c.current_step = NEW.step_id -- UUID = UUID
              AND c.status = 'pending_review'
        LOOP
            INSERT INTO public.user_tasks (
                user_id, content_id, workflow_id, workflow_step_id, workflow_step_name, status
            ) VALUES (
                NEW.user_id, content_record.id, NEW.workflow_id, NEW.step_id, step_name_var, 'pending'
            )
            ON CONFLICT (user_id, content_id, workflow_step_id) DO NOTHING;
        END LOOP;
        RETURN NEW;
    END;
    $$;


ALTER FUNCTION "public"."handle_new_workflow_assignment_task_creation"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_workflow_assignment_task_creation"() IS 'Creates tasks in user_tasks when a user is assigned to a workflow step, for any content currently at that step and requiring action.';



CREATE OR REPLACE FUNCTION "public"."has_brand_permission"("user_id" "uuid", "target_brand_id" "uuid", "allowed_roles" "text"[]) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_brand_permissions
    WHERE user_brand_permissions.user_id = user_id
      AND user_brand_permissions.brand_id = target_brand_id
      AND user_brand_permissions.role::TEXT = ANY(allowed_roles)
  );
$$;


ALTER FUNCTION "public"."has_brand_permission"("user_id" "uuid", "target_brand_id" "uuid", "allowed_roles" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."integer_to_uuid"(integer) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result uuid;
BEGIN
    -- Example logic to convert integer to UUID
    -- This is a placeholder and should be replaced with actual logic
    result := uuid_generate_v4(); -- Generates a new UUID
    RETURN result;
END;
$$;


ALTER FUNCTION "public"."integer_to_uuid"(integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_global_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT auth.jwt()->>'user_metadata'->>'role' = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_global_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_global_admin"("user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = user_id) = 'admin';
$$;


ALTER FUNCTION "public"."is_global_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb" DEFAULT '{}'::"jsonb", "p_user_id" "uuid" DEFAULT NULL::"uuid", "p_ip_address" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.security_logs (event_type, user_id, ip_address, details)
    VALUES (p_event_type, COALESCE(p_user_id, auth.uid()), p_ip_address, p_details)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."moddatetime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."moddatetime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_website_domain"("url" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $_$
DECLARE
    normalized_url text;
BEGIN
    -- Return NULL if input is NULL or empty
    IF url IS NULL OR url = '' THEN
        RETURN NULL;
    END IF;
    
    -- Convert to lowercase
    normalized_url := LOWER(TRIM(url));
    
    -- Remove common protocols
    normalized_url := REGEXP_REPLACE(normalized_url, '^https?://', '');
    normalized_url := REGEXP_REPLACE(normalized_url, '^ftp://', '');
    
    -- Remove www prefix
    normalized_url := REGEXP_REPLACE(normalized_url, '^www\.', '');
    
    -- Remove trailing slashes and paths
    normalized_url := REGEXP_REPLACE(normalized_url, '/.*$', '');
    
    -- Remove port numbers
    normalized_url := REGEXP_REPLACE(normalized_url, ':[0-9]+$', '');
    
    RETURN normalized_url;
END;
$_$;


ALTER FUNCTION "public"."normalize_website_domain"("url" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."normalize_website_domain"("url" "text") IS 'Normalizes website URLs to their domain form for consistent comparison';



CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_role_for_all_assigned_brands"("target_user_id" "uuid", "new_role" "public"."user_role") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_user_role_for_all_assigned_brands"("target_user_id" "uuid", "new_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."test_plpgsql_declare"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
        DECLARE
            my_message text;
        BEGIN
            my_message := 'PL/pgSQL with DECLARE is working!';
            RAISE NOTICE '%', my_message;
        END;
        $$;


ALTER FUNCTION "public"."test_plpgsql_declare"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brand_summary"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If brand_summary is NULL or empty and brand_identity exists
  IF (NEW.brand_summary IS NULL OR NEW.brand_summary = '') AND 
     (NEW.brand_identity IS NOT NULL AND NEW.brand_identity <> '') THEN
    
    -- Generate a summary from brand_identity - just use first paragraph 
    -- for simple implementation
    NEW.brand_summary := substring(NEW.brand_identity from 1 for 250);
    
    -- Add ellipsis if we truncated the text
    IF length(NEW.brand_identity) > 250 THEN
      NEW.brand_summary := NEW.brand_summary || '...';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_brand_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid") RETURNS "json"
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


ALTER FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid", "p_logo_url" "text" DEFAULT NULL::"text") RETURNS "json"
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


ALTER FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid", "p_logo_url" "text") OWNER TO "postgres";


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
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_details"("p_user_id" "uuid", "p_full_name" "text", "p_job_title" "text", "p_company" "text", "p_role" "text" DEFAULT NULL::"text", "p_brand_permissions" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    update auth.users
    set
        raw_user_meta_data = raw_user_meta_data || jsonb_strip_nulls(
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
$$;


ALTER FUNCTION "public"."update_user_details"("p_user_id" "uuid", "p_full_name" "text", "p_job_title" "text", "p_company" "text", "p_role" "text", "p_brand_permissions" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_tasks_modtime"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_tasks_modtime"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflow_and_handle_invites"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    step_item jsonb;
    step_record_id uuid;
    step_name_val text;
    step_description_val text;
    step_role_val text;
    step_approval_required_val boolean;
    step_order_val integer;
    assignees_for_this_step uuid[];
    current_step_ids_in_db uuid[];
    input_step_ids uuid[] := ARRAY[]::uuid[];
    step_id_to_delete uuid;
BEGIN
    -- 1. Update the main workflow record in public.workflows
    UPDATE public.workflows
    SET
        name = COALESCE(p_name, public.workflows.name),
        brand_id = COALESCE(p_brand_id, public.workflows.brand_id),
        template_id = p_template_id, 
        description = COALESCE(p_description, public.workflows.description), -- Use p_description
        updated_at = NOW()
    WHERE id = p_workflow_id;

    -- 2. Process steps: Update existing, Insert new
    IF p_steps IS NOT NULL AND jsonb_array_length(p_steps) > 0 THEN
        FOR step_item IN SELECT * FROM jsonb_array_elements(p_steps)
        LOOP
            input_step_ids := array_append(input_step_ids, (step_item->>'id')::uuid);
        END LOOP;
        
        FOR step_item IN SELECT * FROM jsonb_array_elements(p_steps)
        LOOP
            step_record_id := (step_item->>'id')::uuid;
            step_name_val := step_item->>'name';
            step_description_val := step_item->>'description';
            step_role_val := step_item->>'role';
            step_approval_required_val := (step_item->>'approvalRequired')::boolean;
            step_order_val := (step_item->>'step_order')::integer;

            SELECT ARRAY(SELECT jsonb_array_elements_text(step_item->'assignees'))::uuid[]
            INTO assignees_for_this_step;
            
            INSERT INTO public.workflow_steps (
                id, workflow_id, name, description, role, 
                approval_required, step_order, assigned_user_ids,
                updated_at, created_at
            )
            VALUES (
                step_record_id, p_workflow_id, step_name_val, step_description_val, step_role_val,
                step_approval_required_val, step_order_val, assignees_for_this_step,
                NOW(), NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                role = EXCLUDED.role,
                approval_required = EXCLUDED.approval_required,
                step_order = EXCLUDED.step_order,
                assigned_user_ids = EXCLUDED.assigned_user_ids,
                workflow_id = EXCLUDED.workflow_id, 
                updated_at = NOW();
        END LOOP;
    END IF;

    -- 3. Delete steps 
    SELECT array_agg(id) INTO current_step_ids_in_db FROM public.workflow_steps WHERE workflow_id = p_workflow_id;

    IF current_step_ids_in_db IS NOT NULL THEN
        FOREACH step_id_to_delete IN ARRAY current_step_ids_in_db
        LOOP
            IF input_step_ids IS NULL OR NOT (step_id_to_delete = ANY(input_step_ids)) THEN
                DELETE FROM public.workflow_steps WHERE id = step_id_to_delete;
            END IF;
        END LOOP;
    END IF;
    
    -- 4. Handle p_new_invitation_items (logic can be added here if needed in the future)
    -- IF p_new_invitation_items IS NOT NULL AND jsonb_array_length(p_new_invitation_items) > 0 THEN
    --     RAISE NOTICE 'Processing p_new_invitation_items (logic not implemented yet)';
    -- END IF;

    RETURN TRUE;

EXCEPTION
    WHEN others THEN
        RAISE WARNING 'Error in update_workflow_and_handle_invites for workflow ID %: %', p_workflow_id, SQLERRM;
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."update_workflow_and_handle_invites"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflow_and_handle_invites_invoker_version_temp"("p_workflow_id" "uuid", "p_name" "text" DEFAULT NULL::"text", "p_brand_id" "uuid" DEFAULT NULL::"uuid", "p_steps" "jsonb" DEFAULT NULL::"jsonb", "p_template_id" "uuid" DEFAULT NULL::"uuid", "p_description" "text" DEFAULT NULL::"text", "p_new_invitation_items" "jsonb" DEFAULT NULL::"jsonb") RETURNS boolean
    LANGUAGE "plpgsql"
    AS $$DECLARE
            -- All variable declarations go here
            step_item jsonb;
            step_record_id uuid;
            step_name_val text;
            step_description_val text;
            step_role_val text;
            step_approval_required_val boolean;
            step_order_val integer;
            assignees_for_this_step uuid[];
            current_step_ids_in_db uuid[];
            input_step_ids uuid[] := ARRAY[]::uuid[];
            step_id_to_delete uuid;
        BEGIN
            -- Function logic starts here
            
            -- 1. Update the main workflow record in public.workflows
            UPDATE public.workflows
            SET
                name = COALESCE(p_name, public.workflows.name),
                brand_id = COALESCE(p_brand_id, public.workflows.brand_id),
                template_id = p_template_id, 
                description = COALESCE(p_description, public.workflows.description),
                updated_at = NOW()
            WHERE id = p_workflow_id;

            -- 2. Process steps: Update existing, Insert new
            IF p_steps IS NOT NULL AND jsonb_array_length(p_steps) > 0 THEN
                FOR step_item IN SELECT * FROM jsonb_array_elements(p_steps)
                LOOP
                    input_step_ids := array_append(input_step_ids, (step_item->>'id')::uuid);
                END LOOP;
                
                FOR step_item IN SELECT * FROM jsonb_array_elements(p_steps)
                LOOP
                    step_record_id := (step_item->>'id')::uuid;
                    step_name_val := step_item->>'name';
                    step_description_val := step_item->>'description';
                    step_role_val := step_item->>'role';
                    step_approval_required_val := (step_item->>'approvalRequired')::boolean;
                    step_order_val := (step_item->>'step_order')::integer;

                    SELECT ARRAY(SELECT jsonb_array_elements_text(step_item->'assignees'))::uuid[]
                    INTO assignees_for_this_step;
                    
                    INSERT INTO public.workflow_steps (
                        id, workflow_id, name, description, role, 
                        approval_required, step_order, assigned_user_ids,
                        updated_at, created_at
                    )
                    VALUES (
                        step_record_id, p_workflow_id, step_name_val, step_description_val, step_role_val,
                        step_approval_required_val, step_order_val, assignees_for_this_step,
                        NOW(), NOW()
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        role = EXCLUDED.role,
                        approval_required = EXCLUDED.approval_required,
                        step_order = EXCLUDED.step_order,
                        assigned_user_ids = EXCLUDED.assigned_user_ids,
                        workflow_id = EXCLUDED.workflow_id, 
                        updated_at = NOW();
                END LOOP;
            END IF;

            -- 3. Delete steps 
            SELECT array_agg(id) INTO current_step_ids_in_db FROM public.workflow_steps WHERE workflow_id = p_workflow_id;

            IF current_step_ids_in_db IS NOT NULL THEN
                FOREACH step_id_to_delete IN ARRAY current_step_ids_in_db
                LOOP
                    IF input_step_ids IS NULL OR NOT (step_id_to_delete = ANY(input_step_ids)) THEN
                        DELETE FROM public.workflow_steps WHERE id = step_id_to_delete;
                    END IF;
                END LOOP;
            END IF;
            
            RETURN TRUE;

        EXCEPTION
            WHEN others THEN
                RAISE WARNING 'Error in update_workflow_and_handle_invites for workflow ID %: %', p_workflow_id, SQLERRM;
                RETURN FALSE;
        END;$$;


ALTER FUNCTION "public"."update_workflow_and_handle_invites_invoker_version_temp"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_market_claim_override_references"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    master_claim_record RECORD;
    replacement_claim_record RECORD;
BEGIN
    -- Validate master_claim_id: it must exist and be a global claim
    SELECT id, country_code INTO master_claim_record
    FROM public.claims
    WHERE id = NEW.master_claim_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Master claim ID % does not exist in claims table.', NEW.master_claim_id
        USING ERRCODE = 'foreign_key_violation', HINT = 'Ensure the master_claim_id refers to an existing claim.';
    END IF;

    IF master_claim_record.country_code != '__GLOBAL__' THEN
        RAISE EXCEPTION 'Master claim ID % (country_code: %) must be a global claim (country_code = ''__GLOBAL__'').', NEW.master_claim_id, master_claim_record.country_code
        USING ERRCODE = 'check_violation', HINT = 'Ensure the master claim is marked with country_code __GLOBAL__.';
    END IF;

    -- Validate replacement_claim_id (if provided): it must exist and belong to the same market
    IF NEW.replacement_claim_id IS NOT NULL THEN
        SELECT id, country_code INTO replacement_claim_record
        FROM public.claims
        WHERE id = NEW.replacement_claim_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Replacement claim ID % does not exist in claims table.', NEW.replacement_claim_id
            USING ERRCODE = 'foreign_key_violation', HINT = 'Ensure the replacement_claim_id refers to an existing claim.';
        END IF;

        IF replacement_claim_record.country_code != NEW.market_country_code THEN
            RAISE EXCEPTION 'Replacement claim ID % (country_code: %) must belong to the market %.', NEW.replacement_claim_id, replacement_claim_record.country_code, NEW.market_country_code
            USING ERRCODE = 'check_violation', HINT = 'Ensure the replacement claim''s country_code matches the market_country_code of the override.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_market_claim_override_references"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


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


CREATE TABLE IF NOT EXISTS "public"."claim_products" (
    "claim_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."claim_products" OWNER TO "postgres";


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
    CONSTRAINT "chk_claim_level_reference" CHECK (((("level" = 'brand'::"public"."claim_level_enum") AND ("master_brand_id" IS NOT NULL) AND ("product_id" IS NULL) AND ("ingredient_id" IS NULL)) OR (("level" = 'product'::"public"."claim_level_enum") AND ("product_id" IS NOT NULL) AND ("master_brand_id" IS NULL) AND ("ingredient_id" IS NULL)) OR (("level" = 'ingredient'::"public"."claim_level_enum") AND ("ingredient_id" IS NOT NULL) AND ("master_brand_id" IS NULL) AND ("product_id" IS NULL))))
);


ALTER TABLE "public"."claims" OWNER TO "postgres";


COMMENT ON TABLE "public"."claims" IS 'Stores marketing claims related to brands, products, or ingredients.';



COMMENT ON COLUMN "public"."claims"."claim_text" IS 'The actual text of the claim.';



COMMENT ON COLUMN "public"."claims"."claim_type" IS 'Type of claim (allowed, disallowed, mandatory).';



COMMENT ON COLUMN "public"."claims"."level" IS 'The level at which the claim applies (brand, product, or ingredient).';



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
    "email" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."avatar_url" IS 'URL to user profile avatar image stored in Supabase Storage';



COMMENT ON COLUMN "public"."profiles"."job_title" IS 'User''s job title or role within their organization';



COMMENT ON COLUMN "public"."profiles"."company" IS 'Company or organization where the user is employed';



COMMENT ON COLUMN "public"."profiles"."email" IS 'Email address of the user, used for workflows and notifications';



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
    "c"."product_id",
    "c"."ingredient_id",
    "c"."country_code",
    "c"."description",
    "c"."created_at",
    "c"."updated_at",
    "c"."master_brand_id",
    "c"."created_by",
    "public"."get_claim_products"("c"."id") AS "product_ids",
    "public"."get_claim_countries"("c"."id") AS "country_codes"
   FROM "public"."claims" "c";


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
    "fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);

ALTER TABLE ONLY "public"."content" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."content" OWNER TO "postgres";


COMMENT ON COLUMN "public"."content"."assigned_to" IS 'Array of user IDs assigned to the current step of the content. No direct FK to profiles; integrity checked by app.';



COMMENT ON COLUMN "public"."content"."fields" IS 'Stores data for custom fields defined in a content template.';



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
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
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



COMMENT ON COLUMN "public"."feedback_items"."id" IS 'Unique identifier for the feedback item.';



COMMENT ON COLUMN "public"."feedback_items"."created_at" IS 'Timestamp of when the item was created.';



COMMENT ON COLUMN "public"."feedback_items"."created_by" IS 'ID of the user (profile ID, linked to auth.user) who logged the item.';



COMMENT ON COLUMN "public"."feedback_items"."type" IS 'Type of feedback: ''bug'' or ''enhancement''.';



COMMENT ON COLUMN "public"."feedback_items"."title" IS 'A concise title for the item.';



COMMENT ON COLUMN "public"."feedback_items"."description" IS 'Detailed description of the bug or enhancement.';



COMMENT ON COLUMN "public"."feedback_items"."priority" IS 'Priority level of the item: ''low'', ''medium'', ''high'', ''critical''.';



COMMENT ON COLUMN "public"."feedback_items"."status" IS 'Current status of the item: ''open'', ''in_progress'', ''resolved'', ''closed'', ''wont_fix''.';



COMMENT ON COLUMN "public"."feedback_items"."affected_area" IS 'Optional: e.g., "Dashboard", "Content Creation", "API".';



COMMENT ON COLUMN "public"."feedback_items"."steps_to_reproduce" IS 'Optional: Steps to reproduce a bug.';



COMMENT ON COLUMN "public"."feedback_items"."expected_behavior" IS 'Optional: Expected behavior for a bug report.';



COMMENT ON COLUMN "public"."feedback_items"."actual_behavior" IS 'Optional: Actual behavior observed for a bug report.';



COMMENT ON COLUMN "public"."feedback_items"."attachments_metadata" IS 'Optional: JSONB to store metadata about any attachments (e.g., filenames, URLs from Supabase Storage).';



COMMENT ON COLUMN "public"."feedback_items"."app_version" IS 'Optional: Application version where the bug was observed or for which the enhancement is relevant.';



COMMENT ON COLUMN "public"."feedback_items"."user_impact_details" IS 'Optional: Notes on how users are affected or the potential benefits of an enhancement.';



COMMENT ON COLUMN "public"."feedback_items"."url" IS 'Optional: URL related to the feedback, e.g., where the bug occurred or relevant page.';



COMMENT ON COLUMN "public"."feedback_items"."browser_info" IS 'Optional: User''s browser information (e.g., Chrome 105, Firefox 100).';



COMMENT ON COLUMN "public"."feedback_items"."os_info" IS 'Optional: User''s operating system information (e.g., Windows 10, macOS Monterey).';



COMMENT ON COLUMN "public"."feedback_items"."resolution_details" IS 'Optional: For admins/editors to detail how an issue was resolved or provide internal notes.';



COMMENT ON COLUMN "public"."feedback_items"."updated_at" IS 'Timestamp of when the item was last updated, automatically managed by trigger.';



COMMENT ON COLUMN "public"."feedback_items"."assigned_to" IS 'Optional: ID of the user (profile ID) to whom this feedback item is assigned for action.';



COMMENT ON COLUMN "public"."feedback_items"."updated_by" IS 'Optional: ID of the user (profile ID) who last updated the item.';



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


COMMENT ON TABLE "public"."market_claim_overrides" IS 'Records when a Master claim is specifically blocked or replaced by a market for a product.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" NOT NULL,
    "is_read" boolean DEFAULT false,
    "action_url" "text",
    "action_label" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


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
    "assigned_user_ids" "uuid"[]
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



ALTER TABLE ONLY "public"."brand_selected_agencies"
    ADD CONSTRAINT "brand_selected_agencies_pkey" PRIMARY KEY ("brand_id", "agency_id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."claim_countries"
    ADD CONSTRAINT "claim_countries_pkey" PRIMARY KEY ("claim_id", "country_code");



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "claim_products_pkey" PRIMARY KEY ("claim_id", "product_id");



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



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "global_claim_brands_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "global_claim_brands_name_unique" UNIQUE ("name");



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "global_claim_brands_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_user_id_brand_id_key" UNIQUE ("user_id", "brand_id");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_user_content_step_unique" UNIQUE ("user_id", "content_id", "workflow_step_id");



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_brand_selected_agencies_agency_id" ON "public"."brand_selected_agencies" USING "btree" ("agency_id");



CREATE INDEX "idx_brand_selected_agencies_brand_id" ON "public"."brand_selected_agencies" USING "btree" ("brand_id");



CREATE INDEX "idx_brands_master_claim_brand_id" ON "public"."brands" USING "btree" ("master_claim_brand_id");



CREATE INDEX "idx_brands_normalized_website_domain" ON "public"."brands" USING "btree" ("normalized_website_domain");



CREATE INDEX "idx_brands_website_urls_gin" ON "public"."brands" USING "gin" ("website_urls");



CREATE INDEX "idx_claim_countries_claim_id" ON "public"."claim_countries" USING "btree" ("claim_id");



CREATE INDEX "idx_claim_countries_country_code" ON "public"."claim_countries" USING "btree" ("country_code");



CREATE INDEX "idx_claim_products_claim_id" ON "public"."claim_products" USING "btree" ("claim_id");



CREATE INDEX "idx_claim_products_product_id" ON "public"."claim_products" USING "btree" ("product_id");



CREATE INDEX "idx_claim_workflow_history_claim_id" ON "public"."claim_workflow_history" USING "btree" ("claim_id");



CREATE INDEX "idx_claim_workflow_history_created_at" ON "public"."claim_workflow_history" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_claims_current_workflow_step" ON "public"."claims" USING "btree" ("current_workflow_step");



CREATE INDEX "idx_claims_workflow_id" ON "public"."claims" USING "btree" ("workflow_id");



CREATE INDEX "idx_claims_workflow_status" ON "public"."claims" USING "btree" ("workflow_status");



CREATE INDEX "idx_claims_workflow_steps_assigned_users" ON "public"."claims_workflow_steps" USING "gin" ("assigned_user_ids");



CREATE INDEX "idx_claims_workflow_steps_workflow_id" ON "public"."claims_workflow_steps" USING "btree" ("workflow_id");



CREATE INDEX "idx_claims_workflows_brand_id" ON "public"."claims_workflows" USING "btree" ("brand_id");



CREATE INDEX "idx_claims_workflows_created_by" ON "public"."claims_workflows" USING "btree" ("created_by");



CREATE INDEX "idx_content_brand_id" ON "public"."content" USING "btree" ("brand_id");



CREATE INDEX "idx_content_created_by" ON "public"."content" USING "btree" ("created_by");



CREATE INDEX "idx_content_ownership_content_id" ON "public"."content_ownership_history" USING "btree" ("content_id");



CREATE INDEX "idx_content_ownership_new_owner" ON "public"."content_ownership_history" USING "btree" ("new_owner");



CREATE INDEX "idx_content_ownership_previous_owner" ON "public"."content_ownership_history" USING "btree" ("previous_owner");



CREATE INDEX "idx_content_template_id" ON "public"."content" USING "btree" ("template_id");



CREATE INDEX "idx_content_templates_brand_id" ON "public"."content_templates" USING "btree" ("brand_id") WHERE ("brand_id" IS NOT NULL);



CREATE INDEX "idx_content_templates_name" ON "public"."content_templates" USING "btree" ("name");



CREATE INDEX "idx_content_versions_content_id_version" ON "public"."content_versions" USING "btree" ("content_id", "version_number");



CREATE INDEX "idx_content_versions_step_id_created" ON "public"."content_versions" USING "btree" ("content_id", "workflow_step_identifier", "created_at");



CREATE INDEX "idx_content_workflow_id" ON "public"."content" USING "btree" ("workflow_id");



CREATE INDEX "idx_feedback_items_assigned_to" ON "public"."feedback_items" USING "btree" ("assigned_to");



CREATE INDEX "idx_feedback_items_updated_by" ON "public"."feedback_items" USING "btree" ("updated_by");



CREATE INDEX "idx_invitation_logs_email" ON "public"."invitation_logs" USING "btree" ("email");



CREATE INDEX "idx_security_logs_event_type" ON "public"."security_logs" USING "btree" ("event_type");



CREATE INDEX "idx_security_logs_ip_address" ON "public"."security_logs" USING "btree" ("ip_address");



CREATE INDEX "idx_security_logs_timestamp" ON "public"."security_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_security_logs_user_id" ON "public"."security_logs" USING "btree" ("user_id");



CREATE INDEX "idx_tool_run_history_run_at" ON "public"."tool_run_history" USING "btree" ("run_at");



CREATE INDEX "idx_tool_run_history_tool_name" ON "public"."tool_run_history" USING "btree" ("tool_name");



CREATE INDEX "idx_tool_run_history_user_id" ON "public"."tool_run_history" USING "btree" ("user_id");



CREATE INDEX "idx_user_brand_permissions_brand_id" ON "public"."user_brand_permissions" USING "btree" ("brand_id");



CREATE INDEX "idx_user_brand_permissions_user_id" ON "public"."user_brand_permissions" USING "btree" ("user_id");



CREATE INDEX "idx_user_invitations_email" ON "public"."user_invitations" USING "btree" ("email");



CREATE INDEX "idx_user_invitations_source" ON "public"."user_invitations" USING "btree" ("invitation_source", "source_id");



CREATE INDEX "idx_user_invitations_status" ON "public"."user_invitations" USING "btree" ("status");



CREATE INDEX "idx_user_tasks_user_id_status" ON "public"."user_tasks" USING "btree" ("user_id", "status");



CREATE INDEX "idx_workflow_invitations_email" ON "public"."workflow_invitations" USING "btree" ("email");



CREATE INDEX "idx_workflow_invitations_expires_at" ON "public"."workflow_invitations" USING "btree" ("expires_at");



CREATE INDEX "idx_workflow_invitations_status" ON "public"."workflow_invitations" USING "btree" ("status");



CREATE INDEX "idx_workflow_invitations_user_id" ON "public"."workflow_invitations" USING "btree" ("user_id");



CREATE INDEX "idx_workflow_steps_order" ON "public"."workflow_steps" USING "btree" ("step_order");



CREATE INDEX "idx_workflow_steps_workflow_id" ON "public"."workflow_steps" USING "btree" ("workflow_id");



CREATE INDEX "idx_workflows_brand_id" ON "public"."workflows" USING "btree" ("brand_id");



CREATE INDEX "idx_workflows_status" ON "public"."workflows" USING "btree" ("status");



CREATE INDEX "idx_workflows_template_id" ON "public"."workflows" USING "btree" ("template_id");



CREATE OR REPLACE TRIGGER "handle_updated_at_global_claim_brands" BEFORE UPDATE ON "public"."master_claim_brands" FOR EACH ROW EXECUTE FUNCTION "public"."moddatetime"('updated_at');



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



CREATE OR REPLACE TRIGGER "update_user_invitations_modtime" BEFORE UPDATE ON "public"."user_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_user_system_roles_modtime" BEFORE UPDATE ON "public"."user_system_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."analytics"
    ADD CONSTRAINT "analytics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_selected_agencies"
    ADD CONSTRAINT "brand_selected_agencies_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."content_vetting_agencies"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brand_selected_agencies"
    ADD CONSTRAINT "brand_selected_agencies_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_brand_admin_id_fkey" FOREIGN KEY ("brand_admin_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_countries"
    ADD CONSTRAINT "claim_countries_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "claim_products_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_products"
    ADD CONSTRAINT "claim_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_workflow_history"
    ADD CONSTRAINT "claim_workflow_history_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claim_workflow_history"
    ADD CONSTRAINT "claim_workflow_history_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claim_workflow_history"
    ADD CONSTRAINT "claim_workflow_history_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."claims_workflow_steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_current_workflow_step_fkey" FOREIGN KEY ("current_workflow_step") REFERENCES "public"."claims_workflow_steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_master_brand_id_fkey" FOREIGN KEY ("master_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "claims_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."claims_workflows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims_workflow_steps"
    ADD CONSTRAINT "claims_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."claims_workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims_workflows"
    ADD CONSTRAINT "claims_workflows_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."claims_workflows"
    ADD CONSTRAINT "claims_workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_current_step_fkey" FOREIGN KEY ("current_step") REFERENCES "public"."workflow_steps"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_new_owner_fkey" FOREIGN KEY ("new_owner") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_ownership_history"
    ADD CONSTRAINT "content_ownership_history_previous_owner_fkey" FOREIGN KEY ("previous_owner") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."content_templates"("id");



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_templates"
    ADD CONSTRAINT "content_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content_versions"
    ADD CONSTRAINT "content_versions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."content_versions"
    ADD CONSTRAINT "content_versions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."content"
    ADD CONSTRAINT "content_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "feedback_items_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "fk_brands_master_claim_brand" FOREIGN KEY ("master_claim_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."claims"
    ADD CONSTRAINT "fk_claims_created_by" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."feedback_items"
    ADD CONSTRAINT "fk_feedback_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "fk_master_claim_brand" FOREIGN KEY ("master_claim_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."master_claim_brands"
    ADD CONSTRAINT "global_claim_brands_mixerai_brand_id_fkey" FOREIGN KEY ("mixerai_brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitation_logs"
    ADD CONSTRAINT "invitation_logs_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invitation_logs"
    ADD CONSTRAINT "invitation_logs_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_master_claim_id_fkey" FOREIGN KEY ("master_claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_replacement_claim_id_fkey" FOREIGN KEY ("replacement_claim_id") REFERENCES "public"."claims"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."market_claim_overrides"
    ADD CONSTRAINT "market_claim_overrides_target_product_id_fkey" FOREIGN KEY ("target_product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_ingredients"
    ADD CONSTRAINT "product_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_ingredients"
    ADD CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_master_brand_id_fkey" FOREIGN KEY ("master_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."security_logs"
    ADD CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_run_history"
    ADD CONSTRAINT "tool_run_history_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tool_run_history"
    ADD CONSTRAINT "tool_run_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_brand_permissions"
    ADD CONSTRAINT "user_brand_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_invitations"
    ADD CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_system_roles"
    ADD CONSTRAINT "user_system_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "user_tasks_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_tasks"
    ADD CONSTRAINT "ut_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_invitations"
    ADD CONSTRAINT "workflow_invitations_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_steps"
    ADD CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "workflow_user_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "workflow_user_assignments_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflows"
    ADD CONSTRAINT "workflows_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."content_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_user_assignments"
    ADD CONSTRAINT "wua_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete content" ON "public"."content" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "Admins can delete their brands" ON "public"."brands" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "brands"."id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



COMMENT ON POLICY "Admins can delete their brands" ON "public"."brands" IS 'Users with a brand_admin role for a specific brand in user_brand_permissions can delete that brand. Uses user_brand_role_enum.';



CREATE POLICY "Admins can insert brands" ON "public"."brands" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



COMMENT ON POLICY "Admins can insert brands" ON "public"."brands" IS 'Users with a brand_admin role for any brand in user_brand_permissions can insert new brands. Uses user_brand_role_enum.';



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



COMMENT ON POLICY "Admins can update their brands" ON "public"."brands" IS 'Users with a brand_admin role for a specific brand in user_brand_permissions can update that brand. Uses user_brand_role_enum.';



CREATE POLICY "Allow admins to delete feedback" ON "public"."feedback_items" FOR DELETE TO "authenticated" USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text") OR (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Allow admins to update feedback" ON "public"."feedback_items" FOR UPDATE TO "authenticated" USING (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text") OR (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text"))) WITH CHECK (((( SELECT ("auth"."jwt"() ->> 'role'::"text")) = 'admin'::"text") OR (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Allow any authenticated user to update feedback items" ON "public"."feedback_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



COMMENT ON POLICY "Allow any authenticated user to update feedback items" ON "public"."feedback_items" IS 'Allows any authenticated user to update any feedback item.';



CREATE POLICY "Allow authenticated users to insert feedback" ON "public"."feedback_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read all feedback" ON "public"."feedback_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read global_claim_brands" ON "public"."master_claim_brands" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow global admins full access on global_claim_brands" ON "public"."master_claim_brands" USING ("public"."is_global_admin"()) WITH CHECK ("public"."is_global_admin"());



CREATE POLICY "Brand admins can manage brand invitations" ON "public"."user_invitations" TO "authenticated" USING ((("invitation_source" = 'brand'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "user_invitations"."source_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum"))))));



CREATE POLICY "Claims - Global Admins - Full Access" ON "public"."claims" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "Editors and Admins can insert content" ON "public"."content" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = ANY (ARRAY['editor'::"public"."user_brand_role_enum", 'admin'::"public"."user_brand_role_enum"]))))));



CREATE POLICY "Editors and Admins can update content" ON "public"."content" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = ANY (ARRAY['editor'::"public"."user_brand_role_enum", 'admin'::"public"."user_brand_role_enum"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "content"."brand_id") AND ("user_brand_permissions"."role" = ANY (ARRAY['editor'::"public"."user_brand_role_enum", 'admin'::"public"."user_brand_role_enum"]))))));



CREATE POLICY "Everyone can view analytics" ON "public"."analytics" FOR SELECT USING (true);



CREATE POLICY "Everyone can view brands" ON "public"."brands" FOR SELECT USING (true);



CREATE POLICY "Everyone can view content" ON "public"."content" FOR SELECT USING (true);



CREATE POLICY "Everyone can view user brand permissions" ON "public"."user_brand_permissions" FOR SELECT USING (true);



CREATE POLICY "Everyone can view workflows" ON "public"."workflows" FOR SELECT USING (true);



CREATE POLICY "Global Admins can manage user_brand_permissions" ON "public"."user_brand_permissions" TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'admin'::"text"));



COMMENT ON POLICY "Global Admins can manage user_brand_permissions" ON "public"."user_brand_permissions" IS 'Ensures only users with "admin" role (checked safely) can manage user_brand_permissions.';



CREATE POLICY "Global admins can manage content templates" ON "public"."content_templates" USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Global admins can view content templates" ON "public"."content_templates" FOR SELECT USING ((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "Ingredients - Authenticated Users - Read Access" ON "public"."ingredients" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Ingredients - Global Admins - Full Access" ON "public"."ingredients" USING ((( SELECT ("users"."raw_user_meta_data" ->> 'role'::"text")
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT ("users"."raw_user_meta_data" ->> 'role'::"text")
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "ProductIngredients - Global Admins - Full Access" ON "public"."product_ingredients" USING ((( SELECT ("users"."raw_user_meta_data" ->> 'role'::"text")
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text")) WITH CHECK ((( SELECT ("users"."raw_user_meta_data" ->> 'role'::"text")
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Products - Authenticated Users - Read Access" ON "public"."products" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Products - Global Admins - Full Access" ON "public"."products" USING ("public"."is_global_admin"("auth"."uid"())) WITH CHECK ("public"."is_global_admin"("auth"."uid"()));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Service role can insert security logs" ON "public"."security_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Super admins can view all security logs" ON "public"."security_logs" FOR SELECT USING (((("auth"."jwt"() ->> 'role'::"text") = 'admin'::"text") OR (((("auth"."jwt"() ->> 'app_metadata'::"text"))::"jsonb" ->> 'role'::"text") = 'admin'::"text")));



CREATE POLICY "Superadmins can manage all invitations" ON "public"."user_invitations" USING ((EXISTS ( SELECT 1
   FROM "public"."user_system_roles"
  WHERE (("user_system_roles"."user_id" = "auth"."uid"()) AND ("user_system_roles"."role" = 'superadmin'::"text")))));



CREATE POLICY "Superadmins can manage content ownership history" ON "public"."content_ownership_history" USING ((EXISTS ( SELECT 1
   FROM "public"."user_system_roles"
  WHERE (("user_system_roles"."user_id" = "auth"."uid"()) AND ("user_system_roles"."role" = 'superadmin'::"text")))));



CREATE POLICY "Superadmins can manage system roles" ON "public"."user_system_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."user_system_roles" "user_system_roles_1"
  WHERE (("user_system_roles_1"."user_id" = "auth"."uid"()) AND ("user_system_roles_1"."role" = 'superadmin'::"text")))));



CREATE POLICY "System can insert analytics" ON "public"."analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can update analytics" ON "public"."analytics" FOR UPDATE USING (true) WITH CHECK (true);



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own tool run history" ON "public"."tool_run_history" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage claim countries based on claim permissions" ON "public"."claim_countries" USING ((EXISTS ( SELECT 1
   FROM "public"."claims"
  WHERE ("claims"."id" = "claim_countries"."claim_id"))));



CREATE POLICY "Users can manage claim products based on claim permissions" ON "public"."claim_products" USING ((EXISTS ( SELECT 1
   FROM "public"."claims"
  WHERE ("claims"."id" = "claim_products"."claim_id"))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view claim countries based on claim permissions" ON "public"."claim_countries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."claims"
  WHERE ("claims"."id" = "claim_countries"."claim_id"))));



CREATE POLICY "Users can view claim products based on claim permissions" ON "public"."claim_products" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."claims"
  WHERE ("claims"."id" = "claim_products"."claim_id"))));



CREATE POLICY "Users can view content ownership history" ON "public"."content_ownership_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."content"
     JOIN "public"."user_brand_permissions" ON (("user_brand_permissions"."brand_id" = "content"."brand_id")))
  WHERE (("content"."id" = "content_ownership_history"."content_id") AND ("user_brand_permissions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view system roles" ON "public"."user_system_roles" FOR SELECT USING (true);



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own tool run history" ON "public"."tool_run_history" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view versions of content they can view" ON "public"."content_versions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."content" "c"
  WHERE (("c"."id" = "content_versions"."content_id") AND (EXISTS ( SELECT 1
           FROM "public"."user_brand_permissions" "ubp"
          WHERE (("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."brand_id" = "c"."brand_id"))))))));



ALTER TABLE "public"."analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_countries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claim_workflow_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "claim_workflow_history_insert_policy" ON "public"."claim_workflow_history" FOR INSERT WITH CHECK (("reviewer_id" = "auth"."uid"()));



CREATE POLICY "claim_workflow_history_select_policy" ON "public"."claim_workflow_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."claims" "c"
  WHERE (("c"."id" = "claim_workflow_history"."claim_id") AND (("c"."created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."workflow_steps" "ws"
          WHERE (("ws"."id" = "c"."current_workflow_step") AND ("auth"."uid"() = ANY ("ws"."assigned_user_ids"))))) OR (EXISTS ( SELECT 1
           FROM ("public"."user_brand_permissions" "ubp"
             JOIN "public"."master_claim_brands" "mcb" ON (("mcb"."mixerai_brand_id" = "ubp"."brand_id")))
          WHERE (("ubp"."user_id" = "auth"."uid"()) AND ("c"."master_brand_id" = "mcb"."id")))))))));



ALTER TABLE "public"."claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."claims_workflow_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "claims_workflow_steps_delete_policy" ON "public"."claims_workflow_steps" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."claims_workflows" "cw"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "cw"."brand_id")))
  WHERE (("cw"."id" = "claims_workflow_steps"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "claims_workflow_steps_insert_policy" ON "public"."claims_workflow_steps" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."claims_workflows" "cw"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "cw"."brand_id")))
  WHERE (("cw"."id" = "claims_workflow_steps"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "claims_workflow_steps_select_policy" ON "public"."claims_workflow_steps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."claims_workflows" "cw"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "cw"."brand_id")))
  WHERE (("cw"."id" = "claims_workflow_steps"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"())))));



CREATE POLICY "claims_workflow_steps_update_policy" ON "public"."claims_workflow_steps" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."claims_workflows" "cw"
     JOIN "public"."user_brand_permissions" "ubp" ON (("ubp"."brand_id" = "cw"."brand_id")))
  WHERE (("cw"."id" = "claims_workflow_steps"."workflow_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))));



ALTER TABLE "public"."claims_workflows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "claims_workflows_delete_policy" ON "public"."claims_workflows" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "claims_workflows"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "claims_workflows_insert_policy" ON "public"."claims_workflows" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "claims_workflows"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



CREATE POLICY "claims_workflows_select_policy" ON "public"."claims_workflows" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "claims_workflows"."brand_id")))) OR ("created_by" = "auth"."uid"())));



CREATE POLICY "claims_workflows_update_policy" ON "public"."claims_workflows" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "claims_workflows"."brand_id") AND ("user_brand_permissions"."role" = 'admin'::"public"."user_brand_role_enum")))));



ALTER TABLE "public"."content" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_ownership_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."content_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."master_claim_brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_ingredients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rls_brands_admin_all_access" ON "public"."brands" TO "authenticated" USING (("public"."get_current_user_role"() = 'admin'::"text")) WITH CHECK (("public"."get_current_user_role"() = 'admin'::"text"));



COMMENT ON POLICY "rls_brands_admin_all_access" ON "public"."brands" IS 'Ensures only users with "admin" role (checked safely) can perform any operation on brands.';



CREATE POLICY "rls_brands_brand_admin_select_assigned" ON "public"."brands" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "brands"."id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (("public"."get_current_user_role"() IS NULL) OR ("public"."get_current_user_role"() <> 'admin'::"text"))));



COMMENT ON POLICY "rls_brands_brand_admin_select_assigned" ON "public"."brands" IS 'Brand admins (role ''brand_admin'' for that brand, not global admin) can select assigned brands. Uses user_brand_role_enum and safe global role check.';



CREATE POLICY "rls_brands_brand_admin_update_assigned" ON "public"."brands" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "brands"."id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (("public"."get_current_user_role"() IS NULL) OR ("public"."get_current_user_role"() <> 'admin'::"text")))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "brands"."id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (("public"."get_current_user_role"() IS NULL) OR ("public"."get_current_user_role"() <> 'admin'::"text"))));



COMMENT ON POLICY "rls_brands_brand_admin_update_assigned" ON "public"."brands" IS 'Brand admins (role ''brand_admin'' for that brand, not global admin) can update assigned brands. Uses user_brand_role_enum and safe global role check.';



CREATE POLICY "rls_content_admin_all_access" ON "public"."content" TO "authenticated" USING ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "rls_content_brand_user_select_assigned" ON "public"."content" FOR SELECT TO "authenticated" USING (((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "content"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "rls_content_editor_delete" ON "public"."content" FOR DELETE TO "authenticated" USING (((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "content"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum"))))));



CREATE POLICY "rls_content_editor_insert" ON "public"."content" FOR INSERT TO "authenticated" WITH CHECK (((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "content"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = ANY (ARRAY['editor'::"public"."user_brand_role_enum", 'admin'::"public"."user_brand_role_enum"])))))));



CREATE POLICY "rls_content_editor_update" ON "public"."content" FOR UPDATE TO "authenticated" USING (((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "content"."brand_id") AND ("ubp"."user_id" = "auth"."uid"())))))) WITH CHECK (((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "content"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = ANY (ARRAY['editor'::"public"."user_brand_role_enum", 'admin'::"public"."user_brand_role_enum"])))))));



CREATE POLICY "rls_content_templates_admin_delete" ON "public"."content_templates" FOR DELETE TO "authenticated" USING ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "rls_content_templates_admin_insert" ON "public"."content_templates" FOR INSERT TO "authenticated" WITH CHECK ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "rls_content_templates_admin_select" ON "public"."content_templates" FOR SELECT TO "authenticated" USING ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "rls_content_templates_admin_update" ON "public"."content_templates" FOR UPDATE TO "authenticated" USING ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "rls_workflows_admin_all_access" ON "public"."workflows" TO "authenticated" USING ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text")) WITH CHECK ((((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") = 'admin'::"text"));



CREATE POLICY "rls_workflows_brand_admin_delete_assigned" ON "public"."workflows" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "workflows"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text")));



CREATE POLICY "rls_workflows_brand_admin_insert_assigned" ON "public"."workflows" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "workflows"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text")));



CREATE POLICY "rls_workflows_brand_admin_select_assigned" ON "public"."workflows" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "workflows"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text")));



CREATE POLICY "rls_workflows_brand_admin_update_assigned" ON "public"."workflows" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "workflows"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text"))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions" "ubp"
  WHERE (("ubp"."brand_id" = "workflows"."brand_id") AND ("ubp"."user_id" = "auth"."uid"()) AND ("ubp"."role" = 'admin'::"public"."user_brand_role_enum")))) AND (((( SELECT ("auth"."jwt"() ->> 'user_metadata'::"text")))::"jsonb" ->> 'role'::"text") <> 'admin'::"text")));



ALTER TABLE "public"."security_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tool_run_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_brand_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_system_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_user_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflows" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workflows_select_policy" ON "public"."workflows" FOR SELECT USING ((("auth"."uid"() = "created_by") OR (EXISTS ( SELECT 1
   FROM "public"."user_brand_permissions"
  WHERE (("user_brand_permissions"."user_id" = "auth"."uid"()) AND ("user_brand_permissions"."brand_id" = "workflows"."brand_id"))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT ALL ON SCHEMA "public" TO "postgres";
GRANT ALL ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT ALL ON SCHEMA "public" TO "service_role";



GRANT ALL ON TYPE "public"."feedback_priority" TO "authenticated";



GRANT ALL ON TYPE "public"."feedback_status" TO "authenticated";



GRANT ALL ON TYPE "public"."feedback_type" TO "authenticated";











































































































































































GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid", "p_comment" "text", "p_updated_claim_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid", "p_comment" "text", "p_updated_claim_text" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."advance_claim_workflow"("p_claim_id" "uuid", "p_action" "text", "p_feedback" "text", "p_reviewer_id" "uuid", "p_comment" "text", "p_updated_claim_text" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_brand_and_set_admin"("creator_user_id" "uuid", "brand_name" "text", "brand_website_url" "text", "brand_country" "text", "brand_language" "text", "brand_identity_text" "text", "brand_tone_of_voice" "text", "brand_guardrails" "text", "brand_content_vetting_agencies_input" "text"[], "brand_color_input" "text", "approved_content_types_input" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_profile_for_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_workflow_and_log_invitations"("p_name" "text", "p_brand_id" "uuid", "p_steps_definition" "jsonb", "p_created_by" "uuid", "p_invitation_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_template_and_update_content"("template_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_and_reassign_tasks"("p_user_id_to_delete" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_and_reassign_tasks"("p_user_id_to_delete" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_and_reassign_tasks"("p_user_id_to_delete" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid", "product_id_param" "uuid", "country_code_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid", "product_id_param" "uuid", "country_code_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_claims_for_master_brand"("master_brand_id_param" "uuid", "product_id_param" "uuid", "country_code_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brand_details_by_id"("p_brand_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_brand_details_by_id"("p_brand_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brand_details_by_id"("p_brand_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_brand_urls"("brand_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_claim_countries"("claim_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_claim_products"("claim_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_template_input_fields"("template_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_template_input_fields"("template_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_template_input_fields"("template_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_template_output_fields"("template_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_template_output_fields"("template_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_template_output_fields"("template_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_details"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_details"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_details"("p_user_id" "uuid") TO "service_role";



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



GRANT ALL ON FUNCTION "public"."integer_to_uuid"(integer) TO "anon";
GRANT ALL ON FUNCTION "public"."integer_to_uuid"(integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."integer_to_uuid"(integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_global_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_global_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_global_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_global_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_event_type" "text", "p_details" "jsonb", "p_user_id" "uuid", "p_ip_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."moddatetime"() TO "anon";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."moddatetime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_website_domain"("url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_website_domain"("url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_website_domain"("url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_role_for_all_assigned_brands"("target_user_id" "uuid", "new_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_role_for_all_assigned_brands"("target_user_id" "uuid", "new_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_role_for_all_assigned_brands"("target_user_id" "uuid", "new_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."test_plpgsql_declare"() TO "anon";
GRANT ALL ON FUNCTION "public"."test_plpgsql_declare"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."test_plpgsql_declare"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid", "p_logo_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid", "p_logo_url" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_with_agencies"("p_brand_id_to_update" "uuid", "p_name" "text", "p_website_url" "text", "p_additional_website_urls" "text"[], "p_country" "text", "p_language" "text", "p_brand_identity" "text", "p_tone_of_voice" "text", "p_guardrails" "text", "p_brand_color" "text", "p_master_claim_brand_id" "uuid", "p_selected_agency_ids" "uuid"[], "p_new_custom_agency_names" "text"[], "p_user_id" "uuid", "p_logo_url" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feedback_item_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_feedback_item_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feedback_item_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_details"("p_user_id" "uuid", "p_full_name" "text", "p_job_title" "text", "p_company" "text", "p_role" "text", "p_brand_permissions" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_details"("p_user_id" "uuid", "p_full_name" "text", "p_job_title" "text", "p_company" "text", "p_role" "text", "p_brand_permissions" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_details"("p_user_id" "uuid", "p_full_name" "text", "p_job_title" "text", "p_company" "text", "p_role" "text", "p_brand_permissions" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_tasks_modtime"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_tasks_modtime"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_tasks_modtime"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workflow_and_handle_invites"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_workflow_and_handle_invites"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_workflow_and_handle_invites"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_workflow_and_handle_invites_invoker_version_temp"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_workflow_and_handle_invites_invoker_version_temp"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_workflow_and_handle_invites_invoker_version_temp"("p_workflow_id" "uuid", "p_name" "text", "p_brand_id" "uuid", "p_steps" "jsonb", "p_template_id" "uuid", "p_description" "text", "p_new_invitation_items" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_market_claim_override_references"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_market_claim_override_references"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_market_claim_override_references"() TO "service_role";


















GRANT ALL ON TABLE "public"."analytics" TO "anon";
GRANT ALL ON TABLE "public"."analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."analytics" TO "service_role";



GRANT ALL ON TABLE "public"."brand_selected_agencies" TO "anon";
GRANT ALL ON TABLE "public"."brand_selected_agencies" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_selected_agencies" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."claim_countries" TO "anon";
GRANT ALL ON TABLE "public"."claim_countries" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_countries" TO "service_role";



GRANT ALL ON TABLE "public"."claim_products" TO "anon";
GRANT ALL ON TABLE "public"."claim_products" TO "authenticated";
GRANT ALL ON TABLE "public"."claim_products" TO "service_role";



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



GRANT ALL ON TABLE "public"."feedback_items" TO "anon";
GRANT ALL ON TABLE "public"."feedback_items" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_items" TO "service_role";



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



GRANT ALL ON TABLE "public"."user_system_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_system_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_system_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_tasks" TO "anon";
GRANT ALL ON TABLE "public"."user_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tasks" TO "service_role";



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

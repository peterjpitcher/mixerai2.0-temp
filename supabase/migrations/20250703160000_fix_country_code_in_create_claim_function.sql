-- Fix the create_claim_with_associations function to properly save country_code
-- The function was only saving to the junction table but not the main claims table

CREATE OR REPLACE FUNCTION "public"."create_claim_with_associations"(
  "p_claim_text" "text", 
  "p_claim_type" "public"."claim_type_enum", 
  "p_level" "public"."claim_level_enum", 
  "p_master_brand_id" "uuid" DEFAULT NULL::"uuid", 
  "p_ingredient_id" "uuid" DEFAULT NULL::"uuid", 
  "p_ingredient_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[], 
  "p_product_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[], 
  "p_country_codes" "text"[] DEFAULT ARRAY[]::"text"[], 
  "p_description" "text" DEFAULT NULL::"text", 
  "p_created_by" "uuid" DEFAULT "auth"."uid"(), 
  "p_workflow_id" "uuid" DEFAULT NULL::"uuid"
) RETURNS "uuid"
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
CREATE OR REPLACE FUNCTION get_all_claims_for_master_brand(
    master_brand_id_param UUID,
    product_id_param UUID DEFAULT NULL,
    country_code_param TEXT DEFAULT NULL
)
RETURNS TABLE(claim_text TEXT, claim_type TEXT, level TEXT, country_code TEXT) AS $$
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
$$ LANGUAGE plpgsql; 
-- Migration to add Häagen-Dazs claims data
-- Direct insertion approach to work with current schema constraints

DO $$
DECLARE
    v_haagen_dazs_id UUID;
    v_product_id UUID;
    v_vanilla_ingredient_id UUID;
    v_belgian_chocolate_ingredient_id UUID;
    v_strawberry_ingredient_id UUID;
    v_fruit_ingredient_id UUID;
    v_claim_id UUID;
    v_country_codes TEXT[];
    v_country_code TEXT;
BEGIN
    -- Get or create Häagen-Dazs master brand
    SELECT id INTO v_haagen_dazs_id 
    FROM master_claim_brands 
    WHERE name = 'Häagen-Dazs';
    
    IF v_haagen_dazs_id IS NULL THEN
        INSERT INTO master_claim_brands (name)
        VALUES ('Häagen-Dazs')
        RETURNING id INTO v_haagen_dazs_id;
    END IF; 

    -- Clear out all existing Häagen-Dazs claims before inserting new ones
    -- First delete from junction tables for all Häagen-Dazs related claims
    DELETE FROM claim_ingredients
    WHERE claim_id IN (
        SELECT c.id FROM claims c
        LEFT JOIN claim_products cp ON c.id = cp.claim_id
        LEFT JOIN products p ON cp.product_id = p.id
        WHERE c.master_brand_id = v_haagen_dazs_id 
           OR p.master_brand_id = v_haagen_dazs_id
    );
    
    DELETE FROM claim_products 
    WHERE claim_id IN (
        SELECT c.id FROM claims c
        LEFT JOIN claim_products cp ON c.id = cp.claim_id
        LEFT JOIN products p ON cp.product_id = p.id
        WHERE c.master_brand_id = v_haagen_dazs_id 
           OR p.master_brand_id = v_haagen_dazs_id
    );
    
    DELETE FROM claim_countries
    WHERE claim_id IN (
        SELECT c.id FROM claims c
        LEFT JOIN claim_products cp ON c.id = cp.claim_id
        LEFT JOIN products p ON cp.product_id = p.id
        WHERE c.master_brand_id = v_haagen_dazs_id 
           OR p.master_brand_id = v_haagen_dazs_id
    );
    
    -- Delete all claims related to Häagen-Dazs (brand-level and product-level)
    DELETE FROM claims 
    WHERE master_brand_id = v_haagen_dazs_id
       OR id IN (
           SELECT c.id FROM claims c
           JOIN claim_products cp ON c.id = cp.claim_id
           JOIN products p ON cp.product_id = p.id
           WHERE p.master_brand_id = v_haagen_dazs_id
       );
    
    -- Delete products under Häagen-Dazs
    DELETE FROM products 
    WHERE master_brand_id = v_haagen_dazs_id;

    -- Create some key ingredients for ingredient-level claims
    INSERT INTO ingredients (name, description)
    VALUES ('Vanilla', 'Natural vanilla flavoring')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_vanilla_ingredient_id;

    INSERT INTO ingredients (name, description)
    VALUES ('Belgian Chocolate', 'Premium Belgian chocolate')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_belgian_chocolate_ingredient_id;

    INSERT INTO ingredients (name, description)
    VALUES ('Strawberry', 'Real strawberry pieces and flavoring')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_strawberry_ingredient_id;

    INSERT INTO ingredients (name, description)
    VALUES ('Real Fruit', 'Various real fruit ingredients')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_fruit_ingredient_id;

    -- Helper function to create a claim with multiple countries
    -- Add General Brand-Level Claims
    
    -- Quality Claims (Priority 1 for UK)
    v_country_codes := ARRAY['UK'];
    
    -- Insert claim for High quality
    -- Note: Using deprecated country_code field for compatibility with current API
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('High quality', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 1 for UK', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    -- Add country associations
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Premium claim
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Premium', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 1 for UK', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Global disallowed claims
    v_country_codes := ARRAY['UK', 'US', 'FR', 'DE', 'ES', 'IT'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Unsubstantiated "best" or comparative quality claims', 'disallowed', 'brand', v_haagen_dazs_id, 'Cannot be used', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('100% natural', 'disallowed', 'brand', v_haagen_dazs_id, 'Cannot be used', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Dairy Base - Cream Claims
    v_country_codes := ARRAY['UK'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Made with Fresh Cream', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 1 for UK', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Made with Pure Cream', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 1 for UK', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Made with Real Cream - Not for France
    v_country_codes := ARRAY['UK', 'US', 'DE', 'ES', 'IT'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Made with Real Cream', 'allowed', 'brand', v_haagen_dazs_id, 'Not approved for France', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Texture Claims (Priority 2 for UK)
    v_country_codes := ARRAY['UK'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Smooth', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 2 - Texture more appealing than indulgent', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Rich', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 2', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Creamy', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 2', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Ingredient Simplicity Claims
    v_country_codes := ARRAY['UK', 'US', 'FR', 'DE', 'ES', 'IT'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Starts with five simple ingredients', 'allowed', 'brand', v_haagen_dazs_id, 'Cream, milk, sugar, eggs and water', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Free-from Claims (Priority 3 for UK)
    v_country_codes := ARRAY['UK'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('No artificial flavours', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 3', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('No colours', 'allowed', 'brand', v_haagen_dazs_id, 'Priority 3', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Heritage Claims
    v_country_codes := ARRAY['UK', 'US', 'FR', 'DE', 'ES', 'IT'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Over 65 years of experience', 'allowed', 'brand', v_haagen_dazs_id, 'Nice to have', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Established since 1960', 'allowed', 'brand', v_haagen_dazs_id, 'Nice to have', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    -- Now let's add some key products with specific claims
    
    -- Vanilla Ice Cream with Madagascar vanilla claim
    INSERT INTO products (name, description, master_brand_id, created_at, updated_at)
    VALUES ('Häagen-Dazs Vanilla Ice Cream 460 ml', 'SKU: 3415581101928', v_haagen_dazs_id, NOW(), NOW())
    RETURNING id INTO v_product_id;

    IF v_product_id IS NOT NULL THEN
        v_country_codes := ARRAY['UK', 'US', 'FR', 'DE', 'ES', 'IT'];
        
        -- Insert product-level claim with product_id in legacy column
        INSERT INTO claims (claim_text, claim_type, level, product_id, description, created_by, country_code)
        VALUES ('Made with Madagascan Vanilla Beans', 'allowed', 'product', v_product_id, 'Origin claim for vanilla', auth.uid(), '__GLOBAL__')
        RETURNING id INTO v_claim_id;
        
        -- Add to junction table
        INSERT INTO claim_products (claim_id, product_id) VALUES (v_claim_id, v_product_id);
        
        -- Add country associations
        FOREACH v_country_code IN ARRAY v_country_codes
        LOOP
            INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
        END LOOP;

        -- No emulsifiers claim
        INSERT INTO claims (claim_text, claim_type, level, product_id, description, created_by, country_code)
        VALUES ('No emulsifiers', 'allowed', 'product', v_product_id, 'Product-specific claim', auth.uid(), '__GLOBAL__')
        RETURNING id INTO v_claim_id;
        
        INSERT INTO claim_products (claim_id, product_id) VALUES (v_claim_id, v_product_id);
        
        FOREACH v_country_code IN ARRAY v_country_codes
        LOOP
            INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
        END LOOP;

        -- No stabilisers claim
        INSERT INTO claims (claim_text, claim_type, level, product_id, description, created_by, country_code)
        VALUES ('No stabilisers', 'allowed', 'product', v_product_id, 'Product-specific claim', auth.uid(), '__GLOBAL__')
        RETURNING id INTO v_claim_id;
        
        INSERT INTO claim_products (claim_id, product_id) VALUES (v_claim_id, v_product_id);
        
        FOREACH v_country_code IN ARRAY v_country_codes
        LOOP
            INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
        END LOOP;
    END IF;

    -- Belgian Chocolate Ice Cream
    INSERT INTO products (name, description, master_brand_id, created_at, updated_at)
    VALUES ('Häagen-Dazs Belgian Chocolate Ice Cream 460 ml', 'SKU: 3415581113921', v_haagen_dazs_id, NOW(), NOW())
    RETURNING id INTO v_product_id;

    IF v_product_id IS NOT NULL THEN
        -- Real Belgian Chocolate - Not for France
        v_country_codes := ARRAY['UK', 'US', 'DE', 'ES', 'IT'];
        
        INSERT INTO claims (claim_text, claim_type, level, product_id, description, created_by, country_code)
        VALUES ('Real Belgian Chocolate', 'allowed', 'product', v_product_id, 'Not approved for France', auth.uid(), '__GLOBAL__')
        RETURNING id INTO v_claim_id;
        
        INSERT INTO claim_products (claim_id, product_id) VALUES (v_claim_id, v_product_id);
        
        FOREACH v_country_code IN ARRAY v_country_codes
        LOOP
            INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
        END LOOP;
    END IF;

    -- Strawberries & Cream Ice Cream
    INSERT INTO products (name, description, master_brand_id, created_at, updated_at)
    VALUES ('Häagen-Dazs Strawberries & Cream Ice Cream 460 ml', 'SKU: 3415581105926', v_haagen_dazs_id, NOW(), NOW())
    RETURNING id INTO v_product_id;

    IF v_product_id IS NOT NULL THEN
        -- Real Strawberry - Not for France
        v_country_codes := ARRAY['UK', 'US', 'DE', 'ES', 'IT'];
        
        INSERT INTO claims (claim_text, claim_type, level, product_id, description, created_by, country_code)
        VALUES ('Real Strawberry', 'allowed', 'product', v_product_id, 'Not approved for France', auth.uid(), '__GLOBAL__')
        RETURNING id INTO v_claim_id;
        
        INSERT INTO claim_products (claim_id, product_id) VALUES (v_claim_id, v_product_id);
        
        FOREACH v_country_code IN ARRAY v_country_codes
        LOOP
            INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
        END LOOP;
    END IF;

    -- Add multiple fruit products that can use "Real Fruit" claim
    -- Mango & Raspberry
    INSERT INTO products (name, description, master_brand_id, created_at, updated_at)
    VALUES ('Häagen-Dazs Mango & Raspberry Ice Cream 460 ml', 'SKU: 3415581165920', v_haagen_dazs_id, NOW(), NOW())
    RETURNING id INTO v_product_id;

    -- Store first product ID for Real Fruit claim
    DECLARE
        v_fruit_product_ids UUID[] := ARRAY[]::UUID[];
        v_fruit_product_id UUID;
    BEGIN
        IF v_product_id IS NOT NULL THEN
            v_fruit_product_ids := array_append(v_fruit_product_ids, v_product_id);
        END IF;

        -- Blueberries & Cream
        INSERT INTO products (name, description, master_brand_id, created_at, updated_at)
        VALUES ('Häagen-Dazs Blueberries & Cream Ice Cream Tub 460 ml', 'SKU: 3415584409922', v_haagen_dazs_id, NOW(), NOW())
        RETURNING id INTO v_product_id;

        IF v_product_id IS NOT NULL THEN
            v_fruit_product_ids := array_append(v_fruit_product_ids, v_product_id);
        END IF;

        -- Create a "Real Fruit" claim for each fruit product
        v_country_codes := ARRAY['UK', 'US', 'FR', 'DE', 'ES', 'IT'];
        
        FOREACH v_fruit_product_id IN ARRAY v_fruit_product_ids
        LOOP
            -- Use the first product ID for the legacy column
            INSERT INTO claims (claim_text, claim_type, level, product_id, description, created_by, country_code)
            VALUES ('Real Fruit', 'allowed', 'product', v_fruit_product_id, 'Applies to fruit-flavored products', auth.uid(), '__GLOBAL__')
            RETURNING id INTO v_claim_id;
            
            -- Add to junction table
            INSERT INTO claim_products (claim_id, product_id) VALUES (v_claim_id, v_fruit_product_id);
            
            -- Add country associations
            FOREACH v_country_code IN ARRAY v_country_codes
            LOOP
                INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
            END LOOP;
        END LOOP;
    END;

    -- Add all remaining Pint/Tub products
    INSERT INTO products (name, description, master_brand_id, created_at, updated_at)
    VALUES 
    -- Pint products already added above: Vanilla, Belgian Chocolate, Strawberries & Cream, Mango & Raspberry, Blueberries & Cream
    -- Additional Pint products
    ('Häagen-Dazs Salted Caramel Ice Cream 460 ml', 'SKU: 3415581111927', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Cookies & Cream Ice Cream 460 ml', 'SKU: 3415581103922', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Pralines & Cream Ice Cream 460 ml', 'SKU: 3415581107920', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Macadamia Nut Brittle Ice Cream 460 ml', 'SKU: 3415581109924', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Peanut Butter Crunch Ice Cream 460 ml', 'SKU: 3415584405924', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Dulce De Leche Ice Cream Tub 460 ml', 'SKU: 3415584407928', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Coffee Ice Cream Tub 460 ml', 'SKU: 3415584463922', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Peaches & Cream Ice Cream Tub 460 ml', 'SKU: 3415584411925', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Raspberry & Cream Ice Cream 460 ml', 'SKU: 3415587609921', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Cherry & Cream Ice Cream 460 ml', 'SKU: 3415587539020', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Coconut & Caramel Ice Cream 460 ml', 'SKU: 3415587543027', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Green Tea Ice Cream 460 ml', 'SKU: 3415587591929', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Banana & Caramel Ice Cream 460 ml', 'SKU: 3415587613928', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Caramel Biscuit & Cream Ice Cream 460 ml', 'SKU: 3415587749923', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Roasted Almond & Cream Ice Cream 460 ml', 'SKU: 3415587619920', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Baileys® Irish Cream Brownie Ice Cream 460 ml', 'SKU: 3415587627925', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Speculoos Ice Cream 460 ml', 'SKU: 3415587729925', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Passion Fruit & Mango Ice Cream 460 ml', 'SKU: 3415587915925', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Lemon & Strawberry Ice Cream 460 ml', 'SKU: 3415587743921', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Chocolate & Hazelnut Ice Cream 460 ml', 'SKU: 3415587635920', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Double Chocolate & Caramel Ice Cream 460 ml', 'SKU: 3415587631922', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs White Chocolate & Raspberry Ice Cream 460 ml', 'SKU: 3415587643925', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Brownie & Cookie Dough Ice Cream 460 ml', 'SKU: 3415587623927', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Tiramisu Ice Cream 460 ml', 'SKU: 3415587639928', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Chocolate Choc Almond Ice Cream 460 ml', 'SKU: 3415587883923', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Strawberry Cheesecake Ice Cream Tub 460 ml', 'SKU: 3415587769921', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Vanilla Caramel Brownie Ice Cream Tub 460 ml', 'SKU: 3415587765923', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Salted Caramel Cheesecake Ice Cream Tub 460 ml', 'SKU: 3415587777926', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Duo Vanilla & Caramel Ice Cream Tub 420 ml', 'SKU: 3415587783927', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Duo Strawberry & Cream Ice Cream Tub 420 ml', 'SKU: 3415587791922', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Duo Belgian Chocolate & Vanilla Ice Cream Tub 420 ml', 'SKU: 3415587787925', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Mini Pot Vanilla 95 ml', 'SKU: 3415581451009', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Mini Pot Belgian Chocolate 95 ml', 'SKU: 3415581453003', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Mini Pot Strawberries & Cream 95 ml', 'SKU: 3415581455007', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Mini Pot Salted Caramel 95 ml', 'SKU: 3415587851005', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Cookies & Cream 95 ml', 'SKU: 3415581463002', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Macadamia Nut Brittle 95 ml', 'SKU: 3415581457001', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Mini Pot Collection 4×95 ml', 'SKU: 3415581201009', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Minicup Vanilla & Cream Collection 4×95 ml', 'SKU: 3415587993009', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Minicup Caramel Collection 4×95 ml', 'SKU: 3415587955006', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Minicup Vanilla Caramel Brownie 4×95 ml', 'SKU: 3415587999001', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Minicup Caramel & Strawberry Collection 4×95 ml', 'SKU: 3415587977008', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Minicup Double Collection 4×95 ml', 'SKU: 3415587979002', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Minicup Fruity Collection 4×95 ml', 'SKU: 3415587989002', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Caramel & Nuts Collection 4×95 ml', 'SKU: 3415587907005', v_haagen_dazs_id, NOW(), NOW());

    -- Add Stick products
    INSERT INTO products (name, description, master_brand_id, created_at, updated_at)
    VALUES 
    ('Häagen-Dazs Chunky Salted Caramel Ice Cream Sticks 3×80 ml', 'SKU: 3415587547027', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Crunchy Cookies & Cream Ice Cream Sticks 3×80 ml', 'SKU: 3415587545023', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Cracking Macadamia Nut Brittle Ice Cream Sticks 3×80 ml', 'SKU: 3415587541025', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Belgian Chocolate & Almond Ice Cream Sticks 3×80 ml', 'SKU: 3415587595022', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Vanilla Caramel & Almond Ice Cream Sticks 3×80 ml', 'SKU: 3415587591024', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Strawberries & Cream Ice Cream Sticks 3×80 ml', 'SKU: 3415587597026', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Häagen-Dazs Assorted Ice Cream Sticks 4×55 ml', 'SKU: 3415581305005', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Classic Belgian Chocolate & Almond Stick 75 ml', 'SKU: 3415587201073', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Classic Vanilla & Caramel Almond Stick 75 ml', 'SKU: 3415587203077', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Classic Strawberries & Cream Stick 75 ml', 'SKU: 3415587205071', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Crispy Crunchy Creamy Vanilla & Cream Ice Cream Sandwich 103 ml', 'SKU: 3415587563104', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Crispy Crunchy Creamy Chocolate & Vanilla Ice Cream Sandwich 103 ml', 'SKU: 3415587565108', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Strawberry Vanilla Waffle Cone Ice Cream 120 ml', 'SKU: 3415585515122', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Caramel Vanilla Waffle Cone Ice Cream 120 ml', 'SKU: 3415585519120', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Cookies & Cream Waffle Cone Ice Cream 120 ml', 'SKU: 3415585517126', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Vanilla & Almond Waffle Cone Ice Cream 110 ml', 'SKU: 3415585511124', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Belgian Chocolate & Almond Waffle Cone Ice Cream 110 ml', 'SKU: 3415585513128', v_haagen_dazs_id, NOW(), NOW()),
    ('Häagen-Dazs Double Caramel Waffle Cone Ice Cream 110 ml', 'SKU: 3415585521123', v_haagen_dazs_id, NOW(), NOW());

    -- Create product-ingredient associations
    -- We need to link ingredients to products based on their names/descriptions
    
    -- Link vanilla to all vanilla-containing products
    IF v_vanilla_ingredient_id IS NOT NULL THEN
        INSERT INTO product_ingredients (product_id, ingredient_id)
        SELECT p.id, v_vanilla_ingredient_id
        FROM products p
        WHERE p.master_brand_id = v_haagen_dazs_id
        AND (
            p.name ILIKE '%vanilla%'
            OR p.name = 'Häagen-Dazs Pralines & Cream Ice Cream 460 ml'
            OR p.name = 'Häagen-Dazs Cookies & Cream Ice Cream 460 ml'
            OR p.name = 'Häagen-Dazs Dulce De Leche Ice Cream Tub 460 ml'
            OR p.name = 'Häagen-Dazs Tiramisu Ice Cream 460 ml'
            OR p.name ILIKE '%Duo%'
            OR p.name ILIKE '%Collection%'
        )
        ON CONFLICT (product_id, ingredient_id) DO NOTHING;
    END IF;

    -- Link Belgian chocolate to all chocolate-containing products
    IF v_belgian_chocolate_ingredient_id IS NOT NULL THEN
        INSERT INTO product_ingredients (product_id, ingredient_id)
        SELECT p.id, v_belgian_chocolate_ingredient_id
        FROM products p
        WHERE p.master_brand_id = v_haagen_dazs_id
        AND (
            p.name ILIKE '%chocolate%'
            OR p.name ILIKE '%brownie%'
            OR p.name ILIKE '%tiramisu%'
        )
        ON CONFLICT (product_id, ingredient_id) DO NOTHING;
    END IF;

    -- Link strawberry to all strawberry-containing products
    IF v_strawberry_ingredient_id IS NOT NULL THEN
        INSERT INTO product_ingredients (product_id, ingredient_id)
        SELECT p.id, v_strawberry_ingredient_id
        FROM products p
        WHERE p.master_brand_id = v_haagen_dazs_id
        AND p.name ILIKE '%strawberr%'
        ON CONFLICT (product_id, ingredient_id) DO NOTHING;
    END IF;

    -- Link real fruit to all fruit-containing products
    IF v_fruit_ingredient_id IS NOT NULL THEN
        INSERT INTO product_ingredients (product_id, ingredient_id)
        SELECT p.id, v_fruit_ingredient_id
        FROM products p
        WHERE p.master_brand_id = v_haagen_dazs_id
        AND (
            p.name ILIKE '%strawberr%'
            OR p.name ILIKE '%raspberry%'
            OR p.name ILIKE '%mango%'
            OR p.name ILIKE '%blueberr%'
            OR p.name ILIKE '%peach%'
            OR p.name ILIKE '%cherry%'
            OR p.name ILIKE '%passion fruit%'
            OR p.name ILIKE '%lemon%'
            OR p.name ILIKE '%banana%'
            OR p.name ILIKE '%fruity%'
        )
        ON CONFLICT (product_id, ingredient_id) DO NOTHING;
    END IF;

    -- Create additional ingredients and link them
    DECLARE
        v_caramel_ingredient_id UUID;
        v_cream_ingredient_id UUID;
        v_nuts_ingredient_id UUID;
        v_coffee_ingredient_id UUID;
    BEGIN
        -- Add more ingredients
        INSERT INTO ingredients (name, description)
        VALUES ('Caramel', 'Rich caramel sauce and flavoring')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_caramel_ingredient_id;

        INSERT INTO ingredients (name, description)
        VALUES ('Fresh Cream', 'Pure dairy cream')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_cream_ingredient_id;

        INSERT INTO ingredients (name, description)
        VALUES ('Premium Nuts', 'Various premium nuts including almonds, macadamia, peanuts')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_nuts_ingredient_id;

        INSERT INTO ingredients (name, description)
        VALUES ('Coffee', 'Premium coffee extract')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_coffee_ingredient_id;

        -- Link caramel to caramel products
        IF v_caramel_ingredient_id IS NOT NULL THEN
            INSERT INTO product_ingredients (product_id, ingredient_id)
            SELECT p.id, v_caramel_ingredient_id
            FROM products p
            WHERE p.master_brand_id = v_haagen_dazs_id
            AND p.name ILIKE '%caramel%'
            ON CONFLICT (product_id, ingredient_id) DO NOTHING;
        END IF;

        -- Link cream to all products (it's a base ingredient)
        IF v_cream_ingredient_id IS NOT NULL THEN
            INSERT INTO product_ingredients (product_id, ingredient_id)
            SELECT p.id, v_cream_ingredient_id
            FROM products p
            WHERE p.master_brand_id = v_haagen_dazs_id
            ON CONFLICT (product_id, ingredient_id) DO NOTHING;
        END IF;

        -- Link nuts to nut-containing products
        IF v_nuts_ingredient_id IS NOT NULL THEN
            INSERT INTO product_ingredients (product_id, ingredient_id)
            SELECT p.id, v_nuts_ingredient_id
            FROM products p
            WHERE p.master_brand_id = v_haagen_dazs_id
            AND (
                p.name ILIKE '%almond%'
                OR p.name ILIKE '%macadamia%'
                OR p.name ILIKE '%peanut%'
                OR p.name ILIKE '%praline%'
                OR p.name ILIKE '%nut%'
            )
            ON CONFLICT (product_id, ingredient_id) DO NOTHING;
        END IF;

        -- Link coffee to coffee products
        IF v_coffee_ingredient_id IS NOT NULL THEN
            INSERT INTO product_ingredients (product_id, ingredient_id)
            SELECT p.id, v_coffee_ingredient_id
            FROM products p
            WHERE p.master_brand_id = v_haagen_dazs_id
            AND (
                p.name ILIKE '%coffee%'
                OR p.name ILIKE '%tiramisu%'
            )
            ON CONFLICT (product_id, ingredient_id) DO NOTHING;
        END IF;
    END;

    -- Ingredient-level claims that apply across products
    -- Vanilla ingredient claim
    IF v_vanilla_ingredient_id IS NOT NULL THEN
        v_country_codes := ARRAY['UK', 'US', 'FR', 'DE', 'ES', 'IT'];
        
        INSERT INTO claims (claim_text, claim_type, level, ingredient_id, description, created_by, country_code)
        VALUES ('Natural vanilla flavoring', 'allowed', 'ingredient', v_vanilla_ingredient_id, 'Applies to all products containing vanilla', auth.uid(), '__GLOBAL__')
        RETURNING id INTO v_claim_id;
        
        -- Add to junction table
        INSERT INTO claim_ingredients (claim_id, ingredient_id) VALUES (v_claim_id, v_vanilla_ingredient_id);
        
        -- Add country associations
        FOREACH v_country_code IN ARRAY v_country_codes
        LOOP
            INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
        END LOOP;
    END IF;

    -- Belgian Chocolate ingredient claim
    IF v_belgian_chocolate_ingredient_id IS NOT NULL THEN
        v_country_codes := ARRAY['UK', 'US', 'DE', 'ES', 'IT']; -- Not France
        
        INSERT INTO claims (claim_text, claim_type, level, ingredient_id, description, created_by, country_code)
        VALUES ('Made with real Belgian chocolate', 'allowed', 'ingredient', v_belgian_chocolate_ingredient_id, 'Not approved for France', auth.uid(), '__GLOBAL__')
        RETURNING id INTO v_claim_id;
        
        -- Add to junction table
        INSERT INTO claim_ingredients (claim_id, ingredient_id) VALUES (v_claim_id, v_belgian_chocolate_ingredient_id);
        
        -- Add country associations
        FOREACH v_country_code IN ARRAY v_country_codes
        LOOP
            INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
        END LOOP;
    END IF;

    -- Add consumption guidance claims at brand level
    v_country_codes := ARRAY['UK', 'US', 'FR', 'DE', 'ES', 'IT'];
    
    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Leave out of freezer for 10–15 minutes for best results', 'allowed', 'brand', v_haagen_dazs_id, 'For Pint format', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

    INSERT INTO claims (claim_text, claim_type, level, master_brand_id, description, created_by, country_code)
    VALUES ('Leave out of freezer for 5–10 minutes for best results', 'allowed', 'brand', v_haagen_dazs_id, 'For Minicups and Sticks formats', auth.uid(), '__GLOBAL__')
    RETURNING id INTO v_claim_id;
    
    FOREACH v_country_code IN ARRAY v_country_codes
    LOOP
        INSERT INTO claim_countries (claim_id, country_code) VALUES (v_claim_id, v_country_code);
    END LOOP;

END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_claims_master_brand_id ON claims(master_brand_id);
CREATE INDEX IF NOT EXISTS idx_claim_products_product_id ON claim_products(product_id);
CREATE INDEX IF NOT EXISTS idx_claim_products_claim_id ON claim_products(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_ingredients_ingredient_id ON claim_ingredients(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_claim_ingredients_claim_id ON claim_ingredients(claim_id);
CREATE INDEX IF NOT EXISTS idx_products_master_brand_id ON products(master_brand_id);

-- Add comments for documentation
COMMENT ON COLUMN claims.claim_type IS 'allowed: Can be used freely, disallowed: Cannot be used, conditional: Has specific conditions, mandatory: Must be included';
COMMENT ON COLUMN claims.level IS 'brand: Applies to entire brand, product: Specific to a product/SKU, ingredient: Specific to an ingredient';
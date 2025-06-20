-- Add product-ingredient associations for Häagen-Dazs products
-- This migration populates the product_ingredients junction table

-- First, let's create a temporary table with the product-ingredient mappings
CREATE TEMP TABLE temp_product_ingredients AS
SELECT * FROM (VALUES
    -- Vanilla Bean Ice Cream
    ('Vanilla Bean Ice Cream 460ml/406g', ARRAY['Milk fat and milk solids', 'Sugar', 'Concentrated skim milk', 'Egg yolk', 'Vanilla extract']),
    
    -- Belgian Chocolate Ice Cream
    ('Belgian Chocolate Ice Cream 460ml/392g', ARRAY['Milk fat and milk solids', 'Sugar', 'Cocoa powder processed with alkali', 'Egg yolk']),
    
    -- Strawberry Ice Cream
    ('Strawberry Ice Cream 460ml/406g', ARRAY['Milk fat and milk solids', 'Sugar', 'Strawberries', 'Egg yolk', 'Natural flavor']),
    
    -- Vanilla Caramel Brownie Ice Cream
    ('Vanilla Caramel Brownie Ice Cream 460ml/418g', ARRAY['Milk fat and milk solids', 'Sugar', 'Wheat flour', 'Eggs', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Vanilla extract', 'Natural flavor']),
    
    -- Raspberry & Cream Ice Cream
    ('Raspberry & Cream Ice Cream 460ml/420g', ARRAY['Milk fat and milk solids', 'Sugar', 'Raspberry puree', 'Natural flavor', 'Beet juice concentrate']),
    
    -- Salted Caramel Ice Cream
    ('Salted Caramel Ice Cream 460ml/427g', ARRAY['Milk fat and milk solids', 'Sugar', 'Egg yolk', 'Sea salt', 'Vanilla extract', 'Natural flavor']),
    
    -- Macadamia Nut Brittle Ice Cream
    ('Macadamia Nut Brittle Ice Cream 460ml/430g', ARRAY['Milk fat and milk solids', 'Sugar', 'Macadamia nuts', 'Butter', 'Egg yolk', 'Vanilla extract', 'Natural flavor']),
    
    -- Mango & Raspberry Ice Cream
    ('Mango & Raspberry Ice Cream 460ml/414g', ARRAY['Milk fat and milk solids', 'Sugar', 'Mango puree', 'Raspberry puree', 'Natural flavor', 'Turmeric']),
    
    -- Cookies & Cream Ice Cream
    ('Cookies & Cream Ice Cream 460ml/429g', ARRAY['Milk fat and milk solids', 'Sugar', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Egg yolk', 'Natural flavor']),
    
    -- Vanilla Swiss Almond Ice Cream
    ('Vanilla Swiss Almond Ice Cream 460ml/428g', ARRAY['Milk fat and milk solids', 'Sugar', 'Roasted almonds', 'Cocoa powder processed with alkali', 'Egg yolk', 'Vanilla extract']),
    
    -- Coffee Ice Cream
    ('Coffee Ice Cream 460ml/416g', ARRAY['Milk fat and milk solids', 'Sugar', 'Egg yolk', 'Coffee', 'Natural flavor']),
    
    -- Chocolate Choc Almond Ice Cream Bar
    ('Chocolate Choc Almond Ice Cream Bar 3pk', ARRAY['Milk fat and milk solids', 'Sugar', 'Cocoa powder processed with alkali', 'Roasted almonds', 'Vegetable oil', 'Egg yolk']),
    
    -- Vanilla Caramel Almond Ice Cream Bar
    ('Vanilla Caramel Almond Ice Cream Bar 3pk', ARRAY['Milk fat and milk solids', 'Sugar', 'Roasted almonds', 'Vegetable oil', 'Vanilla extract', 'Natural flavor']),
    
    -- Cookies & Cream Ice Cream Bar
    ('Cookies & Cream Ice Cream Bar 3pk', ARRAY['Milk fat and milk solids', 'Sugar', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Egg yolk', 'Natural flavor']),
    
    -- Salted Caramel Ice Cream Bar
    ('Salted Caramel Ice Cream Bar 3pk', ARRAY['Milk fat and milk solids', 'Sugar', 'Vegetable oil', 'Egg yolk', 'Sea salt', 'Vanilla extract', 'Natural flavor']),
    
    -- Macadamia Nut Brittle Ice Cream Bar
    ('Macadamia Nut Brittle Ice Cream Bar 3pk', ARRAY['Milk fat and milk solids', 'Sugar', 'Vegetable oil', 'Macadamia nuts', 'Butter', 'Egg yolk', 'Vanilla extract', 'Natural flavor']),
    
    -- Raspberry & Cream Ice Cream Bar
    ('Raspberry & Cream Ice Cream Bar 3pk', ARRAY['Milk fat and milk solids', 'Sugar', 'Vegetable oil', 'Raspberry puree', 'Natural flavor', 'Beet juice concentrate']),
    
    -- Vanilla Ice Cream
    ('Vanilla Ice Cream 950ml/840g', ARRAY['Milk fat and milk solids', 'Sugar', 'Concentrated skim milk', 'Egg yolk', 'Vanilla extract']),
    
    -- Belgian Chocolate Ice Cream
    ('Belgian Chocolate Ice Cream 950ml/810g', ARRAY['Milk fat and milk solids', 'Sugar', 'Cocoa powder processed with alkali', 'Egg yolk']),
    
    -- Cookies & Cream Ice Cream
    ('Cookies & Cream Ice Cream 950ml/890g', ARRAY['Milk fat and milk solids', 'Sugar', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Egg yolk', 'Natural flavor']),
    
    -- Coffee Ice Cream
    ('Coffee Ice Cream 950ml/860g', ARRAY['Milk fat and milk solids', 'Sugar', 'Egg yolk', 'Coffee', 'Natural flavor']),
    
    -- Vanilla Toffee Crunch Ice Cream
    ('Vanilla Toffee Crunch Ice Cream 950ml/886g', ARRAY['Milk fat and milk solids', 'Sugar', 'Butter', 'Almonds', 'Egg yolk', 'Vanilla extract', 'Natural flavor']),
    
    -- Mango & Raspberry Ice Cream
    ('Mango & Raspberry Ice Cream 950ml/858g', ARRAY['Milk fat and milk solids', 'Sugar', 'Mango puree', 'Raspberry puree', 'Natural flavor', 'Turmeric']),
    
    -- Summer Berries & Cream Ice Cream
    ('Summer Berries & Cream Ice Cream 950ml/862g', ARRAY['Milk fat and milk solids', 'Sugar', 'Strawberries', 'Blueberries', 'Blackberries', 'Egg yolk', 'Natural flavor']),
    
    -- Vanilla Ice Cream
    ('Vanilla Ice Cream 100ml/88g', ARRAY['Milk fat and milk solids', 'Sugar', 'Concentrated skim milk', 'Egg yolk', 'Vanilla extract']),
    
    -- Belgian Chocolate Ice Cream
    ('Belgian Chocolate Ice Cream 100ml/85g', ARRAY['Milk fat and milk solids', 'Sugar', 'Cocoa powder processed with alkali', 'Egg yolk']),
    
    -- Strawberry Ice Cream
    ('Strawberry Ice Cream 100ml/88g', ARRAY['Milk fat and milk solids', 'Sugar', 'Strawberries', 'Egg yolk', 'Natural flavor']),
    
    -- Coffee Ice Cream
    ('Coffee Ice Cream 100ml/90g', ARRAY['Milk fat and milk solids', 'Sugar', 'Egg yolk', 'Coffee', 'Natural flavor']),
    
    -- Cookies & Cream Ice Cream
    ('Cookies & Cream Ice Cream 100ml/93g', ARRAY['Milk fat and milk solids', 'Sugar', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Egg yolk', 'Natural flavor']),
    
    -- Macadamia Nut Brittle Ice Cream
    ('Macadamia Nut Brittle Ice Cream 100ml/93g', ARRAY['Milk fat and milk solids', 'Sugar', 'Macadamia nuts', 'Butter', 'Egg yolk', 'Vanilla extract', 'Natural flavor']),
    
    -- Salted Caramel Ice Cream
    ('Salted Caramel Ice Cream 100ml/92g', ARRAY['Milk fat and milk solids', 'Sugar', 'Egg yolk', 'Sea salt', 'Vanilla extract', 'Natural flavor']),
    
    -- Mango & Raspberry Ice Cream
    ('Mango & Raspberry Ice Cream 100ml/90g', ARRAY['Milk fat and milk solids', 'Sugar', 'Mango puree', 'Raspberry puree', 'Natural flavor', 'Turmeric']),
    
    -- Raspberry & Cream Ice Cream
    ('Raspberry & Cream Ice Cream 100ml/91g', ARRAY['Milk fat and milk solids', 'Sugar', 'Raspberry puree', 'Natural flavor', 'Beet juice concentrate']),
    
    -- Vanilla Flavoured Frozen Dessert
    ('Vanilla Flavoured Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Vanilla extract']),
    
    -- Chocolate Flavoured Frozen Dessert
    ('Chocolate Flavoured Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Cocoa powder processed with alkali']),
    
    -- Strawberry Flavoured Frozen Dessert
    ('Strawberry Flavoured Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Strawberry pieces', 'Natural flavor']),
    
    -- Vanilla Choc Brownie Frozen Dessert
    ('Vanilla Choc Brownie Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Vanilla extract']),
    
    -- Caramel Biscuit & Cream Frozen Dessert
    ('Caramel Biscuit & Cream Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Wheat flour', 'Vegetable oil', 'Natural flavor']),
    
    -- Cookies & Cream Frozen Dessert
    ('Cookies & Cream Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali']),
    
    -- Neapolitan Frozen Dessert
    ('Neapolitan Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Strawberry pieces', 'Cocoa powder processed with alkali', 'Vanilla extract']),
    
    -- Berry Vanilla Frozen Dessert
    ('Berry Vanilla Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Mixed berry pieces', 'Vanilla extract', 'Natural flavor']),
    
    -- Mint Choc Chip Frozen Dessert
    ('Mint Choc Chip Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Chocolate chips', 'Natural mint flavor']),
    
    -- Toffee Crunch Frozen Dessert
    ('Toffee Crunch Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Toffee pieces', 'Natural flavor']),
    
    -- Salted Caramel Brownie Frozen Dessert
    ('Salted Caramel Brownie Frozen Dessert 2L', ARRAY['Skim milk', 'Sugar', 'Milk solids', 'Glucose syrup', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Sea salt', 'Natural flavor']),
    
    -- Vanilla Ice Cream Mini Stick Multipack
    ('Vanilla Ice Cream Mini Stick Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Vegetable oil', 'Egg yolk', 'Vanilla extract']),
    
    -- Coffee Ice Cream Mini Stick Multipack
    ('Coffee Ice Cream Mini Stick Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Vegetable oil', 'Egg yolk', 'Coffee', 'Natural flavor']),
    
    -- Vanilla Almond Ice Cream Mini Stick Multipack
    ('Vanilla Almond Ice Cream Mini Stick Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Vegetable oil', 'Roasted almonds', 'Egg yolk', 'Vanilla extract']),
    
    -- Mango Ice Cream Mini Stick Multipack
    ('Mango Ice Cream Mini Stick Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Vegetable oil', 'Mango puree', 'Natural flavor']),
    
    -- Cookies & Cream Ice Cream Mini Cups 4x100ml Multipack
    ('Cookies & Cream Ice Cream Mini Cups 4x100ml Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Wheat flour', 'Vegetable oil', 'Cocoa powder processed with alkali', 'Egg yolk', 'Natural flavor']),
    
    -- Macadamia Nut Brittle Ice Cream Mini Cups 4x100ml Multipack
    ('Macadamia Nut Brittle Ice Cream Mini Cups 4x100ml Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Macadamia nuts', 'Butter', 'Egg yolk', 'Vanilla extract', 'Natural flavor']),
    
    -- Salted Caramel Ice Cream Mini Cups 4x100ml Multipack
    ('Salted Caramel Ice Cream Mini Cups 4x100ml Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Egg yolk', 'Sea salt', 'Vanilla extract', 'Natural flavor']),
    
    -- Strawberry Ice Cream Mini Cups 4x100ml Multipack
    ('Strawberry Ice Cream Mini Cups 4x100ml Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Strawberries', 'Egg yolk', 'Natural flavor']),
    
    -- Assorted Ice Cream Mini Cups 4x100ml Multipack
    ('Assorted Ice Cream Mini Cups 4x100ml Multipack', ARRAY['Milk fat and milk solids', 'Sugar', 'Strawberries', 'Cocoa powder processed with alkali', 'Wheat flour', 'Vegetable oil', 'Egg yolk', 'Vanilla extract', 'Natural flavor']),
    
    -- Plant-Based Vanilla
    ('Plant-Based Vanilla', ARRAY['Oat milk', 'Sugar', 'Coconut oil', 'Vanilla extract', 'Natural flavor']),
    
    -- Plant-Based Belgian Chocolate
    ('Plant-Based Belgian Chocolate', ARRAY['Oat milk', 'Sugar', 'Coconut oil', 'Cocoa powder processed with alkali', 'Natural flavor']),
    
    -- Plant-Based Salted Caramel
    ('Plant-Based Salted Caramel', ARRAY['Oat milk', 'Sugar', 'Coconut oil', 'Sea salt', 'Natural flavor']),
    
    -- Plant-Based Strawberry
    ('Plant-Based Strawberry', ARRAY['Oat milk', 'Sugar', 'Coconut oil', 'Strawberry puree', 'Natural flavor'])
    
) AS t(product_name, ingredients);

-- Now insert the associations
INSERT INTO product_ingredients (product_id, ingredient_id)
SELECT DISTINCT 
    p.id as product_id,
    i.id as ingredient_id
FROM temp_product_ingredients tpi
CROSS JOIN LATERAL unnest(tpi.ingredients) AS ingredient_name
JOIN products p ON p.name = tpi.product_name
JOIN ingredients i ON i.name = ingredient_name
WHERE EXISTS (
    SELECT 1 FROM master_claim_brands mcb 
    WHERE mcb.name = 'Häagen-Dazs' 
    AND p.master_brand_id = mcb.id
)
ON CONFLICT (product_id, ingredient_id) DO NOTHING;

-- Log how many associations were created
DO $$
DECLARE
    v_count integer;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM product_ingredients pi
    JOIN products p ON pi.product_id = p.id
    JOIN master_claim_brands mcb ON p.master_brand_id = mcb.id
    WHERE mcb.name = 'Häagen-Dazs';
    
    RAISE NOTICE 'Created % product-ingredient associations for Häagen-Dazs products', v_count;
END $$;

-- Drop the temporary table
DROP TABLE temp_product_ingredients;
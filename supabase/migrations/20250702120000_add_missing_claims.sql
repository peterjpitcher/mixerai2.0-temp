-- Migration: Add missing claims identified in verification report
-- Date: 2025-07-02
-- Description: Adds missing brand-level claims, product-specific claims, and SKU associations

-- Add missing brand-level claims
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "country_code", 
    "description", 
    "created_at", 
    "updated_at", 
    "master_brand_id",
    "workflow_status",
    "completed_workflow_steps"
) VALUES 
    -- Quality Claims
    (gen_random_uuid(), 'Work with best farms for dairy', 'allowed', 'brand', '__GLOBAL__', 'Priority 1 for UK', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    
    -- Texture Claims
    (gen_random_uuid(), 'Luxurious', 'allowed', 'brand', '__GLOBAL__', 'Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Melts slowly in your mouth', 'allowed', 'brand', '__GLOBAL__', 'Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    
    -- Product Quality
    (gen_random_uuid(), 'Dense, low-air ice cream', 'allowed', 'brand', '__GLOBAL__', 'Descriptive claim about overrun/density', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    
    -- Heritage Claims
    (gen_random_uuid(), 'Driven to be the world''s best ice cream', 'allowed', 'brand', '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Founded by the Mattus family', 'allowed', 'brand', '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    
    -- Craftsmanship Claims
    (gen_random_uuid(), 'Carefully crafted', 'allowed', 'brand', '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Crafted by expert chefs', 'allowed', 'brand', '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Driven for perfection', 'allowed', 'brand', '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}')
ON CONFLICT (id) DO NOTHING;

-- Add specific product claims for Sticks format
-- First, let's add claims for Dark Chocolate Coating
WITH stick_products AS (
    SELECT id FROM products 
    WHERE name IN (
        'Häagen-Dazs Chunky Salted Caramel Ice Cream Sticks 3x80ml',
        'Häagen-Dazs Crunchy Cookies & Cream Ice Cream Sticks 3x80ml',
        'Häagen-Dazs Cracking Macadamia Nut Brittle Ice Cream Sticks 3x80ml'
    ) -- Amber production sticks
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "product_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'Dark Chocolate Coating',
    'allowed',
    'product',
    sp.id,
    '__GLOBAL__',
    'Milk chocolate coating on stick products',
    NOW(),
    NOW(),
    'draft',
    '{}'
FROM stick_products sp
ON CONFLICT (id) DO NOTHING;

-- Add White Chocolate Coating claims for Brigitt production sticks
WITH white_choc_sticks AS (
    SELECT id FROM products 
    WHERE name IN (
        'Häagen-Dazs Peach & Raspberry Ice Cream Sticks 3x80ml',
        'Häagen-Dazs Mango & Passionfruit Ice Cream Sticks 3x80ml'
    ) -- Brigitt production sticks
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "product_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'White Chocolate Coating',
    'allowed',
    'product',
    wcs.id,
    '__GLOBAL__',
    'White chocolate coating on stick products',
    NOW(),
    NOW(),
    'draft',
    '{}'
FROM white_choc_sticks wcs
ON CONFLICT (id) DO NOTHING;

-- Add No Emulsifiers claims for specific products where it's YES
WITH no_emulsifier_products AS (
    SELECT id FROM products 
    WHERE name IN (
        'Häagen-Dazs Fruit Mini Cups Ice Cream 4x95ml',
        'Häagen-Dazs Vanilla Collection Mini Cups Ice Cream 4 x 95ml',
        'Häagen-Dazs Dessert Collection Mini Ice Cream Tubs 4x95ml',
        'Häagen-Dazs Strawberry Cheesecake Ice Cream 460ml',
        'Häagen-Dazs Vanilla Ice Cream 460 ml',
        'Häagen-Dazs Cookies & Cream Ice Cream 386g',
        'Häagen-Dazs Strawberries & Cream Ice Cream 460ml',
        'Häagen-Dazs Pralines & Cream Ice Cream 460ml',
        'Häagen-Dazs Dulce De Leche Ice Cream 460ml',
        'Häagen-Dazs Mango & Raspberry Ice Cream 460ml',
        'Häagen-Dazs Coffee Ice Cream 460ml',
        'Häagen-Dazs Blueberries & Cream Ice Cream Tub 460m',
        'Häagen-Dazs Red Velvet Cheesecake Ice Cream 420ml',
        'Häagen-Dazs Rum & Raisin Ice Cream 420ml'
    )
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "product_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'No emulsifiers',
    'allowed',
    'product',
    nep.id,
    '__GLOBAL__',
    'Product contains no emulsifiers',
    NOW(),
    NOW(),
    'draft',
    '{}'
FROM no_emulsifier_products nep
ON CONFLICT (id) DO NOTHING;

-- Add No added flavours claims for specific products
WITH no_added_flavours_products AS (
    SELECT id FROM products 
    WHERE name IN (
        'Häagen-Dazs Strawberries & Cream Ice Cream 460ml',
        'Häagen-Dazs Coffee Ice Cream 460ml',
        'Häagen-Dazs Limited Edition Pistachio & Cream Ice Cream 420ml',
        'Häagen-Dazs Rum & Raisin Ice Cream 420ml'
    )
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "product_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'No added flavours',
    'allowed',
    'product',
    nafp.id,
    '__GLOBAL__',
    'Product contains no added flavours',
    NOW(),
    NOW(),
    'draft',
    '{}'
FROM no_added_flavours_products nafp
ON CONFLICT (id) DO NOTHING;

-- Add "Real Fruit" claims for additional fruit products
WITH real_fruit_products AS (
    SELECT id FROM products 
    WHERE name IN (
        'Häagen-Dazs Fruit Mini Cups Ice Cream 4x95ml',
        'Häagen-Dazs Peach & Raspberry Ice Cream Sticks 3x80ml',
        'Häagen-Dazs Mango & Passionfruit Ice Cream Sticks 3x80ml'
    )
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "product_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'Real Fruit',
    'allowed',
    'product',
    rfp.id,
    '__GLOBAL__',
    'Made with real fruit',
    NOW(),
    NOW(),
    'draft',
    '{}'
FROM real_fruit_products rfp
ON CONFLICT (id) DO NOTHING;

-- Add specific "No Stabilisers" claims for pre-shield products
WITH no_stabiliser_pre_products AS (
    SELECT id FROM products 
    WHERE name IN (
        'Häagen-Dazs Caramel Mini Cups Ice Cream 4x95ml',
        'Häagen-Dazs Fruit Mini Cups Ice Cream 4x95ml',
        'Häagen-Dazs Vanilla Collection Mini Cups Ice Cream 4 x 95ml',
        'Häagen-Dazs Favourites Mini Cups Ice Cream 4x95ml',
        'Häagen-Dazs Indulgence Collection Mini Ice Cream Tubs 4x95ml',
        'Häagen-Dazs Dessert Collection Mini Ice Cream Tubs 4x95ml',
        'Häagen-Dazs Salted Caramel Ice Cream Multipack 4 x 95 ML',
        'Häagen-Dazs Salted Caramel Ice Cream Minicups 2 x 95M',
        'Häagen-Dazs Salted Caramel Ice Cream 460ml',
        'Häagen-Dazs Strawberry Cheesecake Ice Cream 460ml',
        'Häagen-Dazs Vanilla Ice Cream 460 ml',
        'Häagen-Dazs Belgian Chocolate Ice Cream 460ml',
        'Häagen-Dazs Cookies & Cream Ice Cream 386g',
        'Häagen-Dazs Strawberries & Cream Ice Cream 460ml',
        'Häagen-Dazs Pralines & Cream Ice Cream 460ml',
        'Häagen-Dazs Dulce De Leche Ice Cream 460ml',
        'Häagen-Dazs Mango & Raspberry Ice Cream 460ml',
        'Häagen-Dazs Coffee Ice Cream 460ml',
        'Häagen-Dazs Macadamia Nut Brittle Ice Cream 460ml',
        'Häagen-Dazs Blueberries & Cream Ice Cream Tub 460m',
        'Häagen-Dazs Limited Edition Pistachio & Cream Ice Cream 420ml',
        'Häagen-Dazs Salted Caramel Ice Cream 650 ml',
        'Häagen-Dazs Red Velvet Cheesecake Ice Cream 420ml',
        'Häagen-Dazs Mint Chocolate Ice Cream 420ml',
        'Häagen-Dazs Rum & Raisin Ice Cream 420ml',
        'Häagen-Dazs Peach & Raspberry Ice Cream Sticks 3x80ml',
        'Häagen-Dazs Mango & Passionfruit Ice Cream Sticks 3x80ml'
    )
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "product_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'No stabilisers',
    'allowed',
    'product',
    nsp.id,
    '__GLOBAL__',
    'Pre-shield formulation with no stabilisers',
    NOW(),
    NOW(),
    'draft',
    '{}'
FROM no_stabiliser_pre_products nsp
ON CONFLICT (id) DO NOTHING;

-- Add "Compound Usage" disallowed claims for Amber production sticks
WITH compound_sticks AS (
    SELECT id FROM products 
    WHERE name IN (
        'Häagen-Dazs Chunky Salted Caramel Ice Cream Sticks 3x80ml',
        'Häagen-Dazs Crunchy Cookies & Cream Ice Cream Sticks 3x80ml',
        'Häagen-Dazs Cracking Macadamia Nut Brittle Ice Cream Sticks 3x80ml'
    )
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "product_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'Contains compound coating',
    'disallowed',
    'product',
    cs.id,
    '__GLOBAL__',
    'These products use compound coating, not pure chocolate',
    NOW(),
    NOW(),
    'draft',
    '{}'
FROM compound_sticks cs
ON CONFLICT (id) DO NOTHING;

-- Add missing dietary claims
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "country_code", 
    "description", 
    "created_at", 
    "updated_at", 
    "master_brand_id",
    "workflow_status",
    "completed_workflow_steps"
) VALUES 
    (gen_random_uuid(), 'Suitable for vegetarians', 'allowed', 'brand', '__GLOBAL__', 'Dietary restriction claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Halal', 'allowed', 'brand', '__GLOBAL__', 'Except products containing alcohol', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Kosher', 'allowed', 'brand', '__GLOBAL__', 'Dietary restriction claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}')
ON CONFLICT (id) DO NOTHING;

-- Add specific origin claims
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "country_code", 
    "description", 
    "created_at", 
    "updated_at", 
    "master_brand_id",
    "workflow_status",
    "completed_workflow_steps"
) VALUES 
    (gen_random_uuid(), 'Made with Milk from European farms', 'allowed', 'brand', '__GLOBAL__', 'Origin claim for milk', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}')
ON CONFLICT (id) DO NOTHING;

-- Add additional disallowed claims
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "country_code", 
    "description", 
    "created_at", 
    "updated_at", 
    "master_brand_id",
    "workflow_status",
    "completed_workflow_steps"
) VALUES 
    (gen_random_uuid(), 'All-natural', 'disallowed', 'brand', '__GLOBAL__', 'Cannot use blanket natural claims', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), '100% real cream', 'disallowed', 'brand', '__GLOBAL__', 'Cannot imply only cream used', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'French Cream', 'disallowed', 'brand', '__GLOBAL__', 'Cannot claim French origin for cream', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Fresh milk', 'disallowed', 'brand', '__GLOBAL__', 'Uses condensed skim milk', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'No Palm Oil', 'disallowed', 'brand', '__GLOBAL__', 'Cannot make this claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'No Palm Kernel', 'disallowed', 'brand', '__GLOBAL__', 'Cannot make this claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Made in France', 'disallowed', 'brand', 'FR', 'Cannot claim for French market', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}')
ON CONFLICT (id) DO NOTHING;

-- Add claims for specific ingredient descriptions
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "country_code", 
    "description", 
    "created_at", 
    "updated_at", 
    "master_brand_id",
    "workflow_status",
    "completed_workflow_steps"
) VALUES 
    (gen_random_uuid(), 'Crunchy biscuit pieces', 'allowed', 'brand', '__GLOBAL__', 'When describing ingredient being added to ice cream', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}'),
    (gen_random_uuid(), 'Crunchy cookie pieces', 'allowed', 'brand', '__GLOBAL__', 'When describing ingredient being added to ice cream', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft', '{}')
ON CONFLICT (id) DO NOTHING;
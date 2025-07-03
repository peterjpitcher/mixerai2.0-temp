-- Migration: Complete reset and population of claims data (with proper enum casting)
-- Date: 2025-07-02
-- Description: Clears all existing claims data and repopulates with correct information

-- Start transaction
BEGIN;

-- Clear all existing claims data
DELETE FROM claim_workflow_history;
DELETE FROM claim_reviews;
DELETE FROM claim_countries;
DELETE FROM claim_products;
DELETE FROM claim_ingredients;
DELETE FROM claims;

-- Add brand-level claims from spreadsheet
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
    -- Quality Claims (Priority 1)
    (gen_random_uuid(), 'High quality', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 1 for UK', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Premium', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 1 for UK', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Work with best farms for dairy', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 1 for UK', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Dairy Base Claims (Priority 1)
    (gen_random_uuid(), 'Made with Real Cream', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Not approved for France - Priority 1', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Made with Fresh Cream', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 1', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Made with Pure Cream', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 1', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Made with milk', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Regional approval required', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Texture Claims (Priority 2)
    (gen_random_uuid(), 'Smooth', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Rich', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Luxurious', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Creamy', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Melts slowly in your mouth', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Specific Ingredients Claims (Priority 2)
    (gen_random_uuid(), 'Crunchy', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'When describing biscuit/cookie pieces as ingredient - Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Crunch', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'When describing ingredient being added to Ice Cream - Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Product Quality Claims (Priority 2)
    (gen_random_uuid(), 'Dense, low-air ice cream', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Descriptive claim - Priority 2', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Ingredient Simplicity
    (gen_random_uuid(), 'Starts with five simple ingredients', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cream, milk, sugar, eggs and water', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Dietary Restrictions
    (gen_random_uuid(), 'Suitable for vegetarians', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Dietary claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Suitable for vegans', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'For sorbets only', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Halal', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Except products containing alcohol', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Kosher', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Dietary claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Origin of Ingredient
    (gen_random_uuid(), 'Made with Milk from European farms', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Origin claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- No/No/No Claims (Priority 3)
    (gen_random_uuid(), 'No artificial flavours', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 3', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'No Colours', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Priority 3', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Heritage Claims (Nice to have)
    (gen_random_uuid(), 'Over 65 years of experience', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Driven to be the world''s best ice cream', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Established since 1960', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Founded by the Mattus family', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Craftsmanship Claims (Nice to have)
    (gen_random_uuid(), 'Carefully crafted', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Crafted by expert chefs', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Driven for perfection', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Nice to have', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Temperature Instructions
    (gen_random_uuid(), 'Leave out of freezer for 5–10 minutes for best results', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'For Minicups and Sticks formats', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Leave out of freezer for 10–15 minutes for best results', 'allowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'For Pint format', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}');

-- Add disallowed brand claims
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
    -- Quality
    (gen_random_uuid(), 'Unsubstantiated "best" or comparative quality claims', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot be used', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Real/Natural
    (gen_random_uuid(), '100% natural', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot use blanket natural claims', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'All-natural', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot use blanket natural claims', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Only', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot use exclusive claims', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Dairy Base
    (gen_random_uuid(), '100% real cream', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot imply only cream used', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'French Cream', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot claim French origin', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Fresh milk', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Uses condensed skim milk', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'Unprocessed milk', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Uses condensed skim milk', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Free-from
    (gen_random_uuid(), 'No artificial anything', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Too broad without specifics', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'No Palm Oil', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot make this claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    (gen_random_uuid(), 'No Palm Kernel', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, '__GLOBAL__', 'Cannot make this claim', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}'),
    
    -- Origin
    (gen_random_uuid(), 'Made in France', 'disallowed'::claim_type_enum, 'brand'::claim_level_enum, 'FR', 'Cannot claim for French market', NOW(), NOW(), '27e1cbe2-6792-46a3-a518-c6406933a819', 'draft'::content_status, '{}');

-- Now add product-specific claims based on the spreadsheet
-- First, let's handle the products we can identify from the database

-- Vanilla Ice Cream 460ml (SKU: 3415581101928)
WITH vanilla_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Vanilla Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    vp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM vanilla_product vp
CROSS JOIN (VALUES 
    ('Natural flavour made from Madagascan Vanilla Beans', 'Origin claim'),
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Belgian Chocolate Ice Cream 460ml (SKU: 3415581113921)
WITH belgian_choc_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Belgian Chocolate Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    bcp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM belgian_choc_product bcp
CROSS JOIN (VALUES 
    ('Real Belgian Chocolate', 'Not approved for France'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Strawberries & Cream Ice Cream 460ml (SKU: 3415581105926)
WITH strawberries_cream_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Strawberries & Cream Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    scp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM strawberries_cream_product scp
CROSS JOIN (VALUES 
    ('Real Strawberry', 'Not approved for France'),
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No added flavours', 'Product contains no added flavours')
) AS claims(claim_text, description);

-- Salted Caramel Ice Cream 460ml (SKU: 3415581114928)
WITH salted_caramel_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Salted Caramel Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    scp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM salted_caramel_product scp
CROSS JOIN (VALUES 
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Strawberry Cheesecake Ice Cream 460ml (SKU: 3415581176025)
WITH strawberry_cheesecake_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Strawberry Cheesecake Ice Cream Tub 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    scp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM strawberry_cheesecake_product scp
CROSS JOIN (VALUES 
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Cookies & Cream Ice Cream (SKU: 3415580000000)
WITH cookies_cream_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Cookies & Cream Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    ccp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM cookies_cream_product ccp
CROSS JOIN (VALUES 
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Pralines & Cream Ice Cream 460ml (SKU: 3415581153026)
WITH pralines_cream_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Pralines & Cream Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    pcp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM pralines_cream_product pcp
CROSS JOIN (VALUES 
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Dulce De Leche Ice Cream 460ml (SKU: 3415581162929)
WITH dulce_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Dulce De Leche Ice Cream Tub 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    dp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM dulce_product dp
CROSS JOIN (VALUES 
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Mango & Raspberry Ice Cream 460ml (SKU: 3415581165920)
WITH mango_raspberry_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Mango & Raspberry Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    mrp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM mango_raspberry_product mrp
CROSS JOIN (VALUES 
    ('Real Fruit', 'Made with real fruit'),
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Coffee Ice Cream 460ml (SKU: 3415581103922)
WITH coffee_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Coffee Ice Cream Tub 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    cp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM coffee_product cp
CROSS JOIN (VALUES 
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No added flavours', 'Product contains no added flavours')
) AS claims(claim_text, description);

-- Macadamia Nut Brittle Ice Cream 460ml (SKU: 3415581122022)
WITH macadamia_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Macadamia Nut Brittle Ice Cream 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    mp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM macadamia_product mp
CROSS JOIN (VALUES 
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Blueberries & Cream Ice Cream Tub 460ml (SKU: 3415584409922)
WITH blueberries_product AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Blueberries & Cream Ice Cream Tub 460 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    bp.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM blueberries_product bp
CROSS JOIN (VALUES 
    ('Real Fruit', 'Made with real fruit'),
    ('No emulsifiers', 'Product contains no emulsifiers'),
    ('No colours', 'Product contains no colours'),
    ('No stabilisers', 'Product contains no stabilisers'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Sticks Products - Chunky Salted Caramel (SKU: 3415587547027)
-- Split into separate inserts for allowed and disallowed claims
WITH chunky_caramel_sticks AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Chunky Salted Caramel Ice Cream Sticks 3×80 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    ccs.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM chunky_caramel_sticks ccs
CROSS JOIN (VALUES 
    ('Chocolate Coating on Sticks', 'Milk chocolate coating'),
    ('Dark Chocolate Coating', 'Actually milk chocolate'),
    ('Coated with Belgian Chocolate', 'Belgian chocolate coating'),
    ('No colours', 'Product contains no colours'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Add the disallowed claim separately
WITH chunky_caramel_sticks AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Chunky Salted Caramel Ice Cream Sticks 3×80 ml' LIMIT 1
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
    'disallowed'::claim_type_enum,
    'product'::claim_level_enum,
    ccs.id,
    '__GLOBAL__',
    'Uses compound, not pure chocolate',
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM chunky_caramel_sticks ccs;

-- Sticks Products - Crunchy Cookies & Cream (SKU: 3415587545023)
-- Allowed claims
WITH crunchy_cookies_sticks AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Crunchy Cookies & Cream Ice Cream Sticks 3×80 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    ccs.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM crunchy_cookies_sticks ccs
CROSS JOIN (VALUES 
    ('Chocolate Coating on Sticks', 'Milk chocolate coating'),
    ('Dark Chocolate Coating', 'Actually milk chocolate'),
    ('Coated with Belgian Chocolate and cookie pieces', 'Belgian chocolate coating with cookies'),
    ('No colours', 'Product contains no colours'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Disallowed claim
WITH crunchy_cookies_sticks AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Crunchy Cookies & Cream Ice Cream Sticks 3×80 ml' LIMIT 1
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
    'disallowed'::claim_type_enum,
    'product'::claim_level_enum,
    ccs.id,
    '__GLOBAL__',
    'Uses compound, not pure chocolate',
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM crunchy_cookies_sticks ccs;

-- Sticks Products - Cracking Macadamia Nut Brittle (SKU: 3415587541025)
-- Allowed claims
WITH macadamia_sticks AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Cracking Macadamia Nut Brittle Ice Cream Sticks 3×80 ml' LIMIT 1
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
    claim_text,
    'allowed'::claim_type_enum,
    'product'::claim_level_enum,
    ms.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM macadamia_sticks ms
CROSS JOIN (VALUES 
    ('Chocolate Coating on Sticks', 'Milk chocolate coating'),
    ('Dark Chocolate Coating', 'Actually milk chocolate'),
    ('Coated with Belgian Chocolate and Macadamia nut brittle pieces', 'Belgian chocolate coating with macadamia'),
    ('No colours', 'Product contains no colours'),
    ('No artificial flavours', 'Product contains no artificial flavours')
) AS claims(claim_text, description);

-- Disallowed claim
WITH macadamia_sticks AS (
    SELECT id FROM products WHERE name = 'Häagen-Dazs Cracking Macadamia Nut Brittle Ice Cream Sticks 3×80 ml' LIMIT 1
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
    'disallowed'::claim_type_enum,
    'product'::claim_level_enum,
    ms.id,
    '__GLOBAL__',
    'Uses compound, not pure chocolate',
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM macadamia_sticks ms;

-- Add ingredient-specific claims
-- Belgian Chocolate
WITH belgian_chocolate_ingredient AS (
    SELECT id FROM ingredients WHERE name = 'Belgian Chocolate' LIMIT 1
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "ingredient_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'Made with real Belgian chocolate',
    'allowed'::claim_type_enum,
    'ingredient'::claim_level_enum,
    bci.id,
    '__GLOBAL__',
    'Not approved for France',
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM belgian_chocolate_ingredient bci
WHERE bci.id IS NOT NULL;

-- Vanilla
WITH vanilla_ingredient AS (
    SELECT id FROM ingredients WHERE name = 'Vanilla' LIMIT 1
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "ingredient_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'Natural vanilla flavoring',
    'allowed'::claim_type_enum,
    'ingredient'::claim_level_enum,
    vi.id,
    '__GLOBAL__',
    'Applies to all products containing vanilla',
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM vanilla_ingredient vi
WHERE vi.id IS NOT NULL;

-- Milk
WITH milk_ingredient AS (
    SELECT id FROM ingredients WHERE name = 'Milk' LIMIT 1
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "ingredient_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    claim_text,
    'allowed'::claim_type_enum,
    'ingredient'::claim_level_enum,
    mi.id,
    '__GLOBAL__',
    description,
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM milk_ingredient mi
CROSS JOIN (VALUES 
    ('From European Farms', 'Origin claim'),
    ('Sourced from responsible farmers only', 'Sourcing claim')
) AS claims(claim_text, description)
WHERE mi.id IS NOT NULL;

-- Vanilla Beans
WITH vanilla_beans_ingredient AS (
    SELECT id FROM ingredients WHERE name = 'Vanilla Beans' LIMIT 1
)
INSERT INTO "public"."claims" (
    "id", 
    "claim_text", 
    "claim_type", 
    "level", 
    "ingredient_id",
    "country_code", 
    "description", 
    "created_at", 
    "updated_at",
    "workflow_status",
    "completed_workflow_steps"
)
SELECT 
    gen_random_uuid(),
    'Made with real vanilla beans',
    'allowed'::claim_type_enum,
    'ingredient'::claim_level_enum,
    vbi.id,
    '__GLOBAL__',
    'Natural vanilla bean claim',
    NOW(),
    NOW(),
    'draft'::content_status,
    '{}'
FROM vanilla_beans_ingredient vbi
WHERE vbi.id IS NOT NULL;

-- Create claim_ingredients associations for the ingredient claims we just added
INSERT INTO "public"."claim_ingredients" ("claim_id", "ingredient_id", "created_at")
SELECT c.id, c.ingredient_id, NOW()
FROM claims c
WHERE c.ingredient_id IS NOT NULL
AND c.created_at >= NOW() - INTERVAL '1 minute';

-- Create claim_products associations for the product claims we just added
INSERT INTO "public"."claim_products" ("claim_id", "product_id", "created_at")
SELECT c.id, c.product_id, NOW()
FROM claims c
WHERE c.product_id IS NOT NULL
AND c.created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

-- Verification queries
SELECT 'Total claims added:' as metric, COUNT(*) as count FROM claims WHERE created_at >= NOW() - INTERVAL '5 minutes';
SELECT 'Claims by type:' as metric, claim_type, COUNT(*) as count FROM claims WHERE created_at >= NOW() - INTERVAL '5 minutes' GROUP BY claim_type;
SELECT 'Claims by level:' as metric, level, COUNT(*) as count FROM claims WHERE created_at >= NOW() - INTERVAL '5 minutes' GROUP BY level;
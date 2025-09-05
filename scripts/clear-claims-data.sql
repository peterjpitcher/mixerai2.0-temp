-- ================================================
-- CLAIMS DATA CLEANUP SQL SCRIPT
-- ================================================
-- WARNING: This will permanently delete all claims-related data!
-- 
-- Usage: 
-- 1. First run the SELECT statements to see what will be deleted
-- 2. Then uncomment and run the DELETE statements to actually delete the data
--
-- IMPORTANT: Execute these statements in order due to foreign key constraints

-- ================================================
-- STEP 1: Preview data to be deleted (safe to run)
-- ================================================

-- Check record counts
SELECT 'claim_workflow_history' as table_name, COUNT(*) as record_count FROM claim_workflow_history
UNION ALL
SELECT 'claim_countries', COUNT(*) FROM claim_countries
UNION ALL
SELECT 'claim_ingredients', COUNT(*) FROM claim_ingredients
UNION ALL
SELECT 'claim_products', COUNT(*) FROM claim_products
UNION ALL
SELECT 'market_claim_overrides', COUNT(*) FROM market_claim_overrides
UNION ALL
SELECT 'claims', COUNT(*) FROM claims
UNION ALL
SELECT 'claims_workflow_steps', COUNT(*) FROM claims_workflow_steps
UNION ALL
SELECT 'claims_workflows', COUNT(*) FROM claims_workflows
UNION ALL
SELECT 'claim_reviews', COUNT(*) FROM claim_reviews
UNION ALL
SELECT 'product_ingredients', COUNT(*) FROM product_ingredients
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'ingredients', COUNT(*) FROM ingredients
UNION ALL
SELECT 'brand_master_claim_brands', COUNT(*) FROM brand_master_claim_brands
UNION ALL
SELECT 'master_claim_brands', COUNT(*) FROM master_claim_brands
ORDER BY table_name;

-- ================================================
-- STEP 2: Delete all claims data
-- ================================================
-- UNCOMMENT THE LINES BELOW TO EXECUTE DELETION
-- Run these IN ORDER due to foreign key constraints!

-- -- 1. Delete history and junction tables first
-- DELETE FROM claim_workflow_history;
-- DELETE FROM claim_countries;
-- DELETE FROM claim_ingredients;
-- DELETE FROM claim_products;
-- DELETE FROM market_claim_overrides;

-- -- 2. Delete claims
-- DELETE FROM claims;

-- -- 3. Delete workflow-related tables
-- DELETE FROM claims_workflow_steps;
-- DELETE FROM claims_workflows;

-- -- 4. Delete reviews
-- DELETE FROM claim_reviews;

-- -- 5. Delete product/ingredient relationships
-- DELETE FROM product_ingredients;

-- -- 6. Delete products and ingredients
-- DELETE FROM products;
-- DELETE FROM ingredients;

-- -- 7. Delete brand-master claim relationships
-- DELETE FROM brand_master_claim_brands;

-- -- 8. Finally delete master claim brands
-- DELETE FROM master_claim_brands;

-- ================================================
-- OPTIONAL: Also clear tool run history for the AI tools
-- ================================================
-- DELETE FROM tool_run_history 
-- WHERE tool_name IN ('metadata_generator', 'alt_text_generator', 'content_transcreator');

-- ================================================
-- VERIFICATION: Check that all tables are empty
-- ================================================
-- Run the SELECT count query from Step 1 again to verify all counts are 0
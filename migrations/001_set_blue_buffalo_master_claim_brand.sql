-- Migration to set master_claim_brand_id for 'BLUE Buffalo US' brand.
-- This is to enable the 'Product Claims' section in the UI for users assigned to this brand.

-- Step 1: Find an existing master_claim_brand.
-- Run this query in your database to find available master_claim_brands and their IDs:
-- SELECT id, name FROM master_claim_brands;

-- Step 2: Choose a suitable master_claim_brand_id from the results of Step 1.
-- If no master_claim_brands exist, you will need to create one first before proceeding.

-- Step 3: Update the 'BLUE Buffalo US' brand.
-- Replace 'YOUR_CHOSEN_MASTER_CLAIM_BRAND_ID_HERE' below with the actual ID you chose in Step 2.
-- Then, uncomment and run the UPDATE statement.

-- UPDATE brands
-- SET master_claim_brand_id = 'YOUR_CHOSEN_MASTER_CLAIM_BRAND_ID_HERE' -- <<< Replace this placeholder
-- WHERE name = 'BLUE Buffalo US' AND id = '5f6d803e-71fd-4353-9a07-93b6d0398b8d';

-- After running the update, you can verify the change with:
-- SELECT id, name, master_claim_brand_id FROM brands WHERE id = '5f6d803e-71fd-4353-9a07-93b6d0398b8d';

-- Important: For the UI changes to take effect for the user,
-- they might need to refresh their session (e.g., log out and log back in),
-- or the frontend application might need to refetch user permissions. 
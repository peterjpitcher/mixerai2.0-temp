-- Migration: Add website_urls JSONB to brands and clean up unused profile fields
-- Date: 2024-12-12
-- Description: Adds support for multiple brand URLs and removes unused profile fields

-- 1. Add website_urls JSONB column to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS website_urls JSONB DEFAULT '[]'::jsonb;

-- 2. Migrate existing website_url to the new JSONB array format
UPDATE brands 
SET website_urls = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid()::text,
    'url', website_url,
    'isPrimary', true
  )
)
WHERE website_url IS NOT NULL 
AND website_urls = '[]'::jsonb;

-- 3. Add comment to document the expected structure
COMMENT ON COLUMN brands.website_urls IS 'Array of website URLs with structure: [{id: string, url: string, isPrimary?: boolean}]';

-- 4. Remove unused job_description field from profiles table
ALTER TABLE profiles 
DROP COLUMN IF EXISTS job_description;

-- 5. Check for and document other potentially unused fields in profiles
-- After analysis, these fields appear to be used:
-- - full_name: Used in user management and display
-- - avatar_url: Used for user avatars
-- - email: Used for user identification
-- - job_title: Used in user invite forms
-- - company: Used in user invite forms
-- All fields appear to be in use, so only job_description is removed

-- 6. Add index on brands.website_urls for JSON containment queries if needed
CREATE INDEX IF NOT EXISTS idx_brands_website_urls_gin ON brands USING gin (website_urls);

-- 7. Create a helper function to extract all URLs from a brand
CREATE OR REPLACE FUNCTION get_brand_urls(brand_uuid UUID)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(url_obj->>'url')
  FROM brands,
  LATERAL jsonb_array_elements(COALESCE(website_urls, '[]'::jsonb)) AS url_obj
  WHERE brands.id = brand_uuid;
$$ LANGUAGE SQL STABLE;

-- 8. Note: Removed user_added_agencies update as this column doesn't exist in the schema

-- 9. Add validation constraint for website_urls structure
ALTER TABLE brands 
ADD CONSTRAINT check_website_urls_is_array 
CHECK (jsonb_typeof(website_urls) = 'array');

-- Note: The original website_url column is kept for backward compatibility
-- It can be removed in a future migration after all code is updated
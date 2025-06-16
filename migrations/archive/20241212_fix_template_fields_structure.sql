-- Migration: Standardize content_templates fields structure
-- Date: 2024-12-12
-- Description: Ensures template fields JSONB has consistent structure with inputFields and outputFields

-- 1. Update any templates that have fields stored in an incorrect format
-- This ensures all templates have the expected {inputFields: [], outputFields: []} structure
UPDATE content_templates
SET fields = jsonb_build_object(
  'inputFields', COALESCE(fields->'inputFields', '[]'::jsonb),
  'outputFields', COALESCE(fields->'outputFields', '[]'::jsonb)
)
WHERE fields IS NOT NULL
AND (
  NOT fields ? 'inputFields' 
  OR NOT fields ? 'outputFields'
  OR jsonb_typeof(fields) != 'object'
);

-- 2. Set default for any null fields
UPDATE content_templates
SET fields = '{"inputFields": [], "outputFields": []}'::jsonb
WHERE fields IS NULL;

-- 3. Add constraint to ensure fields always has the correct structure
ALTER TABLE content_templates
DROP CONSTRAINT IF EXISTS check_fields_structure;

ALTER TABLE content_templates
ADD CONSTRAINT check_fields_structure
CHECK (
  fields IS NOT NULL
  AND jsonb_typeof(fields) = 'object'
  AND fields ? 'inputFields'
  AND fields ? 'outputFields'
  AND jsonb_typeof(fields->'inputFields') = 'array'
  AND jsonb_typeof(fields->'outputFields') = 'array'
);

-- 4. Add comment documenting the expected structure
COMMENT ON COLUMN content_templates.fields IS 'Template field definitions with structure: {inputFields: InputField[], outputFields: OutputField[]}';

-- 5. Create helper functions for field management
CREATE OR REPLACE FUNCTION get_template_input_fields(template_uuid UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(fields->'inputFields', '[]'::jsonb)
  FROM content_templates
  WHERE id = template_uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_template_output_fields(template_uuid UUID)
RETURNS JSONB AS $$
  SELECT COALESCE(fields->'outputFields', '[]'::jsonb)
  FROM content_templates
  WHERE id = template_uuid;
$$ LANGUAGE SQL STABLE;

-- 6. Ensure brand_id column is properly indexed for brand-specific template queries
CREATE INDEX IF NOT EXISTS idx_content_templates_brand_id 
ON content_templates(brand_id) 
WHERE brand_id IS NOT NULL;
-- Add brand_summary field to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS brand_summary TEXT;

-- Set auto-generate for brand_summary using brand_identity if empty
-- This comment is for reference only, as we'll handle this in the application code

-- Update function to automatically generate brand_summary on insert/update
CREATE OR REPLACE FUNCTION update_brand_summary()
RETURNS TRIGGER AS $$
BEGIN
  -- If brand_summary is NULL or empty and brand_identity exists
  IF (NEW.brand_summary IS NULL OR NEW.brand_summary = '') AND 
     (NEW.brand_identity IS NOT NULL AND NEW.brand_identity <> '') THEN
    
    -- Generate a summary from brand_identity - just use first paragraph 
    -- for simple implementation
    NEW.brand_summary := substring(NEW.brand_identity from 1 for 250);
    
    -- Add ellipsis if we truncated the text
    IF length(NEW.brand_identity) > 250 THEN
      NEW.brand_summary := NEW.brand_summary || '...';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_brand_summary_trigger ON brands;
CREATE TRIGGER update_brand_summary_trigger
BEFORE INSERT OR UPDATE ON brands
FOR EACH ROW
EXECUTE PROCEDURE update_brand_summary();

-- Update existing records to populate brand_summary
UPDATE brands
SET brand_summary = substring(brand_identity from 1 for 250) || 
  CASE WHEN length(brand_identity) > 250 THEN '...' ELSE '' END
WHERE brand_summary IS NULL OR brand_summary = ''
  AND brand_identity IS NOT NULL AND brand_identity <> ''; 
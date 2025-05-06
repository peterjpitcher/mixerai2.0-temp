-- Migration: Add approved content types to brands table

-- Add approved_content_types column to brands table
DO $$
BEGIN
  -- Check if the column already exists
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'brands' 
    AND column_name = 'approved_content_types'
  ) THEN
    -- Add the column as a JSONB array to store the IDs of approved content types
    ALTER TABLE brands ADD COLUMN approved_content_types JSONB DEFAULT '[]'::jsonb;
    
    -- For existing brands, set all content types as approved by default
    WITH content_type_ids AS (
      SELECT json_agg(id) AS ids FROM content_types
    )
    UPDATE brands
    SET approved_content_types = (SELECT ids FROM content_type_ids);
    
    RAISE NOTICE 'Added approved_content_types column to brands table';
  ELSE
    RAISE NOTICE 'approved_content_types column already exists in brands table';
  END IF;
END
$$; 
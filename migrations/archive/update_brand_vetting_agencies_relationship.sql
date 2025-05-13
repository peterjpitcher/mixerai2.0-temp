-- Remove old text column from brands table if it exists
ALTER TABLE brands DROP COLUMN IF EXISTS content_vetting_agencies;

-- Create a junction table for the many-to-many relationship between brands and content_vetting_agencies
CREATE TABLE brand_selected_agencies (
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES content_vetting_agencies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (brand_id, agency_id)
);

-- Optional: Add indexes for better performance on queries involving this table
CREATE INDEX idx_brand_selected_agencies_brand_id ON brand_selected_agencies(brand_id);
CREATE INDEX idx_brand_selected_agencies_agency_id ON brand_selected_agencies(agency_id); 
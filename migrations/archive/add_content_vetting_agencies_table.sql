DROP TABLE IF EXISTS content_vetting_agencies CASCADE;

CREATE TABLE content_vetting_agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  country_code VARCHAR(2) NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_agency_name_country UNIQUE (name, country_code)
); 
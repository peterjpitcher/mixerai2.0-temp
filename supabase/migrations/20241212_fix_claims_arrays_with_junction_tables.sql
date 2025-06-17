-- Migration: Fix claims table to support multiple products and countries using junction tables
-- Date: 2024-12-12
-- Description: Converts singular product_id and country_code to many-to-many relationships

-- 1. Create junction table for claims and products
CREATE TABLE IF NOT EXISTS claim_products (
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (claim_id, product_id)
);

-- 2. Create junction table for claims and countries
CREATE TABLE IF NOT EXISTS claim_countries (
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (claim_id, country_code)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_claim_products_claim_id ON claim_products(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_products_product_id ON claim_products(product_id);
CREATE INDEX IF NOT EXISTS idx_claim_countries_claim_id ON claim_countries(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_countries_country_code ON claim_countries(country_code);

-- 4. Migrate existing data from claims table to junction tables
-- Migrate product associations
INSERT INTO claim_products (claim_id, product_id)
SELECT id, product_id 
FROM claims 
WHERE product_id IS NOT NULL
ON CONFLICT (claim_id, product_id) DO NOTHING;

-- Migrate country associations
INSERT INTO claim_countries (claim_id, country_code)
SELECT id, country_code 
FROM claims 
WHERE country_code IS NOT NULL
ON CONFLICT (claim_id, country_code) DO NOTHING;

-- 5. Add RLS policies for new junction tables
ALTER TABLE claim_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_countries ENABLE ROW LEVEL SECURITY;

-- Policy for claim_products - inherit from claims table permissions
CREATE POLICY "Users can view claim products based on claim permissions" ON claim_products
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims 
      WHERE claims.id = claim_products.claim_id
      -- This will use the claims table's RLS policies
    )
  );

CREATE POLICY "Users can manage claim products based on claim permissions" ON claim_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM claims 
      WHERE claims.id = claim_products.claim_id
      -- This will use the claims table's RLS policies
    )
  );

-- Policy for claim_countries - inherit from claims table permissions  
CREATE POLICY "Users can view claim countries based on claim permissions" ON claim_countries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM claims 
      WHERE claims.id = claim_countries.claim_id
      -- This will use the claims table's RLS policies
    )
  );

CREATE POLICY "Users can manage claim countries based on claim permissions" ON claim_countries
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM claims 
      WHERE claims.id = claim_countries.claim_id
      -- This will use the claims table's RLS policies
    )
  );

-- 6. Create helper functions for easier querying
CREATE OR REPLACE FUNCTION get_claim_products(claim_uuid UUID)
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(product_id) 
  FROM claim_products 
  WHERE claim_id = claim_uuid;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_claim_countries(claim_uuid UUID)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(country_code) 
  FROM claim_countries 
  WHERE claim_id = claim_uuid;
$$ LANGUAGE SQL STABLE;

-- 7. Create a view that includes the arrays for backward compatibility
CREATE OR REPLACE VIEW claims_with_arrays AS
SELECT 
  c.*,
  get_claim_products(c.id) as product_ids,
  get_claim_countries(c.id) as country_codes
FROM claims c;

-- 8. Comment the original columns as deprecated (don't drop yet for safety)
COMMENT ON COLUMN claims.product_id IS 'DEPRECATED: Use claim_products junction table instead';
COMMENT ON COLUMN claims.country_code IS 'DEPRECATED: Use claim_countries junction table instead';

-- Note: The original columns are not dropped to ensure backward compatibility
-- They can be dropped in a future migration after verifying all code is updated
-- Concurrent Index Creation
-- This must be run separately after the main migration as it cannot be run in a transaction

-- Create index for global claims blocking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_master_claims_globally_blocked 
ON brand_master_claims(is_globally_blocked) 
WHERE is_globally_blocked = true;

-- Add any other concurrent indexes here as needed
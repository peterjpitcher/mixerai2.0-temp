-- Rollback script for: Enable global claims blocking
-- Date: 2025-07-02
-- Version: 1.0.0
-- Description: Removes support for global claims blocking

BEGIN;

-- Drop the index for global overrides
DROP INDEX IF EXISTS idx_market_claim_overrides_global;

-- Drop audit table and its indexes
DROP TABLE IF EXISTS global_override_audit CASCADE;

-- Drop RLS policy for global overrides
DROP POLICY IF EXISTS "global_overrides_admin_only" ON market_claim_overrides;

-- Drop the validation trigger and function
DROP TRIGGER IF EXISTS validate_market_country_code_trigger ON market_claim_overrides;
DROP FUNCTION IF EXISTS validate_market_country_code();

-- Remove table comment
COMMENT ON TABLE market_claim_overrides IS NULL;

COMMIT;
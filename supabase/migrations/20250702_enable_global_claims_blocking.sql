-- Migration: Enable global claims blocking with proper safeguards
-- Date: 2025-07-02
-- Version: 1.0.0
-- Description: Adds support for blocking claims globally using __ALL_COUNTRIES__ as a special country code

-- Note: This migration has two parts:
-- Part 1: Run inside transaction (everything except CONCURRENTLY index)
-- Part 2: Run outside transaction (CONCURRENTLY index creation)

-- PART 1: Main migration (run in transaction)
BEGIN;

-- Note: We use a trigger for validation instead of CHECK constraint
-- because PostgreSQL doesn't allow subqueries in CHECK constraints

-- Add comment for documentation
COMMENT ON TABLE market_claim_overrides IS 
'Stores claim overrides by market. Use __ALL_COUNTRIES__ for global blocks. Precedence: Country-specific > Global > Base claims';

-- Create audit table for global operations
CREATE TABLE IF NOT EXISTS global_override_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    override_id UUID NOT NULL REFERENCES market_claim_overrides(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    user_id UUID NOT NULL,
    affected_countries TEXT[] NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on audit table for performance
CREATE INDEX IF NOT EXISTS idx_global_override_audit_override_id 
ON global_override_audit(override_id);

CREATE INDEX IF NOT EXISTS idx_global_override_audit_user_id 
ON global_override_audit(user_id);

-- Add RLS policy for global overrides
-- Only admins can create/update/delete global overrides
CREATE POLICY "global_overrides_admin_only" ON market_claim_overrides
    FOR ALL
    USING (
        market_country_code != '__ALL_COUNTRIES__' OR
        EXISTS (
            SELECT 1 FROM user_brand_permissions ubp
            JOIN products p ON p.master_brand_id = ubp.brand_id
            WHERE p.id = market_claim_overrides.target_product_id
            AND ubp.user_id = auth.uid()
            AND ubp.role = 'admin'
        )
    )
    WITH CHECK (
        market_country_code != '__ALL_COUNTRIES__' OR
        EXISTS (
            SELECT 1 FROM user_brand_permissions ubp
            JOIN products p ON p.master_brand_id = ubp.brand_id
            WHERE p.id = market_claim_overrides.target_product_id
            AND ubp.user_id = auth.uid()
            AND ubp.role = 'admin'
        )
    );

-- Add RLS policies for audit table
ALTER TABLE global_override_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "global_override_audit_read" ON global_override_audit
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_brand_permissions ubp
            JOIN products p ON p.master_brand_id = ubp.brand_id
            JOIN market_claim_overrides mco ON mco.id = global_override_audit.override_id
            WHERE p.id = mco.target_product_id
            AND ubp.user_id = auth.uid()
        )
    );

-- Function to validate country codes before insert/update
CREATE OR REPLACE FUNCTION validate_market_country_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow __ALL_COUNTRIES__ or validate against active countries
    IF NEW.market_country_code = '__ALL_COUNTRIES__' THEN
        RETURN NEW;
    END IF;
    
    -- Check if country exists and is active
    IF NOT EXISTS (
        SELECT 1 FROM countries 
        WHERE code = NEW.market_country_code 
        AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Invalid or inactive country code: %', NEW.market_country_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_market_country_code_trigger ON market_claim_overrides;
CREATE TRIGGER validate_market_country_code_trigger
    BEFORE INSERT OR UPDATE ON market_claim_overrides
    FOR EACH ROW
    EXECUTE FUNCTION validate_market_country_code();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON market_claim_overrides TO authenticated;
GRANT SELECT ON global_override_audit TO authenticated;
GRANT USAGE ON SEQUENCE global_override_audit_id_seq TO authenticated;

COMMIT;

-- PART 2: Create index CONCURRENTLY (run outside transaction)
-- Note: This must be run separately after the transaction commits
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_claim_overrides_global 
ON market_claim_overrides(master_claim_id, target_product_id, market_country_code) 
WHERE market_country_code = '__ALL_COUNTRIES__';

-- Rollback script (save separately as rollback_20250702_enable_global_claims_blocking.sql)
-- BEGIN;
-- DROP INDEX IF EXISTS idx_market_claim_overrides_global;
-- ALTER TABLE market_claim_overrides DROP CONSTRAINT IF EXISTS market_claim_overrides_country_code_valid;
-- DROP TABLE IF EXISTS global_override_audit CASCADE;
-- DROP POLICY IF EXISTS "global_overrides_admin_only" ON market_claim_overrides;
-- DROP POLICY IF EXISTS "global_override_audit_read" ON global_override_audit;
-- DROP TRIGGER IF EXISTS validate_market_country_code_trigger ON market_claim_overrides;
-- DROP FUNCTION IF EXISTS validate_market_country_code();
-- COMMENT ON TABLE market_claim_overrides IS NULL;
-- COMMIT;
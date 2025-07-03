-- Migration: Enable global claims blocking with proper safeguards (Part 2)
-- Date: 2025-07-02
-- Version: 1.0.0
-- Description: Creates index for global overrides performance optimization

-- This must be run AFTER part 1 completes successfully
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_claim_overrides_global 
ON market_claim_overrides(master_claim_id, target_product_id, market_country_code) 
WHERE market_country_code = '__ALL_COUNTRIES__';
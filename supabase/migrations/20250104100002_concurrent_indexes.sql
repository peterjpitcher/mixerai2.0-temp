-- Concurrent Indexes
-- Generated: 2025-01-04
-- These indexes must be created outside of a transaction block

-- Create concurrent indexes for better performance on large tables
-- Note: These can be run while the database is in use

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_claims_created_at" ON "public"."claims" ("created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_claims_updated_at" ON "public"."claims" ("updated_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_content_created_at" ON "public"."content" ("created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_content_updated_at" ON "public"."content" ("updated_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_brands_created_at" ON "public"."brands" ("created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_brands_updated_at" ON "public"."brands" ("updated_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workflows_created_at" ON "public"."workflows" ("created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_workflows_updated_at" ON "public"."workflows" ("updated_at" DESC);

-- Text search indexes for claims
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_claims_text_search" ON "public"."claims" USING gin(to_tsvector('english', claim_text));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_claims_description_search" ON "public"."claims" USING gin(to_tsvector('english', COALESCE(description, '')));

-- Text search indexes for content
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_content_title_search" ON "public"."content" USING gin(to_tsvector('english', title));
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_content_body_search" ON "public"."content" USING gin(to_tsvector('english', body));

-- Additional performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_brand_permissions_created_at" ON "public"."user_brand_permissions" ("created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_notifications_updated_at" ON "public"."notifications" ("updated_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_feedback_items_created_at" ON "public"."feedback_items" ("created_at" DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_feedback_items_status" ON "public"."feedback_items" ("status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_feedback_items_priority" ON "public"."feedback_items" ("priority");
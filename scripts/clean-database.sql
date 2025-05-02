-- Script to remove all dummy data while preserving the schema

-- First, disable foreign key constraints temporarily
SET session_replication_role = 'replica';

-- Clear all tables with dummy data
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE analytics CASCADE;
TRUNCATE TABLE content CASCADE;
TRUNCATE TABLE workflows CASCADE;
TRUNCATE TABLE user_brand_permissions CASCADE;
TRUNCATE TABLE brands CASCADE;

-- Clear profiles table but preserve the users that were created via Supabase
DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001';
DELETE FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';

-- Re-insert only the content types (to have basic structure)
-- Ensure existing content types are cleared first
TRUNCATE TABLE content_types CASCADE;
INSERT INTO content_types (name, description) VALUES
  ('Article', 'Long-form content with structured sections'),
  ('Retailer PDP', 'Product descriptions optimized for third-party retailers'),
  ('Owned PDP', 'Product descriptions for the brand''s own website');

-- Re-enable foreign key constraints
SET session_replication_role = 'origin'; 
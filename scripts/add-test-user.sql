-- Add a single test user with no dummy data connections
-- This is useful for basic testing after cleaning the database

INSERT INTO profiles (id, full_name, avatar_url)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Test User',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser'
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = 'Test User',
  avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser';

-- Output confirmation
SELECT 'Test user created with ID: 22222222-2222-2222-2222-222222222222' as result; 
-- Create a test user with a specified ID for easy identification
INSERT INTO profiles (id, full_name, avatar_url)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Test User',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser'
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = 'Test User',
  avatar_url = 'https://api.dicebear.com/7.x/avataaars/svg?seed=testuser';

-- Assign the test user to all brands with admin role
INSERT INTO user_brand_permissions (user_id, brand_id, role)
SELECT 
  '11111111-1111-1111-1111-111111111111',
  id,
  'admin'
FROM brands
ON CONFLICT (user_id, brand_id) DO UPDATE
SET role = 'admin';

-- Output confirmation
SELECT 'Test user created with ID: 11111111-1111-1111-1111-111111111111' as result;
SELECT 'User assigned to the following brands:' as result;
SELECT b.name FROM brands b 
JOIN user_brand_permissions p ON b.id = p.brand_id 
WHERE p.user_id = '11111111-1111-1111-1111-111111111111'; 
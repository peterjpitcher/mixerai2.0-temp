-- Script to create sample brands for local testing
-- These will replace the brands seen in the screenshot

-- First, clean up any existing brands
TRUNCATE TABLE brands CASCADE;

-- Insert sample brands
INSERT INTO brands (id, name, country, language, brand_identity, tone_of_voice, guardrails)
VALUES 
  (
    'e0e0d7a0-0000-4000-a000-000000000001',
    'TechGadgets',
    'United States',
    'English',
    'A cutting-edge technology brand focused on innovative gadgets and smart devices.',
    'Conversational, enthusiastic, and tech-savvy. Use inclusive language that explains complex concepts clearly.',
    'Avoid technical jargon without explanation. Focus on benefits to users rather than just specifications.'
  ),
  (
    'e0e0d7a0-0000-4000-a000-000000000002',
    'WearTech',
    'United Kingdom',
    'English',
    'A premium wearable technology brand focused on fitness and health tracking.',
    'Professional yet approachable. Use active voice and concise sentences that inspire action.',
    'Emphasize accuracy and health benefits. Avoid making medical claims without evidence.'
  ),
  (
    'e0e0d7a0-0000-4000-a000-000000000003',
    'NutriHealth',
    'Canada',
    'English',
    'A health-focused nutritional supplement brand dedicated to natural ingredients.',
    'Warm, genuine, and educational. Use positive language focused on wellbeing and health.',
    'Provide balanced information. Avoid making exaggerated health claims. Back statements with science.'
  ),
  (
    'e0e0d7a0-0000-4000-a000-000000000004',
    'StyleHouse',
    'France',
    'French',
    'A luxury fashion brand that combines classic elegance with modern trends.',
    'Sophisticated, elegant, and aspirational. Use emotive language that evokes luxury and quality.',
    'Focus on craftsmanship and design details. Avoid fast-fashion messaging or disposability.'
  ),
  (
    'e0e0d7a0-0000-4000-a000-000000000005',
    'EcoLiving',
    'Germany',
    'German',
    'An environmentally conscious home goods brand dedicated to sustainability.',
    'Straightforward, authentic, and passionate. Use positive language that emphasizes sustainability.',
    'Highlight environmental credentials with specific details. Avoid vague sustainability claims.'
  );

-- Create content counts for each brand
INSERT INTO content (brand_id, content_type_id, title, body, meta_title, meta_description, status)
SELECT 
  b.id,
  (SELECT id FROM content_types ORDER BY RANDOM() LIMIT 1),
  'Sample Content ' || generate_series,
  '# Sample Content

This is placeholder content for testing the interface. In a real scenario, this would contain actual marketing content.',
  'Sample Meta Title',
  'Sample meta description for testing purposes',
  'published'::content_status
FROM brands b
CROSS JOIN generate_series(1, (CASE 
  WHEN b.name = 'TechGadgets' THEN 12
  WHEN b.name = 'WearTech' THEN 8
  WHEN b.name = 'NutriHealth' THEN 15
  WHEN b.name = 'StyleHouse' THEN 6
  WHEN b.name = 'EcoLiving' THEN 9
  ELSE 1
END));

-- Assign user to all brands
INSERT INTO user_brand_permissions (user_id, brand_id, role)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  id,
  'admin'
FROM brands
ON CONFLICT DO NOTHING;

-- Output confirmation
SELECT 'Sample brands created successfully' as result; 
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

-- Create content for each brand using content_templates
INSERT INTO content (brand_id, template_id, title, body, meta_title, meta_description, status, content_data)
SELECT 
  b.id,
  ct.id, -- Use the selected template_id
  'Sample ' || ct.name || ' ' || gs.val, -- Make title more descriptive
  '# Sample ' || ct.name || '\n\nThis is placeholder content for testing using the ' || ct.name || ' template. In a real scenario, this would contain actual marketing content structured according to the template fields.', -- Updated body
  'Sample Meta Title for ' || ct.name || ' ' || gs.val, -- Updated meta_title
  'Sample meta description for ' || ct.name || ' ' || gs.val || ' testing purposes', -- Updated meta_description
  'published'::content_status,
  jsonb_build_object( -- Example content_data, adjust based on actual template fields
    'title', 'Sample ' || ct.name || ' ' || gs.val,
    'keywords', 'sample, test, ' || lower(ct.name),
    'brief', 'This is a sample brief for ' || ct.name || ' ' || gs.val || '.',
    -- Attempting to use a field name from the seeded templates, e.g., 'contentBody' for Basic Article
    'contentBody', '<h2>Sample Heading</h2><p>This is sample rich text content for ' || ct.name || ' ' || gs.val || '.</p>',
    -- Fallback generic field if specific one isn't in all templates (though title/brief are common)
    'genericBody', 'This is generic body content for ' || ct.name || ' ' || gs.val || '.',
    'metaDescription', 'Sample meta description for ' || ct.name || ' ' || gs.val || ' testing purposes'
  )
FROM brands b
CROSS JOIN (
    SELECT id, name FROM content_templates ORDER BY RANDOM() LIMIT 1 -- Select a random template
) ct
CROSS JOIN generate_series(1, (CASE 
  WHEN b.name = 'TechGadgets' THEN 12
  WHEN b.name = 'WearTech' THEN 8
  WHEN b.name = 'NutriHealth' THEN 15
  WHEN b.name = 'StyleHouse' THEN 6
  WHEN b.name = 'EcoLiving' THEN 9
  ELSE 1
END)) AS gs(val);

-- Assign user to all brands
INSERT INTO user_brand_permissions (user_id, brand_id, role)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  id,
  'admin'
FROM brands
ON CONFLICT DO NOTHING;

-- Output confirmation
SELECT 'Sample brands and content (using templates) created successfully' as result; 
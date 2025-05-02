-- Insert test admin user
INSERT INTO profiles (id, full_name, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Admin User',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
)
ON CONFLICT DO NOTHING;

-- Insert additional example brands
INSERT INTO brands (name, country, language, brand_identity, tone_of_voice, guardrails)
VALUES 
  (
    'Tech Innovators',
    'United States',
    'English',
    'A cutting-edge technology brand that pushes boundaries.',
    'Technical yet accessible. Use precise language and industry terms appropriately.',
    'Focus on innovation and benefits. Avoid overused tech buzzwords.'
  ),
  (
    'EcoFriendly',
    'Canada',
    'English',
    'An environmentally conscious brand dedicated to sustainability.',
    'Warm, genuine, and passionate. Use positive language that inspires action.',
    'Emphasize sustainability and ethical practices. Back claims with data.'
  )
ON CONFLICT DO NOTHING;

-- Assign admin user to brands with admin role
INSERT INTO user_brand_permissions (user_id, brand_id, role)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  id,
  'admin'
FROM brands
ON CONFLICT DO NOTHING;

-- Create example workflows
INSERT INTO workflows (brand_id, content_type_id, name, steps)
SELECT 
  b.id,
  ct.id,
  'Standard ' || ct.name || ' Workflow',
  '[
    {"name": "Draft", "description": "Initial content creation", "role": "editor"},
    {"name": "Review", "description": "Content review and feedback", "role": "editor"},
    {"name": "Approval", "description": "Final approval before publishing", "role": "admin"}
  ]'::jsonb
FROM brands b
CROSS JOIN content_types ct
WHERE b.name = 'Demo Brand'
ON CONFLICT DO NOTHING;

-- Create example content
INSERT INTO content (brand_id, content_type_id, workflow_id, created_by, title, body, meta_title, meta_description, status)
SELECT
  b.id,
  ct.id,
  w.id,
  '00000000-0000-0000-0000-000000000001',
  CASE 
    WHEN ct.name = 'Article' THEN '10 Tips for Sustainable Living'
    WHEN ct.name = 'Retailer PDP' THEN 'Premium Wireless Headphones Product Description'
    ELSE 'Eco-Friendly Bamboo Toothbrush Description'
  END,
  CASE 
    WHEN ct.name = 'Article' THEN '# 10 Tips for Sustainable Living

## Introduction
Living sustainably is becoming increasingly important as we face environmental challenges. Here are ten practical tips to help you reduce your carbon footprint and live a more sustainable lifestyle.

## Tip 1: Reduce Single-Use Plastics
Single-use plastics contribute significantly to pollution. Try using reusable water bottles, shopping bags, and food containers.

## Tip 2: Conserve Energy
Turn off lights and unplug electronics when not in use. Consider switching to energy-efficient appliances and LED light bulbs.

## Tip 3: Eat Local and Seasonal Foods
Locally grown foods require less transportation and often use fewer preservatives. Visit farmers markets and support local producers.

## Tip 4: Minimize Water Usage
Take shorter showers, fix leaky faucets, and collect rainwater for your garden.

## Tip 5: Choose Sustainable Transportation
Walk, cycle, use public transportation, or carpool whenever possible.

## Tip 6: Compost Food Waste
Composting reduces methane emissions from landfills and creates nutrient-rich soil for your garden.

## Tip 7: Buy Second-Hand
Shop at thrift stores, attend swap meets, or use online marketplaces for clothing, furniture, and electronics.

## Tip 8: Use Eco-Friendly Cleaning Products
Many conventional cleaning products contain harmful chemicals. Choose eco-friendly alternatives or make your own.

## Tip 9: Support Sustainable Brands
Research companies before purchasing and support those with sustainable practices.

## Tip 10: Educate Others
Share your sustainable lifestyle with friends and family to increase awareness and impact.

## Conclusion
Every small action counts towards creating a more sustainable future. Start implementing these tips today and make a positive impact on our planet.'
    WHEN ct.name = 'Retailer PDP' THEN '# Premium Wireless Headphones

Experience crystal-clear sound and unmatched comfort with our Premium Wireless Headphones. Designed for the discerning audio enthusiast, these headphones combine cutting-edge technology with elegant design.

## Features:
- Active Noise Cancellation
- 30-hour battery life
- Bluetooth 5.2 connectivity
- Memory foam ear cushions
- Built-in voice assistant
- Foldable design for easy storage
- Premium carrying case included

## Technical Specifications:
- Driver size: 40mm
- Frequency response: 20Hz-20kHz
- Weight: 250g
- Charging: USB-C
- Colors available: Midnight Black, Arctic White, Navy Blue'
    ELSE '# Eco-Friendly Bamboo Toothbrush

Our Eco-Friendly Bamboo Toothbrush offers a sustainable alternative to plastic toothbrushes without compromising on quality or performance.

## Features:
- 100% biodegradable bamboo handle
- BPA-free nylon bristles
- Ergonomic design for comfortable brushing
- Naturally antimicrobial properties
- Minimal, plastic-free packaging
- Available in adult and child sizes

## Why Choose Bamboo?
Bamboo is one of the fastest-growing plants on Earth, making it a highly renewable resource. It requires no fertilizer to grow and self-regenerates from its own roots, eliminating the need for replanting.

## How to Dispose:
When it''s time to replace your toothbrush (approximately every 3 months), simply remove the bristles and compost the handle. The bamboo will naturally decompose, returning to the earth without leaving harmful residue.'
  END,
  CASE 
    WHEN ct.name = 'Article' THEN 'Top 10 Sustainable Living Tips for Everyday Life'
    WHEN ct.name = 'Retailer PDP' THEN 'Premium Wireless Headphones with Active Noise Cancellation'
    ELSE 'Eco-Friendly Bamboo Toothbrush: Sustainable Oral Care Solution'
  END,
  CASE 
    WHEN ct.name = 'Article' THEN 'Discover practical tips for sustainable living that anyone can implement. Reduce your carbon footprint with these 10 easy-to-follow recommendations.'
    WHEN ct.name = 'Retailer PDP' THEN 'Experience premium sound quality with our wireless headphones featuring active noise cancellation, 30-hour battery life, and memory foam ear cushions.'
    ELSE 'Our eco-friendly bamboo toothbrush offers a sustainable alternative to plastic. 100% biodegradable handle, BPA-free bristles, and plastic-free packaging.'
  END,
  CASE 
    WHEN ct.name = 'Article' THEN 'published'::content_status
    WHEN ct.name = 'Retailer PDP' THEN 'pending_review'::content_status
    ELSE 'draft'::content_status
  END
FROM brands b
JOIN content_types ct ON true
JOIN workflows w ON w.brand_id = b.id AND w.content_type_id = ct.id
WHERE b.name = 'Demo Brand'
ON CONFLICT DO NOTHING;

-- Create example notifications for admin user
INSERT INTO notifications (user_id, title, message, type, is_read, action_url, action_label)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Content Approved',
    'Your content "10 Tips for Sustainable Living" has been approved.',
    'success',
    false,
    '/dashboard/content/3',
    'View Content'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Workflow Update',
    'A new step has been added to the "Content Approval" workflow.',
    'info',
    true,
    '/dashboard/workflows/1',
    'View Workflow'
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Review Required',
    'Content "Premium Wireless Headphones Product Description" needs your review.',
    'warning',
    false,
    '/dashboard/content/2',
    'Review Now'
  )
ON CONFLICT DO NOTHING; 
#!/bin/bash

# Make script exit if any command fails
set -e

echo "Setting up MixerAI 2.0 local database..."

# Create directories if they don't exist
mkdir -p scripts supabase/migrations

# Check if Docker is installed
if ! command -v docker &> /dev/null
then
    echo "Docker could not be found. Please install Docker and try again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null
then
    echo "Docker Compose could not be found. Please install Docker Compose and try again."
    exit 1
fi

# Copy files if they don't exist
if [ ! -f docker-compose.yml ]; then
    cat > docker-compose.yml << 'EOL'
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: mixerai-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mixerai
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
EOL
    echo "Created docker-compose.yml"
fi

if [ ! -f supabase/migrations/20240101_initial_schema.sql ]; then
    cat > supabase/migrations/20240101_initial_schema.sql << EOL
-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

-- Create content status enum
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');

-- Create brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  website_url TEXT,
  country TEXT,
  language TEXT,
  brand_identity TEXT,
  tone_of_voice TEXT,
  guardrails TEXT,
  content_vetting_agencies TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user-brand permissions table
CREATE TABLE IF NOT EXISTS user_brand_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, brand_id)
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content table
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  template_id UUID
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'info', 'success', 'warning', 'error'
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create example brand
INSERT INTO brands (name, country, language, brand_identity, tone_of_voice, guardrails)
VALUES (
  'Demo Brand',
  'United Kingdom',
  'English',
  'A premium technology brand focused on innovation and sustainability.',
  'Professional, confident, and approachable. Use active voice and concise sentences.',
  'Avoid negative language about competitors. Focus on benefits rather than features.'
)
ON CONFLICT DO NOTHING;
EOL
    echo "Created supabase/migrations/20240101_initial_schema.sql"
fi

if [ ! -f supabase/migrations/20240102_test_data.sql ]; then
    cat > supabase/migrations/20240102_test_data.sql << EOL
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
-- This section needs significant rework or simplification
-- as it relied on CROSS JOIN content_types. 
-- For now, commenting out to avoid errors. A new way to seed workflows linked to templates would be needed.
-- INSERT INTO workflows (brand_id, content_type_id, name, steps)
-- SELECT 
--   b.id,
--   ct.id,
--   'Standard ' || ct.name || ' Workflow',
--   '[
--     {"name": "Draft", "description": "Initial content creation", "role": "editor"},
--     {"name": "Review", "description": "Content review and feedback", "role": "editor"},
--     {"name": "Approval", "description": "Final approval before publishing", "role": "admin"}
--   ]'::jsonb
-- FROM brands b
-- CROSS JOIN content_types ct
-- WHERE b.name = 'Demo Brand'
-- ON CONFLICT DO NOTHING;

-- Create sample content and notifications
-- This also relied on content_types and workflows linked to them.
-- Commenting out to avoid errors. Sample content should ideally be created based on sample templates.
-- INSERT INTO content (brand_id, content_type_id, workflow_id, created_by, title, body, meta_title, meta_description, status)
-- SELECT
--   b.id,
--   ct.id,
--   w.id,
--   '00000000-0000-0000-0000-000000000001',
--   'Sample ' || ct.name,
--   'This is a sample ' || ct.name || ' for testing purposes.',
--   'Sample ' || ct.name || ' Title',
--   'Sample ' || ct.name || ' Description',
--   'draft'
-- FROM brands b
-- JOIN content_types ct ON true
-- JOIN workflows w ON w.brand_id = b.id AND w.content_type_id = ct.id
-- WHERE b.name = 'Demo Brand'
-- LIMIT 3
-- ON CONFLICT DO NOTHING;

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
EOL
    echo "Created supabase/migrations/20240102_test_data.sql"
fi

if [ ! -f scripts/init-database.sh ]; then
    cat > scripts/init-database.sh << 'EOL'
#!/bin/bash

# Make script exit if any command fails
set -e

echo "Initializing database..."

# Wait for the database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Connect to the database and run the migrations
echo "Running migrations..."
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f supabase/migrations/20240101_initial_schema.sql
PGPASSWORD=postgres psql -h localhost -U postgres -d mixerai -f supabase/migrations/20240102_test_data.sql

echo "Database initialization complete!"
EOL
    chmod +x scripts/init-database.sh
    echo "Created scripts/init-database.sh"
fi

# Start the PostgreSQL container
echo "Starting PostgreSQL container..."
docker-compose up -d

# Wait for the container to start
echo "Waiting for PostgreSQL to start..."
sleep 10

# Run the database initialization script
echo "Initializing database..."
./scripts/init-database.sh

# Create .env.example if it doesn't exist
if [ ! -f .env.example ]; then
    cat > .env.example << 'EOL'
# Supabase Configuration - Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key

# PostgreSQL Direct Connection - Local Development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=mixerai

# Azure OpenAI Configuration - Replace with your actual values
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
EOL
    echo "Created .env.example"
    echo "Please copy .env.example to .env and update with your actual credentials."
fi

echo "Local database setup complete!"
echo "You can now use the database with the following connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  User: postgres"
echo "  Password: postgres"
echo "  Database: mixerai" 
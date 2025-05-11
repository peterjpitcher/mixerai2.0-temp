-- MixerAI 2.0 - Supabase Schema
-- This SQL file contains all the tables and types required for MixerAI 2.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create content_status enum type
DO $$ BEGIN
    CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Create user_role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Create user brand permissions table
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
  template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create analytics table
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Row Level Security (RLS) policies

-- Profiles table policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Brands table policies
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all users to view brands"
  ON brands FOR SELECT
  USING (true);

CREATE POLICY "Allow users with permissions to update brands"
  ON brands FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid()
      AND brand_id = brands.id
      AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Allow users with permissions to delete brands"
  ON brands FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid()
      AND brand_id = brands.id
      AND role = 'admin'
    )
  );

CREATE POLICY "Allow users with permissions to insert brands"
  ON brands FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid()
      AND brand_id = brands.id
      AND role = 'admin'
    )
  );

-- Content table policies
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users with brand permissions to view content"
  ON content FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid()
      AND brand_id = content.brand_id
    )
  );

CREATE POLICY "Allow users with editor permissions to update content"
  ON content FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid()
      AND brand_id = content.brand_id
      AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Allow users with editor permissions to insert content"
  ON content FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid()
      AND brand_id = content.brand_id
      AND role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Allow users with admin permissions to delete content"
  ON content FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid()
      AND brand_id = content.brand_id
      AND role = 'admin'
    )
  );

-- Add a function to trigger updated_at timestamp changes
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_brands_modtime
BEFORE UPDATE ON brands
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_content_modtime
BEFORE UPDATE ON content
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_workflows_modtime
BEFORE UPDATE ON workflows
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_user_brand_permissions_modtime
BEFORE UPDATE ON user_brand_permissions
FOR EACH ROW
EXECUTE PROCEDURE update_modified_column(); 
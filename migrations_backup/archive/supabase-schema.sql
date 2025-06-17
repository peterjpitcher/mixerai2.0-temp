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

-- Create workflow_status enum type
DO $$ BEGIN
    CREATE TYPE public.workflow_status AS ENUM ('active', 'draft', 'archived');
EXCEPTION
    WHEN duplicate_object THEN
        NULL;
END $$;

-- Create profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  email TEXT,
  job_title TEXT,
  job_description TEXT,
  company TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to profiles if they don't exist (for idempotency)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
      ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'job_title') THEN
      ALTER TABLE public.profiles ADD COLUMN job_title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'job_description') THEN
      ALTER TABLE public.profiles ADD COLUMN job_description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'company') THEN
      ALTER TABLE public.profiles ADD COLUMN company TEXT;
    END IF;
  END IF;
END$$;

-- Create content_templates table
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  fields JSONB NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name)
);
COMMENT ON TABLE content_templates IS 'Stores content template definitions with customizable fields';

-- Explicitly add UNIQUE constraint on name if table exists and constraint is missing (from consolidated_migrations.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_templates') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.content_templates'::regclass
        AND conname = 'content_templates_name_key' -- Default name for UNIQUE(name)
        AND contype = 'u'
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conrelid = 'public.content_templates'::regclass
        AND conname = 'content_templates_name_unique' -- Custom name we might use
        AND contype = 'u'
    ) THEN
      IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint ct
          JOIN pg_attribute attr ON attr.attrelid = ct.conrelid AND attr.attnum = ANY(ct.conkey)
          WHERE ct.conrelid = 'public.content_templates'::regclass
          AND ct.contype = 'u'
          AND attr.attname = 'name'
      ) THEN
        ALTER TABLE public.content_templates ADD CONSTRAINT content_templates_name_unique UNIQUE (name);
      END IF;
    END IF;
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_content_templates_name ON content_templates (name);

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
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_user_id ON user_brand_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_brand_id ON user_brand_permissions(brand_id);

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  status public.workflow_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Attempt to add columns to workflows if they don't exist (from consolidated_migrations.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'workflows') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflows' AND column_name = 'template_id') THEN
      ALTER TABLE public.workflows ADD COLUMN template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflows' AND column_name = 'created_by') THEN
      ALTER TABLE public.workflows ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workflows' AND column_name = 'status') THEN
      ALTER TABLE public.workflows ADD COLUMN status public.workflow_status NOT NULL DEFAULT 'draft';
    END IF;
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_workflows_brand_id ON workflows(brand_id);
CREATE INDEX IF NOT EXISTS idx_workflows_template_id ON workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);

COMMENT ON COLUMN public.workflows.status IS 'The current status of the workflow (e.g., active, draft, archived).';

-- Create workflow_user_assignments table
CREATE TABLE IF NOT EXISTS workflow_user_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  step_id INTEGER NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workflow_id, step_id, user_id)
);

-- Create content table
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
  content_data JSONB,
  version INTEGER DEFAULT 1,
  published_version INTEGER,
  workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta_title TEXT,
  meta_description TEXT,
  status content_status NOT NULL DEFAULT 'draft',
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Attempt to add columns to content if they don't exist (from consolidated_migrations.sql)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content' AND column_name = 'template_id') THEN
      ALTER TABLE public.content ADD COLUMN template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content' AND column_name = 'content_data') THEN
      ALTER TABLE public.content ADD COLUMN content_data JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content' AND column_name = 'version') THEN
      ALTER TABLE public.content ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'content' AND column_name = 'published_version') THEN
      ALTER TABLE public.content ADD COLUMN published_version INTEGER;
    END IF;
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_content_brand_id ON content(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_template_id ON content (template_id);
CREATE INDEX IF NOT EXISTS idx_content_created_by ON content(created_by);
CREATE INDEX IF NOT EXISTS idx_content_workflow_id ON content(workflow_id);

-- Create content_versions table
CREATE TABLE IF NOT EXISTS content_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content(id) ON DELETE CASCADE NOT NULL,
  workflow_step_identifier TEXT NOT NULL,
  step_name TEXT,
  version_number INT NOT NULL,
  content_json JSONB,
  action_status TEXT NOT NULL,
  feedback TEXT,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
COMMENT ON TABLE content_versions IS 'Tracks versions of content as it moves through approval steps';
CREATE INDEX IF NOT EXISTS idx_content_versions_content_id_version ON content_versions (content_id, version_number);
CREATE INDEX IF NOT EXISTS idx_content_versions_step_id_created ON content_versions (content_id, workflow_step_identifier, created_at);

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

-- Create invitation_logs table
CREATE TABLE IF NOT EXISTS invitation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invitation_logs_email ON invitation_logs(email);

-- Set up Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_brand_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_user_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (dropping if they exist to ensure up-to-date definitions)

-- Profiles table policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Brands table policies
DROP POLICY IF EXISTS "Everyone can view brands" ON public.brands;
CREATE POLICY "Everyone can view brands" ON public.brands
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
CREATE POLICY "Admins can insert brands" ON public.brands
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update their brands" ON public.brands;
CREATE POLICY "Admins can update their brands" ON public.brands
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = brands.id AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = brands.id AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete their brands" ON public.brands;
CREATE POLICY "Admins can delete their brands" ON public.brands
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = brands.id AND role = 'admin'
    )
  );

-- User Brand Permissions policies
DROP POLICY IF EXISTS "Everyone can view user brand permissions" ON public.user_brand_permissions;
CREATE POLICY "Everyone can view user brand permissions" ON public.user_brand_permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_brand_permissions;
CREATE POLICY "Admins can manage permissions" ON public.user_brand_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = user_brand_permissions.brand_id AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = user_brand_permissions.brand_id AND role = 'admin'
    )
  );

-- Content Templates policies
DROP POLICY IF EXISTS "Everyone can view content templates" ON public.content_templates;
CREATE POLICY "Everyone can view content templates" ON public.content_templates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage content templates" ON public.content_templates;
CREATE POLICY "Admins can manage content templates" ON public.content_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1)
    )
  ) WITH CHECK (
     EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1)
    )
  );

-- Workflows policies
DROP POLICY IF EXISTS "Everyone can view workflows" ON public.workflows;
CREATE POLICY "Everyone can view workflows" ON public.workflows
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage workflows" ON public.workflows;
CREATE POLICY "Admins can manage workflows" ON public.workflows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = workflows.brand_id AND role = 'admin'
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = workflows.brand_id AND role = 'admin'
    )
  );

-- Content policies
DROP POLICY IF EXISTS "Everyone can view content" ON public.content;
CREATE POLICY "Everyone can view content" ON public.content
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editors and Admins can insert content" ON public.content;
CREATE POLICY "Editors and Admins can insert content" ON public.content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = content.brand_id AND (role = 'editor' OR role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Editors and Admins can update content" ON public.content;
CREATE POLICY "Editors and Admins can update content" ON public.content
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = content.brand_id AND (role = 'editor' OR role = 'admin')
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = content.brand_id AND (role = 'editor' OR role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete content" ON public.content;
CREATE POLICY "Admins can delete content" ON public.content
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_brand_permissions
      WHERE user_id = auth.uid() AND brand_id = content.brand_id AND role = 'admin'
    )
  );

-- Content Versions policies
DROP POLICY IF EXISTS "Users can view versions of content they can view" ON public.content_versions;
CREATE POLICY "Users can view versions of content they can view" ON public.content_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content c
      WHERE c.id = content_versions.content_id AND (
        EXISTS (
          SELECT 1 FROM user_brand_permissions ubp
          WHERE ubp.user_id = auth.uid() AND ubp.brand_id = c.brand_id
        )
      )
    )
  );

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Analytics policies
DROP POLICY IF EXISTS "Everyone can view analytics" ON public.analytics;
CREATE POLICY "Everyone can view analytics" ON public.analytics
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert analytics" ON public.analytics;
CREATE POLICY "System can insert analytics" ON public.analytics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update analytics" ON public.analytics;
CREATE POLICY "System can update analytics" ON public.analytics
  FOR UPDATE USING (true) WITH CHECK (true);

-- RLS policies for invitation_logs (if any specific beyond default deny)
-- Example: Allow service_role to manage, users to see their own invites if applicable
-- DROP POLICY IF EXISTS "Allow service_role to manage invitation_logs" ON public.invitation_logs;
-- CREATE POLICY "Allow service_role to manage invitation_logs" ON public.invitation_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS policies for workflow_user_assignments (if any specific beyond default deny)
-- Example: Allow users to see their assignments, admins of brand to manage
-- DROP POLICY IF EXISTS "Users can view their workflow assignments" ON public.workflow_user_assignments;
-- CREATE POLICY "Users can view their workflow assignments" ON public.workflow_user_assignments FOR SELECT USING (user_id = auth.uid());


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

-- Function and trigger to create a profile entry when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, job_title, job_description, company)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'job_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'job_description', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_user();

-- Grant permissions (as per consolidated_migrations.sql)
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role; 
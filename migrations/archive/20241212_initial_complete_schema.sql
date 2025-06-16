-- MixerAI 2.0 Complete Database Initialization Migration
-- Generated: 2024-12-12
-- 
-- This migration creates the complete database schema for MixerAI 2.0
-- It includes all tables, types, functions, triggers, indexes, and RLS policies
-- Tables are created in dependency order to avoid foreign key constraint errors

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- =====================================================
-- SECTION 1: ENUM TYPES
-- =====================================================

-- Content status enum
DO $$ BEGIN
    CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'approved', 'published', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- User role enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- User brand role enum (separate from system role)
DO $$ BEGIN
    CREATE TYPE user_brand_role_enum AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Workflow status enum
DO $$ BEGIN
    CREATE TYPE workflow_status AS ENUM ('active', 'draft', 'archived');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Claim type enum
DO $$ BEGIN
    CREATE TYPE claim_type_enum AS ENUM ('allowed', 'disallowed', 'mandatory', 'conditional');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Claim level enum
DO $$ BEGIN
    CREATE TYPE claim_level_enum AS ENUM ('brand', 'product', 'ingredient');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Claim category enum
DO $$ BEGIN
    CREATE TYPE claim_category_enum AS ENUM (
        'Quality', 'Dairy Base', 'Texture', 'Nutrition',
        'Sweetener', 'Taste', 'Origin', 'Ingredient Highlight',
        'Ingredient Callout', 'Sensory', 'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Feedback type enum
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('bug', 'enhancement');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Feedback priority enum
DO $$ BEGIN
    CREATE TYPE feedback_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Feedback status enum
DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'wont_fix');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Tool run status enum
DO $$ BEGIN
    CREATE TYPE tool_run_status AS ENUM ('success', 'failure');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Vetting agency priority level enum
DO $$ BEGIN
    CREATE TYPE vetting_agency_priority_level AS ENUM ('High', 'Medium', 'Low');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- SECTION 2: UTILITY FUNCTIONS
-- =====================================================

-- Function to update modified timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Function to handle user profile creation
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

-- =====================================================
-- SECTION 3: TABLES (Level 1 - No Dependencies)
-- =====================================================

-- Master claim brands table
CREATE TABLE IF NOT EXISTS master_claim_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content types table
CREATE TABLE IF NOT EXISTS content_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content vetting agencies table
CREATE TABLE IF NOT EXISTS content_vetting_agencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    priority_level vetting_agency_priority_level DEFAULT 'Medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, country)
);

-- Countries table
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    region TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SECTION 4: TABLES (Level 2 - Basic Dependencies)
-- =====================================================

-- Profiles table (depends on auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    job_title TEXT,
    job_description TEXT,
    company TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brands table
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
    master_claim_brand_id UUID REFERENCES master_claim_brands(id),
    logo_url TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT,
    summary TEXT,
    created_by UUID REFERENCES profiles(id),
    normalized_domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    master_claim_brand_id UUID REFERENCES master_claim_brands(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, master_claim_brand_id)
);

-- =====================================================
-- SECTION 5: TABLES (Level 3 - Multiple Dependencies)
-- =====================================================

-- Brand selected agencies junction table
CREATE TABLE IF NOT EXISTS brand_selected_agencies (
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES content_vetting_agencies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (brand_id, agency_id)
);

-- Product ingredients junction table
CREATE TABLE IF NOT EXISTS product_ingredients (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (product_id, ingredient_id)
);

-- Claims table
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    master_claim_brand_id UUID REFERENCES master_claim_brands(id),
    product_id UUID REFERENCES products(id),
    ingredient_id UUID REFERENCES ingredients(id),
    market TEXT,
    claim_type claim_type_enum NOT NULL DEFAULT 'allowed',
    claim_text TEXT NOT NULL,
    claim_category claim_category_enum,
    details TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_claim_references CHECK (
        master_claim_brand_id IS NOT NULL OR 
        product_id IS NOT NULL OR 
        ingredient_id IS NOT NULL
    )
);

-- Content templates table
CREATE TABLE IF NOT EXISTS content_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    fields JSONB NOT NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User brand permissions table
CREATE TABLE IF NOT EXISTS user_brand_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, brand_id)
);

-- User system roles table
CREATE TABLE IF NOT EXISTS user_system_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    is_superadmin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    steps JSONB NOT NULL DEFAULT '[]',
    status workflow_status NOT NULL DEFAULT 'draft',
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SECTION 6: TABLES (Level 4 - Complex Dependencies)
-- =====================================================

-- Workflow steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    step_order INTEGER NOT NULL,
    deadline_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workflow_id, step_order)
);

-- Content table
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
    content_type_id UUID REFERENCES content_types(id),
    content_data JSONB,
    version INTEGER DEFAULT 1,
    published_version INTEGER,
    workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    current_workflow_step_id UUID REFERENCES workflow_steps(id),
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

-- Market claim overrides table
CREATE TABLE IF NOT EXISTS market_claim_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    market TEXT NOT NULL,
    override_text TEXT NOT NULL,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(claim_id, product_id, market)
);

-- Feedback items table
CREATE TABLE IF NOT EXISTS feedback_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    type feedback_type NOT NULL,
    title TEXT,
    description TEXT,
    priority feedback_priority NOT NULL,
    status feedback_status NOT NULL DEFAULT 'open',
    affected_area TEXT,
    steps_to_reproduce TEXT,
    expected_behavior TEXT,
    actual_behavior TEXT,
    attachments_metadata JSONB,
    app_version TEXT,
    user_impact_details TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invitation logs table
CREATE TABLE IF NOT EXISTS invitation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
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

-- Tool run history table
CREATE TABLE IF NOT EXISTS tool_run_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    brand_id UUID REFERENCES brands(id),
    tool_name TEXT NOT NULL,
    status tool_run_status NOT NULL,
    input_params JSONB,
    output_result JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SECTION 7: TABLES (Level 5 - Final Dependencies)
-- =====================================================

-- Workflow user assignments table
CREATE TABLE IF NOT EXISTS workflow_user_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workflow_id, step_id, user_id)
);

-- Workflow invitations table
CREATE TABLE IF NOT EXISTS workflow_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Content versions table
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

-- Content ownership history table
CREATE TABLE IF NOT EXISTS content_ownership_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES profiles(id),
    to_user_id UUID REFERENCES profiles(id),
    assigned_by UUID REFERENCES profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    views INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    data JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User tasks table
CREATE TABLE IF NOT EXISTS user_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_to UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    workflow_step_id UUID REFERENCES workflow_steps(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    brand_id UUID,
    role user_brand_role_enum DEFAULT 'viewer',
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted BOOLEAN DEFAULT false,
    invited_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SECTION 8: VIEWS
-- =====================================================

-- Profiles view (for easier access)
CREATE OR REPLACE VIEW profiles_view AS
SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.email,
    p.job_title,
    p.job_description,
    p.company,
    p.created_at,
    p.updated_at
FROM profiles p;

-- =====================================================
-- SECTION 9: INDEXES
-- =====================================================

-- Brand and agency indexes
CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
CREATE INDEX IF NOT EXISTS idx_brands_master_claim_brand ON brands(master_claim_brand_id);
CREATE INDEX IF NOT EXISTS idx_brands_normalized_domain ON brands(normalized_domain);
CREATE INDEX IF NOT EXISTS idx_brand_selected_agencies_brand ON brand_selected_agencies(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_selected_agencies_agency ON brand_selected_agencies(agency_id);

-- Content indexes
CREATE INDEX IF NOT EXISTS idx_content_brand_id ON content(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_template_id ON content(template_id);
CREATE INDEX IF NOT EXISTS idx_content_created_by ON content(created_by);
CREATE INDEX IF NOT EXISTS idx_content_workflow_id ON content(workflow_id);
CREATE INDEX IF NOT EXISTS idx_content_status ON content(status);
CREATE INDEX IF NOT EXISTS idx_content_versions_content_id_version ON content_versions(content_id, version_number);
CREATE INDEX IF NOT EXISTS idx_content_versions_step_id_created ON content_versions(content_id, workflow_step_identifier, created_at);

-- User and permission indexes
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_user_id ON user_brand_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_brand_permissions_brand_id ON user_brand_permissions(brand_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_assigned_to ON user_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_tasks_content_id ON user_tasks(content_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_workflow_id ON user_tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_completed ON user_tasks(completed);

-- Workflow indexes
CREATE INDEX IF NOT EXISTS idx_workflows_brand_id ON workflows(brand_id);
CREATE INDEX IF NOT EXISTS idx_workflows_template_id ON workflows(template_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_user_assignments_workflow ON workflow_user_assignments(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_user_assignments_user ON workflow_user_assignments(user_id);

-- Claims indexes
CREATE INDEX IF NOT EXISTS idx_claims_master_brand ON claims(master_claim_brand_id);
CREATE INDEX IF NOT EXISTS idx_claims_product ON claims(product_id);
CREATE INDEX IF NOT EXISTS idx_claims_ingredient ON claims(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_claims_market ON claims(market);

-- Other indexes
CREATE INDEX IF NOT EXISTS idx_content_templates_name ON content_templates(name);
CREATE INDEX IF NOT EXISTS idx_invitation_logs_email ON invitation_logs(email);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_products_master_claim_brand ON products(master_claim_brand_id);

-- =====================================================
-- SECTION 10: TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_brands_modtime ON brands;
DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
DROP TRIGGER IF EXISTS update_content_modtime ON content;
DROP TRIGGER IF EXISTS update_workflows_modtime ON workflows;
DROP TRIGGER IF EXISTS update_user_brand_permissions_modtime ON user_brand_permissions;
DROP TRIGGER IF EXISTS update_content_templates_modtime ON content_templates;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_ingredients_updated_at ON ingredients;
DROP TRIGGER IF EXISTS update_claims_updated_at ON claims;
DROP TRIGGER IF EXISTS update_workflow_steps_updated_at ON workflow_steps;
DROP TRIGGER IF EXISTS update_user_tasks_updated_at ON user_tasks;
DROP TRIGGER IF EXISTS update_feedback_items_updated_at ON feedback_items;
DROP TRIGGER IF EXISTS update_master_claim_brands_updated_at ON master_claim_brands;
DROP TRIGGER IF EXISTS update_user_system_roles_updated_at ON user_system_roles;
DROP TRIGGER IF EXISTS update_user_invitations_updated_at ON user_invitations;

-- Create updated_at triggers
CREATE TRIGGER update_brands_modtime BEFORE UPDATE ON brands FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_content_modtime BEFORE UPDATE ON content FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_workflows_modtime BEFORE UPDATE ON workflows FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_brand_permissions_modtime BEFORE UPDATE ON user_brand_permissions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_content_templates_modtime BEFORE UPDATE ON content_templates FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON ingredients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_claims_updated_at BEFORE UPDATE ON claims FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_workflow_steps_updated_at BEFORE UPDATE ON workflow_steps FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_tasks_updated_at BEFORE UPDATE ON user_tasks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_feedback_items_updated_at BEFORE UPDATE ON feedback_items FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_master_claim_brands_updated_at BEFORE UPDATE ON master_claim_brands FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_system_roles_updated_at BEFORE UPDATE ON user_system_roles FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_user_invitations_updated_at BEFORE UPDATE ON user_invitations FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- Create profile for new auth users
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();

-- =====================================================
-- SECTION 11: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
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
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_claim_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_run_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_vetting_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_selected_agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_claim_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_system_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 12: RLS POLICIES
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Brands policies
DROP POLICY IF EXISTS "Everyone can view brands" ON brands;
CREATE POLICY "Everyone can view brands" ON brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert brands" ON brands;
CREATE POLICY "Admins can insert brands" ON brands FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update their brands" ON brands;
CREATE POLICY "Admins can update their brands" ON brands FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = brands.id AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = brands.id AND role = 'admin')
);

DROP POLICY IF EXISTS "Admins can delete their brands" ON brands;
CREATE POLICY "Admins can delete their brands" ON brands FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = brands.id AND role = 'admin')
);

-- User brand permissions policies
DROP POLICY IF EXISTS "Everyone can view user brand permissions" ON user_brand_permissions;
CREATE POLICY "Everyone can view user brand permissions" ON user_brand_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage permissions" ON user_brand_permissions;
CREATE POLICY "Admins can manage permissions" ON user_brand_permissions FOR ALL USING (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = user_brand_permissions.brand_id AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = user_brand_permissions.brand_id AND role = 'admin')
);

-- Content templates policies
DROP POLICY IF EXISTS "Everyone can view content templates" ON content_templates;
CREATE POLICY "Everyone can view content templates" ON content_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage content templates" ON content_templates;
CREATE POLICY "Admins can manage content templates" ON content_templates FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1))
) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1))
);

-- Workflows policies
DROP POLICY IF EXISTS "Everyone can view workflows" ON workflows;
CREATE POLICY "Everyone can view workflows" ON workflows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage workflows" ON workflows;
CREATE POLICY "Admins can manage workflows" ON workflows FOR ALL USING (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = workflows.brand_id AND role = 'admin')
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = workflows.brand_id AND role = 'admin')
);

-- Content policies
DROP POLICY IF EXISTS "Everyone can view content" ON content;
CREATE POLICY "Everyone can view content" ON content FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editors and Admins can insert content" ON content;
CREATE POLICY "Editors and Admins can insert content" ON content FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = content.brand_id AND role IN ('editor', 'admin'))
);

DROP POLICY IF EXISTS "Editors and Admins can update content" ON content;
CREATE POLICY "Editors and Admins can update content" ON content FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = content.brand_id AND role IN ('editor', 'admin'))
) WITH CHECK (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = content.brand_id AND role IN ('editor', 'admin'))
);

DROP POLICY IF EXISTS "Admins can delete content" ON content;
CREATE POLICY "Admins can delete content" ON content FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_brand_permissions WHERE user_id = auth.uid() AND brand_id = content.brand_id AND role = 'admin')
);

-- Content versions policies
DROP POLICY IF EXISTS "Users can view versions of content they can view" ON content_versions;
CREATE POLICY "Users can view versions of content they can view" ON content_versions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM content c WHERE c.id = content_versions.content_id AND (
            EXISTS (SELECT 1 FROM user_brand_permissions ubp WHERE ubp.user_id = auth.uid() AND ubp.brand_id = c.brand_id)
        )
    )
);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Analytics policies
DROP POLICY IF EXISTS "Everyone can view analytics" ON analytics;
CREATE POLICY "Everyone can view analytics" ON analytics FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert analytics" ON analytics;
CREATE POLICY "System can insert analytics" ON analytics FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update analytics" ON analytics;
CREATE POLICY "System can update analytics" ON analytics FOR UPDATE USING (true) WITH CHECK (true);

-- User tasks policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON user_tasks;
CREATE POLICY "Users can view their own tasks" ON user_tasks FOR SELECT USING (assigned_to = auth.uid());

DROP POLICY IF EXISTS "Users can update their own tasks" ON user_tasks;
CREATE POLICY "Users can update their own tasks" ON user_tasks FOR UPDATE USING (assigned_to = auth.uid());

-- Feedback items policies
DROP POLICY IF EXISTS "Allow admins full access" ON feedback_items;
CREATE POLICY "Allow admins full access" ON feedback_items FOR ALL TO authenticated USING (
    (SELECT auth.jwt()->>'role') = 'admin' OR (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
) WITH CHECK (
    (SELECT auth.jwt()->>'role') = 'admin' OR (auth.jwt()->>'app_metadata')::jsonb->>'role' = 'admin'
);

DROP POLICY IF EXISTS "Allow authenticated users to read all feedback" ON feedback_items;
CREATE POLICY "Allow authenticated users to read all feedback" ON feedback_items FOR SELECT TO authenticated USING (true);

-- Tool run history policies
DROP POLICY IF EXISTS "Users can view their own tool runs" ON tool_run_history;
CREATE POLICY "Users can view their own tool runs" ON tool_run_history FOR SELECT USING (user_id = auth.uid());

-- Master claim brands policies
DROP POLICY IF EXISTS "Everyone can view master claim brands" ON master_claim_brands;
CREATE POLICY "Everyone can view master claim brands" ON master_claim_brands FOR SELECT USING (true);

-- Products policies
DROP POLICY IF EXISTS "Everyone can view products" ON products;
CREATE POLICY "Everyone can view products" ON products FOR SELECT USING (true);

-- Ingredients policies
DROP POLICY IF EXISTS "Everyone can view ingredients" ON ingredients;
CREATE POLICY "Everyone can view ingredients" ON ingredients FOR SELECT USING (true);

-- Claims policies
DROP POLICY IF EXISTS "Everyone can view claims" ON claims;
CREATE POLICY "Everyone can view claims" ON claims FOR SELECT USING (true);

-- =====================================================
-- SECTION 13: GRANTS
-- =====================================================

-- Grant permissions to different roles
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant usage on custom types
GRANT USAGE ON TYPE content_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE user_role TO anon, authenticated, service_role;
GRANT USAGE ON TYPE user_brand_role_enum TO anon, authenticated, service_role;
GRANT USAGE ON TYPE workflow_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE claim_type_enum TO anon, authenticated, service_role;
GRANT USAGE ON TYPE claim_level_enum TO anon, authenticated, service_role;
GRANT USAGE ON TYPE claim_category_enum TO anon, authenticated, service_role;
GRANT USAGE ON TYPE feedback_type TO anon, authenticated, service_role;
GRANT USAGE ON TYPE feedback_priority TO anon, authenticated, service_role;
GRANT USAGE ON TYPE feedback_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE tool_run_status TO anon, authenticated, service_role;
GRANT USAGE ON TYPE vetting_agency_priority_level TO anon, authenticated, service_role;

-- =====================================================
-- SECTION 14: COMMENTS
-- =====================================================

-- Add table comments
COMMENT ON TABLE profiles IS 'User profile information linked to auth.users';
COMMENT ON TABLE brands IS 'Organization/company entities with branding and settings';
COMMENT ON TABLE products IS 'Products linked to master claim brands';
COMMENT ON TABLE ingredients IS 'Ingredients used in products';
COMMENT ON TABLE claims IS 'Marketing claims at brand/product/ingredient levels';
COMMENT ON TABLE master_claim_brands IS 'Master brand entities for claims management';
COMMENT ON TABLE content IS 'Main content storage with version tracking';
COMMENT ON TABLE content_templates IS 'Template definitions for content generation';
COMMENT ON TABLE workflows IS 'Workflow definitions for content approval';
COMMENT ON TABLE workflow_steps IS 'Individual steps within workflows';
COMMENT ON TABLE user_tasks IS 'Tasks assigned to users from workflows';
COMMENT ON TABLE feedback_items IS 'Bug reports and enhancement requests';

-- Add column comments
COMMENT ON COLUMN brands.master_claim_brand_id IS 'Reference to master claim brand for shared claims';
COMMENT ON COLUMN brands.normalized_domain IS 'Normalized website domain for matching';
COMMENT ON COLUMN content.current_workflow_step_id IS 'Current step in the workflow process';
COMMENT ON COLUMN workflows.status IS 'Workflow status: active, draft, or archived';
COMMENT ON COLUMN claims.claim_type IS 'Type of claim: allowed, disallowed, mandatory, conditional';
COMMENT ON COLUMN user_tasks.completed IS 'Whether the task has been completed';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
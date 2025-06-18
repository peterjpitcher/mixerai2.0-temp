-- Squashed Migration: Complete MixerAI 2.0 Database Schema
-- Generated: 2025-06-18
-- This migration represents the complete database schema after squashing all previous migrations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Create ENUM types
CREATE TYPE "public"."claim_category_enum" AS ENUM (
    'Quality',
    'Dairy Base',
    'Texture',
    'Specific Ingredients',
    'Product Quality',
    'Ingredient Simplicity',
    'Dietary Restrictions',
    'Origin of ingredient',
    'No/No/No',
    'Stabilisers/Additives',
    'Heritage',
    'Craftmanship',
    'Best consumed',
    'Coating',
    'General',
    'Brand Promise',
    'Brand Tag Line',
    'Allergen Information',
    'Nutritional Information',
    'Sustainability/Sourcing',
    'Promotional'
);

CREATE TYPE "public"."claim_level_enum" AS ENUM (
    'brand',
    'product',
    'ingredient'
);

CREATE TYPE "public"."claim_type_enum" AS ENUM (
    'allowed',
    'disallowed',
    'mandatory',
    'conditional'
);

CREATE TYPE "public"."content_status" AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'published',
    'rejected',
    'cancelled'
);

CREATE TYPE "public"."feedback_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE "public"."feedback_status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed',
    'wont_fix'
);

CREATE TYPE "public"."feedback_type" AS ENUM (
    'bug',
    'enhancement'
);

CREATE TYPE "public"."tool_run_status" AS ENUM (
    'success',
    'failure'
);

CREATE TYPE "public"."user_brand_role_enum" AS ENUM (
    'admin',
    'editor',
    'viewer'
);

CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'editor',
    'viewer'
);

CREATE TYPE "public"."vetting_agency_priority_level" AS ENUM (
    'High',
    'Medium',
    'Low'
);

CREATE TYPE "public"."workflow_status" AS ENUM (
    'active',
    'draft',
    'archived'
);

-- Create utility functions needed by tables
CREATE OR REPLACE FUNCTION "public"."moddatetime"()
RETURNS "trigger"
LANGUAGE "plpgsql" AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Create core tables

-- Countries reference table
CREATE TABLE "public"."countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "countries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "countries_code_key" UNIQUE ("code")
);

-- Master claim brands
CREATE TABLE "public"."master_claim_brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "master_claim_brands_pkey" PRIMARY KEY ("id")
);

-- Core brands table
CREATE TABLE "public"."brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "primary_color" "text" DEFAULT '#000000'::"text",
    "secondary_color" "text" DEFAULT '#FFFFFF'::"text",
    "background_color" "text" DEFAULT '#FFFFFF'::"text",
    "tone_of_voice" "text",
    "summary" "text",
    "generated_identity" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    "master_claim_brand_id" "uuid",
    "website_urls" "jsonb" DEFAULT '[]'::"jsonb",
    "logo_url" "text",
    "additional_website_urls" "text"[] DEFAULT ARRAY[]::"text"[],
    CONSTRAINT "brands_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brands_master_claim_brand_id_fkey" FOREIGN KEY ("master_claim_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE SET NULL
);

-- Products table
CREATE TABLE "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "variant" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE
);

-- Ingredients table
CREATE TABLE "public"."ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ingredients_name_key" UNIQUE ("name")
);

-- Product ingredients junction table
CREATE TABLE "public"."product_ingredients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "ingredient_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "product_ingredients_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "product_ingredients_product_id_ingredient_id_key" UNIQUE ("product_id", "ingredient_id"),
    CONSTRAINT "product_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE CASCADE,
    CONSTRAINT "product_ingredients_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE
);

-- Claims workflows
CREATE TABLE "public"."claims_workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "claims_workflows_pkey" PRIMARY KEY ("id")
);

-- Claims workflow steps
CREATE TABLE "public"."claims_workflow_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "step_number" integer NOT NULL,
    "step_name" "text" NOT NULL,
    "assignee_id" "uuid",
    "assignee_role" "public"."user_role",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "claims_workflow_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "claims_workflow_steps_workflow_id_step_number_key" UNIQUE ("workflow_id", "step_number"),
    CONSTRAINT "claims_workflow_steps_check" CHECK (((("assignee_id" IS NULL) AND ("assignee_role" IS NOT NULL)) OR (("assignee_id" IS NOT NULL) AND ("assignee_role" IS NULL)))),
    CONSTRAINT "claims_workflow_steps_assignee_role_check" CHECK (("assignee_role" = ANY (ARRAY['admin'::"public"."user_role", 'editor'::"public"."user_role"]))),
    CONSTRAINT "claims_workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."claims_workflows"("id") ON DELETE CASCADE
);

-- Claims table
CREATE TABLE "public"."claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_text" "text" NOT NULL,
    "master_claim_brand_id" "uuid" NOT NULL,
    "claim_type" "public"."claim_type_enum" NOT NULL,
    "claim_category" "public"."claim_category_enum" NOT NULL,
    "claim_level" "public"."claim_level_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "workflow_id" "uuid",
    "current_workflow_step" integer DEFAULT 1,
    "workflow_status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "claims_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "claims_master_claim_brand_id_fkey" FOREIGN KEY ("master_claim_brand_id") REFERENCES "public"."master_claim_brands"("id") ON DELETE CASCADE,
    CONSTRAINT "claims_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."claims_workflows"("id") ON DELETE SET NULL
);

-- Claim countries junction table
CREATE TABLE "public"."claim_countries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "country_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "claim_countries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "claim_countries_claim_id_country_code_key" UNIQUE ("claim_id", "country_code"),
    CONSTRAINT "claim_countries_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE
);

-- Claim products junction table
CREATE TABLE "public"."claim_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "claim_products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "claim_products_claim_id_product_id_key" UNIQUE ("claim_id", "product_id"),
    CONSTRAINT "claim_products_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE,
    CONSTRAINT "claim_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE
);

-- Claim workflow history
CREATE TABLE "public"."claim_workflow_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "step_number" integer NOT NULL,
    "action" "text" NOT NULL,
    "performed_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "comment" "text",
    "updated_claim_text" "text",
    CONSTRAINT "claim_workflow_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "claim_workflow_history_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE,
    CONSTRAINT "claim_workflow_history_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."claims_workflows"("id") ON DELETE CASCADE
);

-- Market claim overrides
CREATE TABLE "public"."market_claim_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "claim_id" "uuid" NOT NULL,
    "country_code" "text" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "override_claim_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "market_claim_overrides_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "market_claim_overrides_claim_id_country_code_product_id_key" UNIQUE ("claim_id", "country_code", "product_id"),
    CONSTRAINT "market_claim_overrides_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE CASCADE
);

-- Profiles (extends auth.users)
CREATE TABLE "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "role" "public"."user_role" DEFAULT 'viewer'::"public"."user_role",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "avatar_url" "text",
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- User brand permissions
CREATE TABLE "public"."user_brand_permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "permission" "public"."user_brand_role_enum" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_brand_permissions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_brand_permissions_user_id_brand_id_key" UNIQUE ("user_id", "brand_id"),
    CONSTRAINT "user_brand_permissions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE,
    CONSTRAINT "user_brand_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- User system roles
CREATE TABLE "public"."user_system_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_system_roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_system_roles_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "user_system_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Content types
CREATE TABLE "public"."content_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_types_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_types_slug_key" UNIQUE ("slug")
);

-- Content vetting agencies
CREATE TABLE "public"."content_vetting_agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "priority_level" "public"."vetting_agency_priority_level" NOT NULL,
    "email_addresses" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_vetting_agencies_pkey" PRIMARY KEY ("id")
);

-- Content templates
CREATE TABLE "public"."content_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "instructions" "text",
    "fields" "jsonb" DEFAULT '{}'::"jsonb",
    "user_id" "uuid",
    "brand_id" "uuid",
    "content_type_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_templates_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL,
    CONSTRAINT "content_templates_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE SET NULL,
    CONSTRAINT "content_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- Workflows
CREATE TABLE "public"."workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brand_id" "uuid",
    "status" "public"."workflow_status" DEFAULT 'draft'::"public"."workflow_status",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflows_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE,
    CONSTRAINT "workflows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Workflow steps
CREATE TABLE "public"."workflow_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "order_index" integer NOT NULL,
    "assignee_id" "uuid",
    "due_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_steps_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE
);

-- Content table
CREATE TABLE "public"."content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text",
    "user_id" "uuid" NOT NULL,
    "brand_id" "uuid",
    "content_type_id" "uuid",
    "template_id" "uuid",
    "template_values" "jsonb",
    "generated_content" "jsonb",
    "status" "public"."content_status" DEFAULT 'draft'::"public"."content_status",
    "version" integer DEFAULT 1,
    "workflow_id" "uuid",
    "current_workflow_step_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "context" "text",
    "template_instructions_override" "text",
    CONSTRAINT "content_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL,
    CONSTRAINT "content_content_type_id_fkey" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE SET NULL,
    CONSTRAINT "content_current_workflow_step_id_fkey" FOREIGN KEY ("current_workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE SET NULL,
    CONSTRAINT "content_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."content_templates"("id") ON DELETE SET NULL,
    CONSTRAINT "content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "content_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE SET NULL
);

-- Content versions
CREATE TABLE "public"."content_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_id" "uuid" NOT NULL,
    "version" integer NOT NULL,
    "title" "text",
    "template_values" "jsonb",
    "generated_content" "jsonb",
    "status" "public"."content_status",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "content_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_versions_content_id_version_key" UNIQUE ("content_id", "version"),
    CONSTRAINT "content_versions_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE,
    CONSTRAINT "content_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Content ownership history
CREATE TABLE "public"."content_ownership_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "content_id" "uuid" NOT NULL,
    "from_user_id" "uuid",
    "to_user_id" "uuid" NOT NULL,
    "workflow_step_id" "uuid",
    "transferred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    CONSTRAINT "content_ownership_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "content_ownership_history_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."content"("id") ON DELETE CASCADE,
    CONSTRAINT "content_ownership_history_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "content_ownership_history_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "content_ownership_history_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE SET NULL
);

-- Analytics
CREATE TABLE "public"."analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_name" "text" NOT NULL,
    "user_id" "uuid",
    "properties" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Brand selected agencies
CREATE TABLE "public"."brand_selected_agencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "agency_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "brand_selected_agencies_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "brand_selected_agencies_brand_id_agency_id_key" UNIQUE ("brand_id", "agency_id"),
    CONSTRAINT "brand_selected_agencies_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "public"."content_vetting_agencies"("id") ON DELETE CASCADE,
    CONSTRAINT "brand_selected_agencies_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE
);

-- Feedback items
CREATE TABLE "public"."feedback_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "type" "public"."feedback_type" NOT NULL,
    "status" "public"."feedback_status" DEFAULT 'open'::"public"."feedback_status" NOT NULL,
    "priority" "public"."feedback_priority" DEFAULT 'medium'::"public"."feedback_priority" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "tags" "text"[] DEFAULT ARRAY[]::"text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "feedback_items_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "feedback_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Invitation logs
CREATE TABLE "public"."invitation_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "invited_email" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sent_by" "uuid" NOT NULL,
    CONSTRAINT "invitation_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "invitation_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "invitation_logs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE
);

-- Notifications
CREATE TABLE "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text",
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Security logs
CREATE TABLE "public"."security_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_type" "text" NOT NULL,
    "event_description" "text" NOT NULL,
    "user_id" "uuid",
    "ip_address" "text",
    "user_agent" "text",
    "additional_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL
);

-- Tool run history
CREATE TABLE "public"."tool_run_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tool_name" "text" NOT NULL,
    "run_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "brand_id" "uuid",
    "status" "public"."tool_run_status" NOT NULL,
    "input_data" "jsonb" DEFAULT '{}'::"jsonb",
    "output_data" "jsonb" DEFAULT '{}'::"jsonb",
    "error_message" "text",
    "execution_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "tool_run_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "tool_run_history_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL,
    CONSTRAINT "tool_run_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- User invitations
CREATE TABLE "public"."user_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "brand_ids" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "invited_by" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_invitations_token_key" UNIQUE ("token"),
    CONSTRAINT "user_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- User tasks
CREATE TABLE "public"."user_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "due_date" timestamp with time zone,
    "completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_tasks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE
);

-- Workflow invitations
CREATE TABLE "public"."workflow_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "workflow_step_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    CONSTRAINT "workflow_invitations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_invitations_workflow_id_workflow_step_id_email_key" UNIQUE ("workflow_id", "workflow_step_id", "email"),
    CONSTRAINT "workflow_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL,
    CONSTRAINT "workflow_invitations_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE,
    CONSTRAINT "workflow_invitations_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE
);

-- Workflow user assignments
CREATE TABLE "public"."workflow_user_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "workflow_step_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "workflow_user_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_user_assignments_workflow_id_workflow_step_id_use_key" UNIQUE ("workflow_id", "workflow_step_id", "user_id"),
    CONSTRAINT "workflow_user_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE,
    CONSTRAINT "workflow_user_assignments_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE CASCADE,
    CONSTRAINT "workflow_user_assignments_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE CASCADE
);

-- Create views

-- Claims with arrays view
CREATE OR REPLACE VIEW "public"."claims_with_arrays" AS
SELECT 
    c.id,
    c.claim_text,
    c.master_claim_brand_id,
    c.claim_type,
    c.claim_category,
    c.claim_level,
    c.created_at,
    c.updated_at,
    c.workflow_id,
    c.current_workflow_step,
    c.workflow_status,
    COALESCE(array_agg(DISTINCT cc.country_code) FILTER (WHERE cc.country_code IS NOT NULL), ARRAY[]::text[]) AS country_codes,
    COALESCE(array_agg(DISTINCT cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL), ARRAY[]::uuid[]) AS product_ids
FROM claims c
LEFT JOIN claim_countries cc ON c.id = cc.claim_id
LEFT JOIN claim_products cp ON c.id = cp.claim_id
GROUP BY c.id, c.claim_text, c.master_claim_brand_id, c.claim_type, c.claim_category, 
         c.claim_level, c.created_at, c.updated_at, c.workflow_id, c.current_workflow_step, c.workflow_status;

-- Claims pending approval view
CREATE OR REPLACE VIEW "public"."claims_pending_approval" AS
SELECT 
    c.id,
    c.claim_text,
    c.master_claim_brand_id,
    mcb.name as master_claim_brand_name,
    c.claim_type,
    c.claim_category,
    c.claim_level,
    c.workflow_id,
    c.current_workflow_step,
    c.workflow_status,
    c.created_at,
    c.updated_at,
    cw.name as workflow_name,
    cws.step_name,
    cws.assignee_id,
    cws.assignee_role
FROM claims c
JOIN claims_workflows cw ON c.workflow_id = cw.id
JOIN claims_workflow_steps cws ON cw.id = cws.workflow_id AND c.current_workflow_step = cws.step_number
JOIN master_claim_brands mcb ON c.master_claim_brand_id = mcb.id
WHERE c.workflow_status = 'pending';

-- Profiles view
CREATE OR REPLACE VIEW "public"."profiles_view" AS
SELECT 
    p.*,
    (p.metadata ->> 'assigned_brands'::text) AS assigned_brands
FROM profiles p;

-- User invitation status view
CREATE OR REPLACE VIEW "public"."user_invitation_status" AS
SELECT 
    wi.workflow_id,
    wi.workflow_step_id,
    wi.email,
    wi.created_at,
    CASE
        WHEN p.id IS NOT NULL THEN 'accepted'::text
        ELSE 'pending'::text
    END AS status,
    p.id AS user_id
FROM workflow_invitations wi
LEFT JOIN profiles p ON lower(wi.email) = lower(p.email);

-- Create indexes
CREATE INDEX IF NOT EXISTS "analytics_created_at_idx" ON "public"."analytics"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "analytics_event_name_idx" ON "public"."analytics"("event_name");
CREATE INDEX IF NOT EXISTS "analytics_user_id_idx" ON "public"."analytics"("user_id");
CREATE INDEX IF NOT EXISTS "brands_master_claim_brand_id_idx" ON "public"."brands"("master_claim_brand_id");
CREATE INDEX IF NOT EXISTS "brands_user_id_idx" ON "public"."brands"("user_id");
CREATE INDEX IF NOT EXISTS "claim_countries_country_code_idx" ON "public"."claim_countries"("country_code");
CREATE INDEX IF NOT EXISTS "claim_products_product_id_idx" ON "public"."claim_products"("product_id");
CREATE INDEX IF NOT EXISTS "claim_workflow_history_claim_id_idx" ON "public"."claim_workflow_history"("claim_id");
CREATE INDEX IF NOT EXISTS "claim_workflow_history_performed_by_idx" ON "public"."claim_workflow_history"("performed_by");
CREATE INDEX IF NOT EXISTS "claim_workflow_history_workflow_id_idx" ON "public"."claim_workflow_history"("workflow_id");
CREATE INDEX IF NOT EXISTS "claims_master_claim_brand_id_idx" ON "public"."claims"("master_claim_brand_id");
CREATE INDEX IF NOT EXISTS "claims_workflow_id_idx" ON "public"."claims"("workflow_id");
CREATE INDEX IF NOT EXISTS "claims_workflow_status_idx" ON "public"."claims"("workflow_status");
CREATE INDEX IF NOT EXISTS "claims_workflow_steps_assignee_id_idx" ON "public"."claims_workflow_steps"("assignee_id");
CREATE INDEX IF NOT EXISTS "claims_workflow_steps_workflow_id_idx" ON "public"."claims_workflow_steps"("workflow_id");
CREATE INDEX IF NOT EXISTS "claims_workflows_created_by_idx" ON "public"."claims_workflows"("created_by");
CREATE INDEX IF NOT EXISTS "content_brand_id_idx" ON "public"."content"("brand_id");
CREATE INDEX IF NOT EXISTS "content_created_at_idx" ON "public"."content"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "content_status_idx" ON "public"."content"("status");
CREATE INDEX IF NOT EXISTS "content_user_id_idx" ON "public"."content"("user_id");
CREATE INDEX IF NOT EXISTS "content_workflow_id_idx" ON "public"."content"("workflow_id");
CREATE INDEX IF NOT EXISTS "content_ownership_history_content_id_idx" ON "public"."content_ownership_history"("content_id");
CREATE INDEX IF NOT EXISTS "content_templates_brand_id_idx" ON "public"."content_templates"("brand_id");
CREATE INDEX IF NOT EXISTS "content_templates_content_type_id_idx" ON "public"."content_templates"("content_type_id");
CREATE INDEX IF NOT EXISTS "content_templates_user_id_idx" ON "public"."content_templates"("user_id");
CREATE INDEX IF NOT EXISTS "content_versions_content_id_idx" ON "public"."content_versions"("content_id");
CREATE INDEX IF NOT EXISTS "feedback_items_assigned_to_idx" ON "public"."feedback_items"("assigned_to");
CREATE INDEX IF NOT EXISTS "feedback_items_created_by_idx" ON "public"."feedback_items"("created_by");
CREATE INDEX IF NOT EXISTS "feedback_items_status_idx" ON "public"."feedback_items"("status");
CREATE INDEX IF NOT EXISTS "feedback_items_type_idx" ON "public"."feedback_items"("type");
CREATE INDEX IF NOT EXISTS "invitation_logs_workflow_id_idx" ON "public"."invitation_logs"("workflow_id");
CREATE INDEX IF NOT EXISTS "market_claim_overrides_claim_id_idx" ON "public"."market_claim_overrides"("claim_id");
CREATE INDEX IF NOT EXISTS "market_claim_overrides_country_code_idx" ON "public"."market_claim_overrides"("country_code");
CREATE INDEX IF NOT EXISTS "market_claim_overrides_product_id_idx" ON "public"."market_claim_overrides"("product_id");
CREATE INDEX IF NOT EXISTS "notifications_user_id_read_idx" ON "public"."notifications"("user_id", "read");
CREATE INDEX IF NOT EXISTS "product_ingredients_ingredient_id_idx" ON "public"."product_ingredients"("ingredient_id");
CREATE INDEX IF NOT EXISTS "products_brand_id_idx" ON "public"."products"("brand_id");
CREATE INDEX IF NOT EXISTS "profiles_email_idx" ON "public"."profiles"("email");
CREATE INDEX IF NOT EXISTS "security_logs_created_at_idx" ON "public"."security_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "security_logs_event_type_idx" ON "public"."security_logs"("event_type");
CREATE INDEX IF NOT EXISTS "security_logs_user_id_idx" ON "public"."security_logs"("user_id");
CREATE INDEX IF NOT EXISTS "tool_run_history_brand_id_idx" ON "public"."tool_run_history"("brand_id");
CREATE INDEX IF NOT EXISTS "tool_run_history_created_at_idx" ON "public"."tool_run_history"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "tool_run_history_tool_name_idx" ON "public"."tool_run_history"("tool_name");
CREATE INDEX IF NOT EXISTS "tool_run_history_user_id_idx" ON "public"."tool_run_history"("user_id");
CREATE INDEX IF NOT EXISTS "user_brand_permissions_brand_id_idx" ON "public"."user_brand_permissions"("brand_id");
CREATE INDEX IF NOT EXISTS "user_brand_permissions_user_id_idx" ON "public"."user_brand_permissions"("user_id");
CREATE INDEX IF NOT EXISTS "user_invitations_email_idx" ON "public"."user_invitations"("email");
CREATE INDEX IF NOT EXISTS "user_invitations_expires_at_idx" ON "public"."user_invitations"("expires_at");
CREATE INDEX IF NOT EXISTS "user_invitations_invited_by_idx" ON "public"."user_invitations"("invited_by");
CREATE INDEX IF NOT EXISTS "user_tasks_user_id_completed_idx" ON "public"."user_tasks"("user_id", "completed");
CREATE INDEX IF NOT EXISTS "workflow_invitations_email_idx" ON "public"."workflow_invitations"("email");
CREATE INDEX IF NOT EXISTS "workflow_steps_assignee_id_idx" ON "public"."workflow_steps"("assignee_id");
CREATE INDEX IF NOT EXISTS "workflow_steps_workflow_id_idx" ON "public"."workflow_steps"("workflow_id");
CREATE INDEX IF NOT EXISTS "workflow_user_assignments_user_id_idx" ON "public"."workflow_user_assignments"("user_id");
CREATE INDEX IF NOT EXISTS "workflow_user_assignments_workflow_id_idx" ON "public"."workflow_user_assignments"("workflow_id");
CREATE INDEX IF NOT EXISTS "workflows_brand_id_idx" ON "public"."workflows"("brand_id");
CREATE INDEX IF NOT EXISTS "workflows_status_idx" ON "public"."workflows"("status");
CREATE INDEX IF NOT EXISTS "workflows_user_id_idx" ON "public"."workflows"("user_id");

-- Create functions

-- Create profile for user
CREATE OR REPLACE FUNCTION "public"."create_profile_for_user"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::user_role,
            'viewer'::user_role
        )
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Handle new user
CREATE OR REPLACE FUNCTION "public"."handle_new_user"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            (NEW.raw_user_meta_data->>'role')::public.user_role,
            'viewer'::public.user_role
        )
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

-- Normalize website domain
CREATE OR REPLACE FUNCTION "public"."normalize_website_domain"("url" "text")
RETURNS "text"
LANGUAGE "plpgsql"
AS $$
DECLARE
    normalized_url text;
BEGIN
    -- Remove whitespace
    normalized_url := TRIM(url);
    
    -- Convert to lowercase
    normalized_url := LOWER(normalized_url);
    
    -- Remove protocol (http://, https://, etc)
    normalized_url := REGEXP_REPLACE(normalized_url, '^[a-zA-Z]+://', '');
    
    -- Remove www prefix
    normalized_url := REGEXP_REPLACE(normalized_url, '^www\.', '');
    
    -- Remove trailing slashes and paths
    normalized_url := REGEXP_REPLACE(normalized_url, '/.*$', '');
    
    -- Remove port numbers
    normalized_url := REGEXP_REPLACE(normalized_url, ':[0-9]+$', '');
    
    RETURN normalized_url;
END;
$$;

-- Is global admin
CREATE OR REPLACE FUNCTION "public"."is_global_admin"("user_id" "uuid")
RETURNS boolean
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = user_id
        AND p.role = 'admin'
        AND NOT EXISTS (
            SELECT 1
            FROM user_brand_permissions ubp
            WHERE ubp.user_id = user_id
        )
    );
END;
$$;

-- Has brand permission
CREATE OR REPLACE FUNCTION "public"."has_brand_permission"("user_id" "uuid", "brand_id" "uuid", "required_permission" "public"."user_brand_role_enum" DEFAULT NULL)
RETURNS boolean
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    user_permission user_brand_role_enum;
    permission_hierarchy integer;
    required_hierarchy integer;
BEGIN
    -- Check if user is global admin
    IF is_global_admin(user_id) THEN
        RETURN true;
    END IF;

    -- Get user's permission for this brand
    SELECT permission INTO user_permission
    FROM user_brand_permissions
    WHERE user_brand_permissions.user_id = has_brand_permission.user_id 
    AND user_brand_permissions.brand_id = has_brand_permission.brand_id;

    -- If no permission found, return false
    IF user_permission IS NULL THEN
        RETURN false;
    END IF;

    -- If no specific permission required, just check if user has any permission
    IF required_permission IS NULL THEN
        RETURN true;
    END IF;

    -- Define permission hierarchy
    CASE user_permission
        WHEN 'admin' THEN permission_hierarchy := 3;
        WHEN 'editor' THEN permission_hierarchy := 2;
        WHEN 'viewer' THEN permission_hierarchy := 1;
    END CASE;

    CASE required_permission
        WHEN 'admin' THEN required_hierarchy := 3;
        WHEN 'editor' THEN required_hierarchy := 2;
        WHEN 'viewer' THEN required_hierarchy := 1;
    END CASE;

    -- Return true if user's permission is equal or higher than required
    RETURN permission_hierarchy >= required_hierarchy;
END;
$$;

-- Get current user role
CREATE OR REPLACE FUNCTION "public"."get_current_user_role"()
RETURNS "public"."user_role"
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
AS $$
DECLARE
    current_role user_role;
BEGIN
    SELECT role INTO current_role
    FROM profiles
    WHERE id = auth.uid();
    
    RETURN COALESCE(current_role, 'viewer'::user_role);
END;
$$;

-- Get user details
CREATE OR REPLACE FUNCTION "public"."get_user_details"("p_user_id" "uuid")
RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "system_role" "public"."user_role", "avatar_url" "text", "brand_permissions" "jsonb")
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.email,
        p.first_name,
        p.last_name,
        p.role as system_role,
        p.avatar_url,
        COALESCE(
            jsonb_agg(
                DISTINCT jsonb_build_object(
                    'brand_id', ubp.brand_id,
                    'brand_name', b.name,
                    'permission', ubp.permission
                )
            ) FILTER (WHERE ubp.brand_id IS NOT NULL),
            '[]'::jsonb
        ) as brand_permissions
    FROM profiles p
    LEFT JOIN user_brand_permissions ubp ON p.id = ubp.user_id
    LEFT JOIN brands b ON ubp.brand_id = b.id
    WHERE p.id = p_user_id
    GROUP BY p.id, p.email, p.first_name, p.last_name, p.role, p.avatar_url;
END;
$$;

-- Update user details
CREATE OR REPLACE FUNCTION "public"."update_user_details"(
    "p_user_id" "uuid",
    "p_first_name" "text" DEFAULT NULL,
    "p_last_name" "text" DEFAULT NULL,
    "p_system_role" "public"."user_role" DEFAULT NULL,
    "p_avatar_url" "text" DEFAULT NULL
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is admin or updating their own profile
    IF auth.uid() != p_user_id AND NOT is_global_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Update profile
    UPDATE profiles
    SET 
        first_name = COALESCE(p_first_name, first_name),
        last_name = COALESCE(p_last_name, last_name),
        role = CASE 
            WHEN p_system_role IS NOT NULL AND is_global_admin(auth.uid()) 
            THEN p_system_role 
            ELSE role 
        END,
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        updated_at = now()
    WHERE id = p_user_id;
END;
$$;

-- Set user role for all assigned brands
CREATE OR REPLACE FUNCTION "public"."set_user_role_for_all_assigned_brands"("target_user_id" "uuid", "new_role" "public"."user_brand_role_enum")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    -- Check if caller is global admin
    IF NOT is_global_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only global admins can perform this action';
    END IF;

    -- Update all brand permissions for the user
    UPDATE user_brand_permissions
    SET permission = new_role,
        updated_at = now()
    WHERE user_id = target_user_id;
END;
$$;

-- Create brand and set admin
CREATE OR REPLACE FUNCTION "public"."create_brand_and_set_admin"("brand_name" "text", "admin_user_id" "uuid")
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    new_brand_id uuid;
BEGIN
    -- Create the brand
    INSERT INTO brands (name, user_id)
    VALUES (brand_name, admin_user_id)
    RETURNING id INTO new_brand_id;

    -- Set the user as admin for this brand
    INSERT INTO user_brand_permissions (user_id, brand_id, permission)
    VALUES (admin_user_id, new_brand_id, 'admin');

    RETURN new_brand_id;
END;
$$;

-- Update brand with agencies
CREATE OR REPLACE FUNCTION "public"."update_brand_with_agencies"(
    "p_brand_id" "uuid",
    "p_name" "text",
    "p_primary_color" "text",
    "p_secondary_color" "text",
    "p_background_color" "text",
    "p_tone_of_voice" "text",
    "p_summary" "text",
    "p_master_claim_brand_id" "uuid",
    "p_website_urls" "jsonb",
    "p_logo_url" "text",
    "p_selected_agency_ids" "uuid"[]
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_brand record;
BEGIN
    -- Check if user has admin permission for the brand
    IF NOT has_brand_permission(auth.uid(), p_brand_id, 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin permission required';
    END IF;

    -- Get existing brand data
    SELECT * INTO v_brand FROM brands WHERE id = p_brand_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Brand not found';
    END IF;

    -- Update brand
    UPDATE brands
    SET 
        name = COALESCE(p_name, v_brand.name),
        primary_color = COALESCE(p_primary_color, v_brand.primary_color),
        secondary_color = COALESCE(p_secondary_color, v_brand.secondary_color),
        background_color = COALESCE(p_background_color, v_brand.background_color),
        tone_of_voice = COALESCE(p_tone_of_voice, v_brand.tone_of_voice),
        summary = COALESCE(p_summary, v_brand.summary),
        master_claim_brand_id = p_master_claim_brand_id,
        website_urls = COALESCE(p_website_urls, v_brand.website_urls),
        logo_url = COALESCE(p_logo_url, v_brand.logo_url),
        updated_at = now()
    WHERE id = p_brand_id;

    -- Update brand_selected_agencies
    DELETE FROM brand_selected_agencies WHERE brand_id = p_brand_id;
    
    IF p_selected_agency_ids IS NOT NULL AND array_length(p_selected_agency_ids, 1) > 0 THEN
        INSERT INTO brand_selected_agencies (brand_id, agency_id)
        SELECT p_brand_id, unnest(p_selected_agency_ids);
    END IF;
END;
$$;

-- Get brand details by ID
CREATE OR REPLACE FUNCTION "public"."get_brand_details_by_id"("p_brand_id" "uuid")
RETURNS TABLE(
    "id" "uuid",
    "name" "text",
    "primary_color" "text",
    "secondary_color" "text",
    "background_color" "text",
    "tone_of_voice" "text",
    "summary" "text",
    "avatar_url" "text",
    "master_claim_brand_id" "uuid",
    "master_claim_brand_name" "text",
    "website_urls" "jsonb",
    "logo_url" "text",
    "selected_agency_ids" "uuid"[]
)
LANGUAGE "plpgsql"
STABLE
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has permission to view this brand
    IF NOT has_brand_permission(auth.uid(), p_brand_id, 'viewer') THEN
        RAISE EXCEPTION 'Unauthorized: No permission to view this brand';
    END IF;

    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.primary_color,
        b.secondary_color,
        b.background_color,
        b.tone_of_voice,
        b.summary,
        b.avatar_url,
        b.master_claim_brand_id,
        mcb.name as master_claim_brand_name,
        b.website_urls,
        b.logo_url,
        ARRAY(
            SELECT agency_id 
            FROM brand_selected_agencies 
            WHERE brand_id = b.id
        ) as selected_agency_ids
    FROM brands b
    LEFT JOIN master_claim_brands mcb ON b.master_claim_brand_id = mcb.id
    WHERE b.id = p_brand_id;
END;
$$;

-- Get brand URLs
CREATE OR REPLACE FUNCTION "public"."get_brand_urls"("p_brand_id" "uuid")
RETURNS TABLE("domain" "text", "url" "text")
LANGUAGE "plpgsql"
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        normalize_website_domain(url_value) as domain,
        url_value as url
    FROM (
        -- Get URLs from website_urls JSONB array
        SELECT jsonb_array_elements_text(website_urls) as url_value
        FROM brands
        WHERE id = p_brand_id
        AND website_urls IS NOT NULL
        
        UNION
        
        -- Get URLs from additional_website_urls text array
        SELECT unnest(additional_website_urls) as url_value
        FROM brands
        WHERE id = p_brand_id
        AND additional_website_urls IS NOT NULL
    ) all_urls
    WHERE url_value IS NOT NULL 
    AND TRIM(url_value) != '';
END;
$$;

-- Delete brand and dependents
CREATE OR REPLACE FUNCTION "public"."delete_brand_and_dependents"("brand_id_to_delete" "uuid")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user has admin permission for the brand
    IF NOT has_brand_permission(auth.uid(), brand_id_to_delete, 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Admin permission required';
    END IF;

    -- Delete the brand (cascading will handle dependents)
    DELETE FROM brands WHERE id = brand_id_to_delete;
END;
$$;

-- Advance claim workflow
CREATE OR REPLACE FUNCTION "public"."advance_claim_workflow"(
    "p_claim_id" "uuid",
    "p_action" "text",
    "p_comment" "text" DEFAULT NULL,
    "p_updated_claim_text" "text" DEFAULT NULL
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_claim record;
    v_next_step integer;
    v_max_step integer;
    v_current_step record;
BEGIN
    -- Get claim details
    SELECT * INTO v_claim
    FROM claims
    WHERE id = p_claim_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Claim not found';
    END IF;
    
    IF v_claim.workflow_id IS NULL THEN
        RAISE EXCEPTION 'No workflow assigned to this claim';
    END IF;
    
    -- Get current step details
    SELECT * INTO v_current_step
    FROM claims_workflow_steps
    WHERE workflow_id = v_claim.workflow_id
    AND step_number = v_claim.current_workflow_step;
    
    -- Check if user has permission
    IF v_current_step.assignee_id IS NOT NULL THEN
        IF auth.uid() != v_current_step.assignee_id THEN
            RAISE EXCEPTION 'Only the assigned user can perform this action';
        END IF;
    ELSIF v_current_step.assignee_role IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = v_current_step.assignee_role
        ) THEN
            RAISE EXCEPTION 'User does not have the required role';
        END IF;
    END IF;
    
    -- Log the action
    INSERT INTO claim_workflow_history (
        claim_id, workflow_id, step_number, action, performed_by, comment, updated_claim_text
    ) VALUES (
        p_claim_id, v_claim.workflow_id, v_claim.current_workflow_step, p_action, auth.uid(), p_comment, p_updated_claim_text
    );
    
    -- Determine next step based on action
    IF p_action = 'approve' THEN
        -- Get max step number
        SELECT MAX(step_number) INTO v_max_step
        FROM claims_workflow_steps
        WHERE workflow_id = v_claim.workflow_id;
        
        IF v_claim.current_workflow_step >= v_max_step THEN
            -- Workflow complete
            UPDATE claims
            SET workflow_status = 'approved',
                updated_at = now()
            WHERE id = p_claim_id;
        ELSE
            -- Move to next step
            v_next_step := v_claim.current_workflow_step + 1;
            UPDATE claims
            SET current_workflow_step = v_next_step,
                updated_at = now()
            WHERE id = p_claim_id;
        END IF;
    ELSIF p_action = 'reject' THEN
        -- Move back to step 1
        UPDATE claims
        SET current_workflow_step = 1,
            workflow_status = 'pending',
            updated_at = now()
        WHERE id = p_claim_id;
    ELSE
        RAISE EXCEPTION 'Invalid action. Must be "approve" or "reject"';
    END IF;
    
    -- Update claim text if provided
    IF p_updated_claim_text IS NOT NULL THEN
        UPDATE claims
        SET claim_text = p_updated_claim_text,
            updated_at = now()
        WHERE id = p_claim_id;
    END IF;
END;
$$;

-- Assign workflow to claim
CREATE OR REPLACE FUNCTION "public"."assign_workflow_to_claim"("p_claim_id" "uuid", "p_workflow_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    -- Check if workflow exists
    IF NOT EXISTS (SELECT 1 FROM claims_workflows WHERE id = p_workflow_id) THEN
        RAISE EXCEPTION 'Workflow not found';
    END IF;
    
    -- Update claim
    UPDATE claims
    SET workflow_id = p_workflow_id,
        current_workflow_step = 1,
        workflow_status = 'pending',
        updated_at = now()
    WHERE id = p_claim_id;
END;
$$;

-- Get all claims for master brand
CREATE OR REPLACE FUNCTION "public"."get_all_claims_for_master_brand"("p_master_claim_brand_id" "uuid")
RETURNS TABLE(
    "id" "uuid",
    "claim_text" "text",
    "claim_type" "public"."claim_type_enum",
    "claim_category" "public"."claim_category_enum",
    "claim_level" "public"."claim_level_enum",
    "country_codes" "text"[],
    "product_ids" "uuid"[],
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
)
LANGUAGE "plpgsql"
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.claim_text,
        c.claim_type,
        c.claim_category,
        c.claim_level,
        ca.country_codes,
        ca.product_ids,
        c.created_at,
        c.updated_at
    FROM claims c
    JOIN claims_with_arrays ca ON c.id = ca.id
    WHERE c.master_claim_brand_id = p_master_claim_brand_id
    ORDER BY c.created_at DESC;
END;
$$;

-- Create workflow and log invitations
CREATE OR REPLACE FUNCTION "public"."create_workflow_and_log_invitations"(
    "p_name" "text",
    "p_brand_id" "uuid",
    "p_status" "public"."workflow_status",
    "p_steps" "jsonb"
)
RETURNS "uuid"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_workflow_id uuid;
    v_step jsonb;
    v_step_id uuid;
    v_assignee_id uuid;
    v_assignee_email text;
    v_user_exists boolean;
BEGIN
    -- Create workflow
    INSERT INTO workflows (name, user_id, brand_id, status)
    VALUES (p_name, auth.uid(), p_brand_id, p_status)
    RETURNING id INTO v_workflow_id;

    -- Create workflow steps and handle invitations
    FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
    LOOP
        v_assignee_id := (v_step->>'assignee_id')::uuid;
        
        -- Create workflow step
        INSERT INTO workflow_steps (
            workflow_id,
            name,
            order_index,
            assignee_id,
            due_days
        )
        VALUES (
            v_workflow_id,
            v_step->>'name',
            (v_step->>'order_index')::integer,
            v_assignee_id,
            (v_step->>'due_days')::integer
        )
        RETURNING id INTO v_step_id;

        -- If assignee_id is provided, check if it's a new user and log invitation
        IF v_assignee_id IS NOT NULL THEN
            -- Check if user exists
            SELECT EXISTS(
                SELECT 1 FROM auth.users WHERE id = v_assignee_id
            ) INTO v_user_exists;

            -- If user doesn't exist in auth.users, they were invited
            IF NOT v_user_exists THEN
                -- Get email from the step data (assuming it's passed)
                v_assignee_email := v_step->>'assignee_email';
                
                IF v_assignee_email IS NOT NULL THEN
                    -- Log the invitation
                    INSERT INTO invitation_logs (
                        workflow_id,
                        invited_email,
                        sent_by
                    )
                    VALUES (
                        v_workflow_id,
                        v_assignee_email,
                        auth.uid()
                    );

                    -- Also create workflow invitation record
                    INSERT INTO workflow_invitations (
                        workflow_id,
                        workflow_step_id,
                        email
                    )
                    VALUES (
                        v_workflow_id,
                        v_step_id,
                        v_assignee_email
                    )
                    ON CONFLICT (workflow_id, workflow_step_id, email) DO NOTHING;
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN v_workflow_id;
END;
$$;

-- Update workflow and handle invites
CREATE OR REPLACE FUNCTION "public"."update_workflow_and_handle_invites"(
    "p_workflow_id" "uuid",
    "p_name" "text",
    "p_status" "public"."workflow_status",
    "p_steps" "jsonb"
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_step jsonb;
    v_step_id uuid;
    v_assignee_id uuid;
    v_assignee_email text;
    v_existing_assignee_id uuid;
    v_user_exists boolean;
BEGIN
    -- Check permission
    IF NOT EXISTS (
        SELECT 1 FROM workflows 
        WHERE id = p_workflow_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Update workflow
    UPDATE workflows
    SET name = p_name,
        status = p_status,
        updated_at = now()
    WHERE id = p_workflow_id;

    -- Delete existing steps
    DELETE FROM workflow_steps WHERE workflow_id = p_workflow_id;

    -- Create new steps and handle invitations
    FOR v_step IN SELECT * FROM jsonb_array_elements(p_steps)
    LOOP
        v_assignee_id := (v_step->>'assignee_id')::uuid;
        
        -- Create workflow step
        INSERT INTO workflow_steps (
            workflow_id,
            name,
            order_index,
            assignee_id,
            due_days
        )
        VALUES (
            p_workflow_id,
            v_step->>'name',
            (v_step->>'order_index')::integer,
            v_assignee_id,
            (v_step->>'due_days')::integer
        )
        RETURNING id INTO v_step_id;

        -- Handle invitations for new assignees
        IF v_assignee_id IS NOT NULL THEN
            -- Check if user exists
            SELECT EXISTS(
                SELECT 1 FROM auth.users WHERE id = v_assignee_id
            ) INTO v_user_exists;

            IF NOT v_user_exists THEN
                v_assignee_email := v_step->>'assignee_email';
                
                IF v_assignee_email IS NOT NULL THEN
                    -- Log the invitation
                    INSERT INTO invitation_logs (
                        workflow_id,
                        invited_email,
                        sent_by
                    )
                    VALUES (
                        p_workflow_id,
                        v_assignee_email,
                        auth.uid()
                    )
                    ON CONFLICT DO NOTHING;

                    -- Create workflow invitation
                    INSERT INTO workflow_invitations (
                        workflow_id,
                        workflow_step_id,
                        email
                    )
                    VALUES (
                        p_workflow_id,
                        v_step_id,
                        v_assignee_email
                    )
                    ON CONFLICT (workflow_id, workflow_step_id, email) DO NOTHING;
                END IF;
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Get template input fields
CREATE OR REPLACE FUNCTION "public"."get_template_input_fields"("p_template_id" "uuid")
RETURNS "jsonb"
LANGUAGE "plpgsql"
STABLE
AS $$
DECLARE
    v_fields jsonb;
BEGIN
    SELECT fields INTO v_fields
    FROM content_templates
    WHERE id = p_template_id;
    
    IF v_fields IS NULL THEN
        RETURN '{"inputFields": []}'::jsonb;
    END IF;
    
    -- Handle both old and new format
    IF v_fields ? 'inputFields' THEN
        RETURN jsonb_build_object('inputFields', v_fields->'inputFields');
    ELSE
        -- Old format - return as inputFields
        RETURN jsonb_build_object('inputFields', v_fields);
    END IF;
END;
$$;

-- Get template output fields  
CREATE OR REPLACE FUNCTION "public"."get_template_output_fields"("p_template_id" "uuid")
RETURNS "jsonb"
LANGUAGE "plpgsql"
STABLE
AS $$
DECLARE
    v_fields jsonb;
BEGIN
    SELECT fields INTO v_fields
    FROM content_templates
    WHERE id = p_template_id;
    
    IF v_fields IS NULL THEN
        RETURN '{"outputFields": []}'::jsonb;
    END IF;
    
    -- Only new format has outputFields
    IF v_fields ? 'outputFields' THEN
        RETURN jsonb_build_object('outputFields', v_fields->'outputFields');
    ELSE
        -- Old format doesn't have outputFields
        RETURN '{"outputFields": []}'::jsonb;
    END IF;
END;
$$;

-- Delete template and update content
CREATE OR REPLACE FUNCTION "public"."delete_template_and_update_content"("template_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    -- Check if user owns the template or is an admin
    IF NOT EXISTS (
        SELECT 1 FROM content_templates 
        WHERE id = template_id 
        AND (user_id = auth.uid() OR EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        ))
    ) THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Update content to remove template reference
    UPDATE content 
    SET template_id = NULL 
    WHERE template_id = delete_template_and_update_content.template_id;

    -- Delete the template
    DELETE FROM content_templates 
    WHERE id = delete_template_and_update_content.template_id;
END;
$$;

-- Log security event
CREATE OR REPLACE FUNCTION "public"."log_security_event"(
    "p_event_type" "text",
    "p_event_description" "text",
    "p_ip_address" "text" DEFAULT NULL,
    "p_user_agent" "text" DEFAULT NULL,
    "p_additional_data" "jsonb" DEFAULT '{}'::jsonb
)
RETURNS "void"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO security_logs (
        event_type,
        event_description,
        user_id,
        ip_address,
        user_agent,
        additional_data
    ) VALUES (
        p_event_type,
        p_event_description,
        auth.uid(),
        p_ip_address,
        p_user_agent,
        p_additional_data
    );
END;
$$;

-- Handle new workflow assignment task creation
CREATE OR REPLACE FUNCTION "public"."handle_new_workflow_assignment_task_creation"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
    v_workflow_name text;
    v_content_title text;
    v_due_date timestamp with time zone;
    v_step_due_days integer;
BEGIN
    -- Only create task if assignee_id is not null
    IF NEW.assignee_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get workflow details
    SELECT name INTO v_workflow_name
    FROM workflows
    WHERE id = NEW.workflow_id;

    -- Get step due days
    SELECT due_days INTO v_step_due_days
    FROM workflow_steps
    WHERE id = NEW.current_workflow_step_id;

    -- Calculate due date if due_days is set
    IF v_step_due_days IS NOT NULL THEN
        v_due_date := now() + (v_step_due_days || ' days')::interval;
    END IF;

    -- Get content title
    SELECT title INTO v_content_title
    FROM content
    WHERE id = NEW.id;

    -- Create task for the assignee
    INSERT INTO user_tasks (
        user_id,
        title,
        description,
        due_date,
        metadata
    ) VALUES (
        NEW.assignee_id,
        'Review content: ' || COALESCE(v_content_title, 'Untitled'),
        'You have been assigned to review content in workflow: ' || v_workflow_name,
        v_due_date,
        jsonb_build_object(
            'type', 'workflow_assignment',
            'content_id', NEW.id,
            'workflow_id', NEW.workflow_id,
            'workflow_step_id', NEW.current_workflow_step_id
        )
    );

    RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER "update_brands_updated_at" 
    BEFORE UPDATE ON "public"."brands"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_claims_updated_at"
    BEFORE UPDATE ON "public"."claims"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_content_updated_at"
    BEFORE UPDATE ON "public"."content"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_content_templates_updated_at"
    BEFORE UPDATE ON "public"."content_templates"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_content_types_updated_at"
    BEFORE UPDATE ON "public"."content_types"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_feedback_items_updated_at"
    BEFORE UPDATE ON "public"."feedback_items"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_notifications_updated_at"
    BEFORE UPDATE ON "public"."notifications"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_profiles_updated_at"
    BEFORE UPDATE ON "public"."profiles"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_user_tasks_updated_at"
    BEFORE UPDATE ON "public"."user_tasks"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "update_workflows_updated_at"
    BEFORE UPDATE ON "public"."workflows"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."moddatetime"('updated_at');

CREATE TRIGGER "on_auth_user_created"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."handle_new_user"();

CREATE TRIGGER "create_profile_on_signup"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."create_profile_for_user"();

CREATE TRIGGER "handle_content_workflow_assignment"
    AFTER UPDATE OF "current_workflow_step_id" ON "public"."content"
    FOR EACH ROW
    WHEN ((NEW.current_workflow_step_id IS DISTINCT FROM OLD.current_workflow_step_id))
    EXECUTE FUNCTION "public"."handle_new_workflow_assignment_task_creation"();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE "public"."analytics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."brand_selected_agencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."claims" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."claim_countries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."claim_products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."claim_workflow_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."claims_workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."claims_workflow_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_ownership_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."content_vetting_agencies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."countries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feedback_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invitation_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."market_claim_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."master_claim_brands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."product_ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."security_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tool_run_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_brand_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_system_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."user_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workflow_invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workflow_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."workflow_user_assignments" ENABLE ROW LEVEL SECURITY;

-- Analytics policies
CREATE POLICY "Public read access to analytics" ON "public"."analytics"
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can insert analytics" ON "public"."analytics"
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Brands policies
CREATE POLICY "Public read access to brands" ON "public"."brands"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can insert brands" ON "public"."brands"
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Brand admins can update their brands" ON "public"."brands"
    FOR UPDATE
    USING (has_brand_permission(auth.uid(), id, 'admin'))
    WITH CHECK (has_brand_permission(auth.uid(), id, 'admin'));

CREATE POLICY "Brand admins can delete their brands" ON "public"."brands"
    FOR DELETE
    USING (has_brand_permission(auth.uid(), id, 'admin'));

-- Brand selected agencies policies
CREATE POLICY "Users with brand permission can view agencies" ON "public"."brand_selected_agencies"
    FOR SELECT
    USING (has_brand_permission(auth.uid(), brand_id));

CREATE POLICY "Brand admins can manage agencies" ON "public"."brand_selected_agencies"
    FOR ALL
    USING (has_brand_permission(auth.uid(), brand_id, 'admin'))
    WITH CHECK (has_brand_permission(auth.uid(), brand_id, 'admin'));

-- Claims policies
CREATE POLICY "Users can view claims for their brands" ON "public"."claims"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM brands b
            WHERE b.master_claim_brand_id = claims.master_claim_brand_id
            AND has_brand_permission(auth.uid(), b.id)
        )
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand admins can manage claims" ON "public"."claims"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM brands b
            WHERE b.master_claim_brand_id = claims.master_claim_brand_id
            AND has_brand_permission(auth.uid(), b.id, 'admin')
        )
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM brands b
            WHERE b.master_claim_brand_id = claims.master_claim_brand_id
            AND has_brand_permission(auth.uid(), b.id, 'admin')
        )
        OR is_global_admin(auth.uid())
    );

-- Claim countries policies
CREATE POLICY "Users can view claim countries" ON "public"."claim_countries"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM claims c
            JOIN brands b ON b.master_claim_brand_id = c.master_claim_brand_id
            WHERE c.id = claim_countries.claim_id
            AND has_brand_permission(auth.uid(), b.id)
        )
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand admins can manage claim countries" ON "public"."claim_countries"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM claims c
            JOIN brands b ON b.master_claim_brand_id = c.master_claim_brand_id
            WHERE c.id = claim_countries.claim_id
            AND has_brand_permission(auth.uid(), b.id, 'admin')
        )
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM claims c
            JOIN brands b ON b.master_claim_brand_id = c.master_claim_brand_id
            WHERE c.id = claim_countries.claim_id
            AND has_brand_permission(auth.uid(), b.id, 'admin')
        )
        OR is_global_admin(auth.uid())
    );

-- Claim products policies
CREATE POLICY "Users can view claim products" ON "public"."claim_products"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = claim_products.product_id
            AND has_brand_permission(auth.uid(), p.brand_id)
        )
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand admins can manage claim products" ON "public"."claim_products"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = claim_products.product_id
            AND has_brand_permission(auth.uid(), p.brand_id, 'admin')
        )
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = claim_products.product_id
            AND has_brand_permission(auth.uid(), p.brand_id, 'admin')
        )
        OR is_global_admin(auth.uid())
    );

-- Claim workflow history policies
CREATE POLICY "Users can view workflow history" ON "public"."claim_workflow_history"
    FOR SELECT
    USING (
        is_global_admin(auth.uid())
        OR EXISTS (
            SELECT 1 FROM claims c
            JOIN brands b ON b.master_claim_brand_id = c.master_claim_brand_id
            WHERE c.id = claim_workflow_history.claim_id
            AND has_brand_permission(auth.uid(), b.id)
        )
    );

CREATE POLICY "Authenticated users can insert history" ON "public"."claim_workflow_history"
    FOR INSERT
    WITH CHECK (auth.uid() = performed_by);

-- Claims workflows policies
CREATE POLICY "Anyone can view claims workflows" ON "public"."claims_workflows"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage claims workflows" ON "public"."claims_workflows"
    FOR ALL
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

-- Claims workflow steps policies
CREATE POLICY "Anyone can view workflow steps" ON "public"."claims_workflow_steps"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage workflow steps" ON "public"."claims_workflow_steps"
    FOR ALL
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

-- Content policies
CREATE POLICY "Users can view content they have permission for" ON "public"."content"
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR (brand_id IS NOT NULL AND has_brand_permission(auth.uid(), brand_id))
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Users can create content for their brands" ON "public"."content"
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            brand_id IS NULL
            OR has_brand_permission(auth.uid(), brand_id, 'editor')
            OR is_global_admin(auth.uid())
        )
    );

CREATE POLICY "Content owners and brand admins can update" ON "public"."content"
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR (brand_id IS NOT NULL AND has_brand_permission(auth.uid(), brand_id, 'admin'))
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        user_id = auth.uid()
        OR (brand_id IS NOT NULL AND has_brand_permission(auth.uid(), brand_id, 'admin'))
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Content owners and brand admins can delete" ON "public"."content"
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR (brand_id IS NOT NULL AND has_brand_permission(auth.uid(), brand_id, 'admin'))
        OR is_global_admin(auth.uid())
    );

-- Content ownership history policies
CREATE POLICY "Users can view ownership history for accessible content" ON "public"."content_ownership_history"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM content c
            WHERE c.id = content_ownership_history.content_id
            AND (
                c.user_id = auth.uid()
                OR (c.brand_id IS NOT NULL AND has_brand_permission(auth.uid(), c.brand_id))
                OR is_global_admin(auth.uid())
            )
        )
    );

CREATE POLICY "System can insert ownership history" ON "public"."content_ownership_history"
    FOR INSERT
    WITH CHECK (true);

-- Content templates policies
CREATE POLICY "Public read access to templates" ON "public"."content_templates"
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create templates" ON "public"."content_templates"
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            user_id = auth.uid()
            OR user_id IS NULL
        )
    );

CREATE POLICY "Template owners can update their templates" ON "public"."content_templates"
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Template owners can delete their templates" ON "public"."content_templates"
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    );

-- Content types policies
CREATE POLICY "Public read access to content types" ON "public"."content_types"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage content types" ON "public"."content_types"
    FOR ALL
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

-- Content versions policies
CREATE POLICY "Users can view versions of accessible content" ON "public"."content_versions"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM content c
            WHERE c.id = content_versions.content_id
            AND (
                c.user_id = auth.uid()
                OR (c.brand_id IS NOT NULL AND has_brand_permission(auth.uid(), c.brand_id))
                OR is_global_admin(auth.uid())
            )
        )
    );

CREATE POLICY "System can create content versions" ON "public"."content_versions"
    FOR INSERT
    WITH CHECK (true);

-- Content vetting agencies policies
CREATE POLICY "Anyone can view vetting agencies" ON "public"."content_vetting_agencies"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage vetting agencies" ON "public"."content_vetting_agencies"
    FOR ALL
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

-- Countries policies
CREATE POLICY "Public read access to countries" ON "public"."countries"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage countries" ON "public"."countries"
    FOR ALL
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

-- Feedback items policies
CREATE POLICY "Users can view all feedback" ON "public"."feedback_items"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create feedback" ON "public"."feedback_items"
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Feedback creators and admins can update" ON "public"."feedback_items"
    FOR UPDATE
    USING (
        created_by = auth.uid()
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        created_by = auth.uid()
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Admins can delete feedback" ON "public"."feedback_items"
    FOR DELETE
    USING (is_global_admin(auth.uid()));

-- Ingredients policies
CREATE POLICY "Public read access to ingredients" ON "public"."ingredients"
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create ingredients" ON "public"."ingredients"
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update ingredients" ON "public"."ingredients"
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete ingredients" ON "public"."ingredients"
    FOR DELETE
    USING (is_global_admin(auth.uid()));

-- Invitation logs policies
CREATE POLICY "Users can view invitation logs for their workflows" ON "public"."invitation_logs"
    FOR SELECT
    USING (
        sent_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = invitation_logs.workflow_id
            AND w.user_id = auth.uid()
        )
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "System can insert invitation logs" ON "public"."invitation_logs"
    FOR INSERT
    WITH CHECK (true);

-- Market claim overrides policies
CREATE POLICY "Users can view overrides for their brands" ON "public"."market_claim_overrides"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = market_claim_overrides.product_id
            AND has_brand_permission(auth.uid(), p.brand_id)
        )
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand admins can manage overrides" ON "public"."market_claim_overrides"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = market_claim_overrides.product_id
            AND has_brand_permission(auth.uid(), p.brand_id, 'admin')
        )
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = market_claim_overrides.product_id
            AND has_brand_permission(auth.uid(), p.brand_id, 'admin')
        )
        OR is_global_admin(auth.uid())
    );

-- Master claim brands policies
CREATE POLICY "Public read access to master claim brands" ON "public"."master_claim_brands"
    FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage master claim brands" ON "public"."master_claim_brands"
    FOR ALL
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON "public"."notifications"
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON "public"."notifications"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON "public"."notifications"
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications" ON "public"."notifications"
    FOR DELETE
    USING (user_id = auth.uid());

-- Products policies
CREATE POLICY "Users can view products for their brands" ON "public"."products"
    FOR SELECT
    USING (
        has_brand_permission(auth.uid(), brand_id)
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand editors can create products" ON "public"."products"
    FOR INSERT
    WITH CHECK (
        has_brand_permission(auth.uid(), brand_id, 'editor')
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand editors can update products" ON "public"."products"
    FOR UPDATE
    USING (
        has_brand_permission(auth.uid(), brand_id, 'editor')
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        has_brand_permission(auth.uid(), brand_id, 'editor')
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand admins can delete products" ON "public"."products"
    FOR DELETE
    USING (
        has_brand_permission(auth.uid(), brand_id, 'admin')
        OR is_global_admin(auth.uid())
    );

-- Product ingredients policies
CREATE POLICY "Users can view ingredients for accessible products" ON "public"."product_ingredients"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = product_ingredients.product_id
            AND has_brand_permission(auth.uid(), p.brand_id)
        )
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Brand editors can manage product ingredients" ON "public"."product_ingredients"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = product_ingredients.product_id
            AND has_brand_permission(auth.uid(), p.brand_id, 'editor')
        )
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM products p
            WHERE p.id = product_ingredients.product_id
            AND has_brand_permission(auth.uid(), p.brand_id, 'editor')
        )
        OR is_global_admin(auth.uid())
    );

-- Profiles policies
CREATE POLICY "Public read access to profiles" ON "public"."profiles"
    FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile" ON "public"."profiles"
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Security logs policies
CREATE POLICY "Users can view their own security logs" ON "public"."security_logs"
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "System can insert security logs" ON "public"."security_logs"
    FOR INSERT
    WITH CHECK (true);

-- Tool run history policies
CREATE POLICY "Users can view their own tool runs" ON "public"."tool_run_history"
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Users can create tool run records" ON "public"."tool_run_history"
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- User brand permissions policies
CREATE POLICY "Users can view all brand permissions" ON "public"."user_brand_permissions"
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Brand admins can manage permissions" ON "public"."user_brand_permissions"
    FOR ALL
    USING (
        has_brand_permission(auth.uid(), brand_id, 'admin')
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        has_brand_permission(auth.uid(), brand_id, 'admin')
        OR is_global_admin(auth.uid())
    );

-- User invitations policies
CREATE POLICY "Admins can view all invitations" ON "public"."user_invitations"
    FOR SELECT
    USING (is_global_admin(auth.uid()));

CREATE POLICY "Admins can create invitations" ON "public"."user_invitations"
    FOR INSERT
    WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Admins can update invitations" ON "public"."user_invitations"
    FOR UPDATE
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Admins can delete invitations" ON "public"."user_invitations"
    FOR DELETE
    USING (is_global_admin(auth.uid()));

-- User system roles policies
CREATE POLICY "Admins can view all system roles" ON "public"."user_system_roles"
    FOR SELECT
    USING (is_global_admin(auth.uid()));

CREATE POLICY "Admins can manage system roles" ON "public"."user_system_roles"
    FOR ALL
    USING (is_global_admin(auth.uid()))
    WITH CHECK (is_global_admin(auth.uid()));

-- User tasks policies
CREATE POLICY "Users can view their own tasks" ON "public"."user_tasks"
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create tasks" ON "public"."user_tasks"
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own tasks" ON "public"."user_tasks"
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own tasks" ON "public"."user_tasks"
    FOR DELETE
    USING (user_id = auth.uid());

-- Workflows policies
CREATE POLICY "Users can view workflows they're involved with" ON "public"."workflows"
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR (brand_id IS NOT NULL AND has_brand_permission(auth.uid(), brand_id))
        OR EXISTS (
            SELECT 1 FROM workflow_steps ws
            WHERE ws.workflow_id = workflows.id
            AND ws.assignee_id = auth.uid()
        )
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Users can create workflows for their brands" ON "public"."workflows"
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND (
            brand_id IS NULL
            OR has_brand_permission(auth.uid(), brand_id, 'admin')
            OR is_global_admin(auth.uid())
        )
    );

CREATE POLICY "Workflow owners can update their workflows" ON "public"."workflows"
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    )
    WITH CHECK (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    );

CREATE POLICY "Workflow owners can delete their workflows" ON "public"."workflows"
    FOR DELETE
    USING (
        user_id = auth.uid()
        OR is_global_admin(auth.uid())
    );

-- Workflow invitations policies
CREATE POLICY "Users can view invitations for their workflows" ON "public"."workflow_invitations"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_invitations.workflow_id
            AND (w.user_id = auth.uid() OR is_global_admin(auth.uid()))
        )
    );

CREATE POLICY "System can manage workflow invitations" ON "public"."workflow_invitations"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Workflow steps policies
CREATE POLICY "Users can view steps for accessible workflows" ON "public"."workflow_steps"
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_steps.workflow_id
            AND (
                w.user_id = auth.uid()
                OR (w.brand_id IS NOT NULL AND has_brand_permission(auth.uid(), w.brand_id))
                OR workflow_steps.assignee_id = auth.uid()
                OR is_global_admin(auth.uid())
            )
        )
    );

CREATE POLICY "Workflow owners can manage steps" ON "public"."workflow_steps"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_steps.workflow_id
            AND (w.user_id = auth.uid() OR is_global_admin(auth.uid()))
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_steps.workflow_id
            AND (w.user_id = auth.uid() OR is_global_admin(auth.uid()))
        )
    );

-- Workflow user assignments policies
CREATE POLICY "Users can view assignments for accessible workflows" ON "public"."workflow_user_assignments"
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM workflows w
            WHERE w.id = workflow_user_assignments.workflow_id
            AND (w.user_id = auth.uid() OR is_global_admin(auth.uid()))
        )
    );

CREATE POLICY "System can manage workflow assignments" ON "public"."workflow_user_assignments"
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create storage buckets (Note: These would be created via Supabase dashboard or API)
-- Storage bucket policies would be managed separately

-- Grant permissions
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- Grant permissions on all tables
GRANT ALL ON ALL TABLES IN SCHEMA "public" TO "postgres";
GRANT ALL ON ALL TABLES IN SCHEMA "public" TO "anon";
GRANT ALL ON ALL TABLES IN SCHEMA "public" TO "authenticated";
GRANT ALL ON ALL TABLES IN SCHEMA "public" TO "service_role";

-- Grant permissions on all sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA "public" TO "postgres";
GRANT ALL ON ALL SEQUENCES IN SCHEMA "public" TO "anon";
GRANT ALL ON ALL SEQUENCES IN SCHEMA "public" TO "authenticated";
GRANT ALL ON ALL SEQUENCES IN SCHEMA "public" TO "service_role";

-- Grant permissions on all functions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "public" TO "postgres";
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "public" TO "anon";
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "public" TO "authenticated";
GRANT ALL ON ALL FUNCTIONS IN SCHEMA "public" TO "service_role";

-- Insert initial data
-- Content types
INSERT INTO "public"."content_types" (name, slug, description) VALUES
('Blog Post', 'blog-post', 'Standard blog post format'),
('Social Media', 'social-media', 'Social media content'),
('Email', 'email', 'Email marketing content'),
('Product Description', 'product-description', 'Product descriptions and features'),
('Landing Page', 'landing-page', 'Landing page content')
ON CONFLICT (slug) DO NOTHING;

-- Countries
INSERT INTO "public"."countries" (code, name) VALUES
('US', 'United States'),
('GB', 'United Kingdom'),
('CA', 'Canada'),
('AU', 'Australia'),
('NZ', 'New Zealand'),
('IE', 'Ireland'),
('DE', 'Germany'),
('FR', 'France'),
('ES', 'Spain'),
('IT', 'Italy'),
('NL', 'Netherlands'),
('BE', 'Belgium'),
('SE', 'Sweden'),
('NO', 'Norway'),
('DK', 'Denmark'),
('FI', 'Finland')
ON CONFLICT (code) DO NOTHING;

-- End of squashed migration
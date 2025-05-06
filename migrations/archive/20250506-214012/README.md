# Archived Migration Files - 20250506-214012

These migration files have been consolidated into `consolidated_migrations.sql` and are kept for reference purposes only.

## Files Archived

- `add_approved_content_types.sql` -  Migration: Add approved content types to brands table
- `add_brand_color.sql` -  Add brand_color column to brands table
- `add_brand_summary_field.sql` -  Add brand_summary field to brands table
- `add_company_field.sql` -  Migration: Add company field to profiles table
- `add_created_by_to_brands.sql` -  Add created_by column to brands table
- `add_created_by_to_workflows.sql` -  Migration: Add created_by column to workflows table
- `add_job_description_to_profiles.sql` -  Add job_description column to profiles table
- `add_job_title_direct.sql` -  Simple migration to add job_title column to profiles table
- `add_job_title_if_missing.sql` -  Migration: Add job_title column to profiles table safely
- `add_job_title_to_profiles_v2.sql` -  Migration: Add job_title column to profiles table (v2)
- `add_job_title_to_profiles.sql` -  Migration: Add job_title column to profiles table
- `add_workflow_user_assignment.sql` -  Migration: Add workflow user assignments
- `add-profile-foreign-key.sql` -  Fix the missing foreign key constraint between profiles and auth.users
- `add-profiles-foreign-key.sql` -  Add foreign key constraint between profiles and auth.users
- `auth-rls-policies.sql` -  Row Level Security (RLS) Policies for MixerAI 2.0
- `check-mismatched-profiles.sql` -  Script to identify profiles that don't have matching auth.users entries
- `check-profile-trigger.sql` -  Script to check and ensure that the user profile is properly created after user invitation
- `check-service-role-permissions.sql` -  Script to check if the service role has proper permissions for user invitations
- `check-supabase-email-templates.sql` -  Script to check Supabase email templates
- `create-insert-user-manually.sql` -  Create the insert_user_manually function
- `create-manual-user-function.sql` -  Function to manually insert a user into auth.users and public.profiles
- `create-missing-profiles.sql` -  Script to create missing profiles for existing auth.users
- `fix_user_role_display.sql` -  Migration: Fix user role display in the user dashboard
- `fix-invitation-system-modified.sql` -  MixerAI 2.0 - Invitation System Fix Script (Modified)
- `fix-orphaned-profiles.sql` -  Script to handle orphaned profile records
- `fix-user-creation-revised.sql` -  MixerAI 2.0 - User Creation Fix Script (Revised)
- `fix-user-creation.sql` -  MixerAI 2.0 - User Creation Fix Script
- `rls_policies.sql` -  MixerAI 2.0 Row-Level Security Policies
- `simple_add_company_field.sql` -  Simple migration to add the company field to profiles table
- `squashed_migrations.sql` -  MixerAI 2.0 - Squashed Migrations
- `trace-auth-invitation-flow.sql` -  Script to trace the Supabase auth invitation flow
- `verify-invitation-schema.sql` -  Supabase User Invitation System Schema Verification

All these migrations have been consolidated into a single file: `migrations/consolidated_migrations.sql`.

# MixerAI 2.0 Database Documentation

This document provides an overview of the database architecture, schema, connection methods, and migration strategy for MixerAI 2.0.

## Database System

MixerAI 2.0 primarily uses **PostgreSQL** through **Supabase**. Supabase provides the backend infrastructure, including the database, authentication, and auto-generated APIs, while also allowing direct PostgreSQL connections for specific needs or local development.

## Connection Methods

The application supports two primary ways to connect to the database:

1.  **Supabase Connection (Recommended & Production Standard)**
    -   Used for all interactions in production and staging environments.
    -   Leverages the Supabase client libraries (`@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`).
    -   Ensures that all database operations go through Supabase, maintaining proper authentication and enforcing Row Level Security (RLS) policies.
    -   API routes typically use `createSupabaseAdminClient()` or `createServerComponentClient()` from `/src/lib/supabase/client.ts` (or similar Supabase helper initializations).
    -   **Configuration** (via `.env` file):
        ```env
        NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project-url.supabase.co
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
        SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

        # Set to false or remove to use Supabase for database access
        USE_DIRECT_POSTGRES=false
        ```

2.  **Direct PostgreSQL Connection (Local Development)**
    -   Can be used for local development or specific backend scripts.
    -   Implemented through a custom module like `src/lib/db.ts` (if it exists for direct `pg` library connections).
    -   Bypasses Supabase's API layer for direct database interaction.
    -   Typically enabled by setting `USE_DIRECT_POSTGRES=true` and providing direct PostgreSQL credentials.
    -   **Configuration** (via `.env` file when `USE_DIRECT_POSTGRES=true`):
        ```env
        POSTGRES_HOST=your_db_host
        POSTGRES_PORT=your_db_port
        POSTGRES_USER=your_db_user
        POSTGRES_PASSWORD=your_db_password
        POSTGRES_DB=your_db_name
        ```
    -   Local development can often be initiated using a script like `./scripts/use-local-db.sh` which might set these variables.

## Database Schema

The `supabase-schema.sql` file in the root directory IS the authoritative and complete definition of the current database schema. While schema changes can be made via the Supabase Studio UI, `supabase-schema.sql` should be kept in sync and serves as the master reference for the schema structure, including all tables, types, functions, triggers, and RLS policies.

The following schema details provide an overview. For precise and complete definitions, always refer to `supabase-schema.sql`.

### Enum Types

-   **`content_status`**: Defines the possible statuses for content.
    -   Values: `draft`, `pending_review`, `approved`, `published`, `rejected`, `cancelled`
-   **`user_role`**: Defines roles for users within brand contexts.
    -   Values: `admin`, `editor`, `viewer`
-   **`vetting_agency_priority_level`**: Defines priority levels for vetting agencies.
    -   Values: `High`, `Medium`, `Low`

### Table Definitions and Columns

(Based on Phase 1 query output. Includes key tables. For full details, refer to `supabase-schema.sql` or Supabase Studio.)

-   **`analytics`**: Stores analytics data for content.
    -   `id` (uuid, PK), `content_id` (uuid, FK to `content`), `views` (integer), `shares` (integer), `likes` (integer), `created_at` (timestamptz), `updated_at` (timestamptz).
-   **`brand_selected_agencies`**: Junction table for brands and selected vetting agencies.
    -   `brand_id` (uuid, PK, FK to `brands`), `agency_id` (uuid, PK, FK to `content_vetting_agencies`), `created_at` (timestamptz).
-   **`brands`**: Stores brand information.
    -   `id` (uuid, PK), `name` (text, NOT NULL), `website_url` (text), `country` (text), `language` (text), `brand_identity` (text), `tone_of_voice` (text), `guardrails` (text), `created_at` (timestamptz), `updated_at` (timestamptz), `brand_color` (text, default: '#3498db'), `brand_summary` (text), `brand_admin_id` (uuid, FK to `profiles`).
    -   *Note: Columns `website_urls`, `user_added_agencies`, `content_vetting_agencies` (as a direct field), `approved_content_types` mentioned in other docs were not present in the Phase 1 query output for this table but might exist or have different names/locations.*
-   **`content`**: Stores individual pieces of content.
    -   `id` (uuid, PK), `brand_id` (uuid, FK to `brands`), `workflow_id` (uuid, FK to `workflows`), `created_by` (uuid, FK to `profiles`), `title` (text, NOT NULL), `body` (text, NOT NULL), `meta_title` (text), `meta_description` (text), `status` (content_status enum, NOT NULL, default: 'draft'), `current_step` (integer, default: 0), `created_at` (timestamptz), `updated_at` (timestamptz), `template_id` (uuid, FK to `content_templates`), `content_data` (jsonb), `version` (integer, default: 1), `published_version` (integer), `content_type_id` (uuid, FK to `content_types`), `assigned_to` (uuid, FK to `profiles`).
-   **`content_ownership_history`**: Tracks changes in content ownership.
    -   `id` (uuid, PK), `content_id` (uuid, FK to `content`), `previous_owner` (uuid, FK to `profiles`), `new_owner` (uuid, FK to `profiles`), `changed_by` (uuid, FK to `profiles`), `reason` (text), `created_at` (timestamptz).
-   **`content_templates`**: Defines templates for creating content.
    -   `id` (uuid, PK), `name` (text, NOT NULL, UNIQUE), `description` (text), `icon` (text), `fields` (jsonb, NOT NULL), `created_by` (uuid, FK to `profiles`), `created_at` (timestamptz), `updated_at` (timestamptz).
-   **`content_types`**: (Potentially legacy or for predefined system types if `content_templates` is the primary mechanism).
    -   `id` (uuid, PK), `name` (text, NOT NULL, UNIQUE), `description` (text), `created_at` (timestamptz), `updated_at` (timestamptz).
-   **`content_versions`**: Stores versions of content.
    -   `id` (uuid, PK), `content_id` (uuid, FK to `content`, NOT NULL), `workflow_step_identifier` (text, NOT NULL), `step_name` (text), `version_number` (integer, NOT NULL), `content_json` (jsonb), `action_status` (text, NOT NULL), `feedback` (text), `reviewer_id` (uuid, FK to `profiles`), `created_at` (timestamptz, NOT NULL).
-   **`content_vetting_agencies`**: Stores information about content vetting agencies.
    -   `id` (uuid, PK), `name` (text, NOT NULL), `description` (text), `country_code` (varchar(2), NOT NULL), `created_at` (timestamptz), `updated_at` (timestamptz), `priority` (vetting_agency_priority_level enum). Unique on (`name`, `country_code`).
-   **`invitation_logs`**: Logs user invitation attempts.
    -   `id` (uuid, PK), `email` (text, NOT NULL), `success` (boolean, NOT NULL), `error_message` (text), `invited_by` (uuid, FK to `profiles`), `brand_id` (uuid, FK to `brands`), `created_at` (timestamptz).
-   **`notifications`**: Stores user notifications.
    -   `id` (uuid, PK), `user_id` (uuid, FK to `profiles`), `title` (text, NOT NULL), `message` (text, NOT NULL), `type` (text, NOT NULL), `is_read` (boolean, default: false), `action_url` (text), `action_label` (text), `created_at` (timestamptz).
-   **`profiles`**: Stores public user profile information, linked to `auth.users`.
    -   `id` (uuid, PK, FK to `auth.users`), `full_name` (text), `avatar_url` (text), `created_at` (timestamptz), `updated_at` (timestamptz), `job_title` (text), `company` (text), `email` (text), `job_description` (text).
-   **`user_brand_permissions`**: Junction table for user roles per brand.
    -   `id` (uuid, PK), `user_id` (uuid, FK to `profiles`), `brand_id` (uuid, FK to `brands`), `role` (user_role enum, NOT NULL, default: 'viewer'), `created_at` (timestamptz), `updated_at` (timestamptz). Unique on (`user_id`, `brand_id`).
-   **`user_invitations`**: Tracks user invitations.
    -   `id` (uuid, PK), `email` (text, NOT NULL), `invite_token` (text, NOT NULL, UNIQUE), `status` (text, NOT NULL, default: 'pending'), `invitation_source` (text, NOT NULL), `source_id` (uuid), `invited_by` (uuid, FK to `profiles`), `role` (text, NOT NULL), `last_reminder_at` (timestamptz), `reminder_count` (integer, default: 0), `expires_at` (timestamptz, NOT NULL), `created_at` (timestamptz), `updated_at` (timestamptz).
-   **`user_system_roles`**: Assigns system-wide roles to users.
    -   `id` (uuid, PK), `user_id` (uuid, FK to `profiles`), `role` (text, NOT NULL), `created_at` (timestamptz), `updated_at` (timestamptz). Unique on (`user_id`, `role`).
-   **`user_tasks`**: Tracks tasks assigned to users.
    -   `id` (uuid, PK), `user_id` (uuid, FK to `profiles`, NOT NULL), `content_id` (uuid, FK to `content`, NOT NULL), `workflow_id` (uuid, FK to `workflows`, NOT NULL), `workflow_step_id` (text, NOT NULL), `workflow_step_name` (text), `status` (text, default: 'pending'), `created_at` (timestamptz), `updated_at` (timestamptz), `due_date` (timestamptz). Unique on (`user_id`, `content_id`, `workflow_step_id`).
-   **`workflow_invitations`**: Tracks invitations for external users to participate in workflow steps.
    -   `id` (uuid, PK), `workflow_id` (uuid, FK to `workflows`), `step_id` (integer, NOT NULL), `email` (text, NOT NULL), `role` (text, NOT NULL), `invite_token` (text, NOT NULL, UNIQUE), `status` (text, default: 'pending'), `created_at` (timestamptz), `expires_at` (timestamptz, NOT NULL). Unique on (`workflow_id`, `step_id`, `email`).
-   **`workflow_user_assignments`**: Assigns registered users to workflow steps.
    -   `id` (uuid, PK), `workflow_id` (uuid, FK to `workflows`), `step_id` (integer, NOT NULL), `user_id` (uuid, FK to `profiles`), `created_at` (timestamptz), `updated_at` (timestamptz). Unique on (`workflow_id`, `step_id`, `user_id`).
-   **`workflows`**: Defines workflow processes.
    -   `id` (uuid, PK), `brand_id` (uuid, FK to `brands`), `name` (text, NOT NULL), `steps` (jsonb, NOT NULL, default: '[]'), `created_at` (timestamptz), `updated_at` (timestamptz), `created_by` (uuid, FK to `profiles`), `template_id` (uuid, FK to `content_templates`), `description` (text).

### Foreign Key Relationships Summary

(Based on Phase 3 query output)
-   Numerous FKs link tables like `content`, `workflows`, `user_brand_permissions` back to `brands` and `profiles`.
-   Delete actions vary:
    -   **Cascade Deletes (`ON DELETE CASCADE`)** are common from parent entities like `brands` and `content` to their direct children (e.g., `analytics` from `content`; `content` from `brands`).
    -   **Set Null (`ON DELETE SET NULL`)** is used for fields like `created_by` or `workflow_id` in `content` if the referenced profile or workflow is deleted.
    -   **Restrict/No Action (`ON DELETE NO ACTION`)** is the default for others, preventing deletion of a parent row if child rows exist (e.g., `content_templates` for `content.template_id`).
-   Update actions are mostly "NO ACTION".

### Primary Key and Unique Constraints Summary

(Based on Phase 4 query output)
-   Most tables use a single UUID `id` column as their `PRIMARY KEY`.
-   `brand_selected_agencies` uses a composite PK (`brand_id`, `agency_id`).
-   Numerous `UNIQUE` constraints enforce data integrity (e.g., `content_templates.name`, `user_brand_permissions_user_id_brand_id_key`, `user_invitations_invite_token_key`).

## Row Level Security (RLS)

RLS is extensively used to control data access based on the authenticated user's identity and roles.

### General RLS Principles Observed (from Phase 5 output):

-   **Public View, Restricted Modification**: Many tables allow broad `SELECT` access (e.g., `using_expression = true`) but restrict `INSERT`, `UPDATE`, `DELETE` based on user roles and ownership.
-   **Ownership-Based Access**: Users can typically update their own `profiles` and related data like `notifications`.
-   **Brand-Level Permissions**: Access to `brands`, `content`, and `workflows` is often governed by `user_brand_permissions`. For example, a user might need to be an 'admin' or 'editor' for a specific `brand_id` to modify related data.
-   **System Roles (`user_system_roles`)**: A 'superadmin' role (or similar) grants broader permissions for administrative tasks like managing `content_ownership_history` or all `user_invitations`.
-   **`auth.uid()`**: This function is central to many RLS policies, dynamically filtering data based on the ID of the currently authenticated user.
-   **Policy Application**: Policies often apply to a wide range of database roles (including `authenticated`, `service_role`), with the policy's expression (`USING` or `WITH CHECK` clause) performing the actual permission logic.

*(For complete and up-to-date schema including all RLS policies and their precise expressions, always refer to the `supabase-schema.sql` file in the project root.)*

## Migrations

Schema changes and migrations for MixerAI 2.0 are managed as follows:

-   **`supabase-schema.sql` (Authoritative Source)**: The `supabase-schema.sql` file located in the project root is the single source of truth for the complete database schema. It should be updated when schema changes are made (e.g., after making changes in Supabase Studio, dump the schema to this file).
-   **Supabase Studio UI**: Schema changes can be made directly in the Supabase Studio. After making changes, the `supabase-schema.sql` file must be updated to reflect these changes (e.g., by using `supabase db dump --schema-only -f supabase-schema.sql` if the project is linked, or by manually exporting and updating).
-   **Archived Migration Files**:
    -   The `supabase/migrations_archive_YYYYMMDD` (where YYYYMMDD is the archival date) directory contains a past archive of Supabase CLI migration files. These are no longer active and are kept for historical reference only.
    -   The `migrations/archive/` directory contains previously used individual SQL migration scripts and consolidated migration files. These have been superseded by the comprehensive `supabase-schema.sql` and are also kept for historical reference only.

### Approach to Schema Management (Simplified)

1.  **`supabase-schema.sql` is King**: This file holds the complete, current schema.
2.  **Changes via Supabase UI**: If you modify the schema in the Supabase UI, you **must** update `supabase-schema.sql` to reflect these changes.
3.  **No New Individual Migration Files**: Do not add new SQL files to `supabase/migrations` or `migrations/` for schema changes. Update `supabase-schema.sql` directly.
4.  **Historical Archives**: The `supabase/migrations_archive_...` and `migrations/archive/` directories are for historical purposes only and should not be used for applying schema changes.

This simplified approach ensures that `supabase-schema.sql` remains the definitive reference for the database structure.

## Database Utility Scripts

The project may include several utility scripts in the `/scripts` directory for database management, such as:

-   `use-local-db.sh`: Configures the application to use a local PostgreSQL instance.
-   `reset-database.sh`: Resets the database to a clean schema (potentially using `supabase-schema.sql`).
-   `clean-database.sh`: Removes data while preserving schema.
-   `add-test-user.sh`: Adds a test user.
-   `apply-specific-migration.sh`: For applying individual SQL changes.

Refer to the `/scripts` directory for available tools. 
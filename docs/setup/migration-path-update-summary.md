# Migration Path Update Summary

## Overview
This document summarizes the files that were updated to reference the new `supabase/migrations/` directory instead of the old `migrations/` directory.

## Files Updated

### 1. Scripts Directory
- **`/scripts/check-advance-workflow-function.js`**
  - Updated line 33: Changed `/migrations/20250117_add_workflow_history_fields.sql` to `/supabase/migrations/20250117_add_workflow_history_fields.sql`

- **`/scripts/test-admin-api.js`**
  - Updated line 174: Changed `migrations/diagnose-invitation-system.sql` to `supabase/migrations/diagnose-invitation-system.sql`
  - Updated line 176: Changed `migrations/fix-invitation-system-modified.sql` to `supabase/migrations/fix-invitation-system-modified.sql`

### 2. Documentation Files
- **`/STORAGE_SETUP.md`**
  - Updated line 137: Changed `migrations/20241217_create_missing_profiles.sql` to `supabase/migrations/20241217_create_missing_profiles.sql`

- **`/CLAUDE.md`**
  - Updated line 359: Changed `/migrations/` to `/supabase/migrations/` in the Development Resources section

- **`/docs/ARCHITECTURE.md`**
  - Updated line 70: Changed `├── migrations/` to `├── supabase/migrations/` in the project structure diagram

## Scripts Already Using Correct Path
The following scripts were already correctly referencing `supabase/migrations/`:
- setup-local-db.sh
- init-database.sh
- apply-template-migration.sh
- deploy-rls-policies.sh
- apply-profile-job-title-migration.sh
- reset-database.sh
- apply-email-migration.sh
- apply-claims-workflow-migrations.sh
- apply-rls-policies.sh
- apply-claims-workflow-brand-migration.sh
- run-migrations.sh

## Verification
All references to the old `migrations/` directory have been updated. The codebase now consistently uses `supabase/migrations/` for all database migration files.

## Date
Updated on: 2025-06-17
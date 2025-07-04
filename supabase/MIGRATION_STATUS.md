# Migration Status Report
Date: 2025-06-18

## Summary

After reviewing the current database schema (`2025-06-18-schema.sql`) against all migration files, I found that most migrations have been applied, but two are still pending:

### Applied Migrations (Already in Schema)
✅ `20241218_add_claim_reviews_table.sql` - claim_reviews table exists
✅ `20241218_add_notification_settings_to_profiles.sql` - notification_settings JSONB column exists
✅ `20250118_notifications_table_complete.sql` - notifications table exists
✅ `20250618_add_due_date_to_content.sql` - due_date column exists in content table
✅ `20250618_squashed_complete_schema.sql` - base schema is present

### Pending Migrations (NOT in Schema)
❌ `20250618_add_batch_support_to_tool_runs.sql` - batch_id and batch_sequence columns missing from tool_run_history
❌ `20250618_add_email_preferences.sql` - email preference columns missing from profiles table

## Actions Taken

1. Created `20250618_final_squashed_schema.sql` that contains ONLY the missing changes that need to be applied
2. Created `cleanup_applied_migrations.sh` script to remove old migration files after the final migration is applied

## Next Steps

1. **Apply the final migration** to add the missing columns:
   ```bash
   ./scripts/run-migrations.sh
   ```
   Or manually run the SQL in `20250618_final_squashed_schema.sql`

2. **After confirming the migration is successful**, clean up old files:
   ```bash
   cd supabase/migrations
   ./cleanup_applied_migrations.sh
   ```

3. **Commit the changes** to git

## Note on Schema Differences

The schema shows that:
- `tool_run_history` table exists but lacks batch_id and batch_sequence columns
- `profiles` table has notification_settings as JSONB but lacks the new granular email preference columns
- All other tables and columns from previous migrations are present
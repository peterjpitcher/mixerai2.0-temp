# MixerAI 2.0 Invitation System Troubleshooting

This document provides steps to diagnose and fix issues with the user invitation system.

## Diagnosing the Issue

The invitation system in MixerAI 2.0 relies on proper database configuration and Supabase authentication. When you encounter the error "Failed to invite user" with "Database error saving new user", follow these steps:

### 1. Run the Diagnostic SQL Script

Connect to your Supabase database and run the diagnostic script:

```bash
psql <YOUR_SUPABASE_CONNECTION_STRING> -f migrations/diagnose-invitation-system.sql
```

Or copy the contents of `migrations/diagnose-invitation-system.sql` and execute them in the SQL Editor in the Supabase dashboard.

This script will check:
- Required tables (profiles, auth.users, user_brand_permissions)
- Foreign key relationships
- Triggers and functions
- Row-level security policies
- Orphaned records
- User permissions

### 2. Test the Connection in the UI

In the invitation page, you can now click "Run Connection Test" in the debug panel to check:
- Supabase service role key validity
- Database connection
- Auth service connection
- Table existence

### 3. Run the JavaScript Test Script

Execute the Node.js test script to attempt a direct invitation:

```bash
# Install dependencies if needed
npm install dotenv @supabase/supabase-js

# Run the test script
node scripts/test-invitation-system.js
```

This script will try to invite a test user and diagnose any issues encountered.

## Common Issues and Fixes

### Issue 1: Missing Trigger on auth.users

If the diagnostic shows no trigger on auth.users to create profiles, run the fix script:

```bash
psql <YOUR_SUPABASE_CONNECTION_STRING> -f migrations/fix-invitation-system.sql
```

This creates the necessary trigger that automatically creates a profile when a user is invited.

### Issue 2: Invalid Service Role Key

If the service role key is invalid or expired:

1. Go to your Supabase dashboard
2. Navigate to Project Settings > API
3. Copy the service_role key (starts with "eyJh...")
4. Update your `.env` file with the new key:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_new_key
   ```

### Issue 3: Missing Foreign Key Relationships

If the profiles table doesn't have the correct foreign key to auth.users, the fix script will add it.

### Issue 4: Row-Level Security (RLS) Issues

The fix script sets up the correct RLS policies to allow:
- Service role to access auth.users
- Creation of profile records
- Assignment of permissions

### Issue 5: Permission Issues

Make sure your current user has admin permissions by checking the user_brand_permissions table.

## After Running the Fix

1. Restart your Next.js server
2. Try inviting a user again through the UI
3. Check the debug panel for any remaining issues

If problems persist, you may need to check the Supabase logs in the dashboard for more detailed error messages.

## Manual User Creation (Last Resort)

If the automatic invitation system cannot be fixed, you can use the SQL function created in the fix script to manually create users:

```sql
SELECT insert_user_manually(
  'example@example.com',  -- email
  'Example User',         -- full_name
  'admin',                -- role
  'some-uuid-here'        -- brand_id (optional)
);
```

This will insert a user directly into the database, bypassing the invitation flow. 
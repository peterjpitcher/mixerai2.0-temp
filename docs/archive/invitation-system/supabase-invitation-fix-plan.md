# Supabase User Invitation System Fix Plan

## Issue Summary

The MixerAI 2.0 platform is experiencing a critical error when attempting to invite new users to the system. When an administrator attempts to invite a user via the `/api/users/invite` endpoint, the request fails with a 500 Internal Server Error. The detailed logs show a consistent error from the Supabase Auth API:

```
Unhandled invitation error: {
  message: 'Database error saving new user',
  code: 'unexpected_failure',
  status: 500
}
```

This error occurs during the `inviteUserByEmail` call to the Supabase Auth API. The error indicates a problem with the database layer of Supabase Auth, specifically related to saving new user records.

## Diagnostic Steps Taken

1. Added comprehensive logging throughout the invitation process
2. Verified all required database fields exist in relevant tables
3. Checked authentication configuration and API access
4. Applied migrations to add necessary fields:
   - `job_title` field to profiles table
   - `verification_code` to workflow_invitations table
   - Fixed nested DO blocks in email synchronization script

Despite these changes, the error persists with the exact same message from Supabase.

## Root Cause Analysis

Based on the error logs and research, we've identified several potential root causes:

1. **Supabase Auth Database Schema Mismatch**: The most probable cause is a mismatch between what the Supabase Auth API expects and what's available in the database schema.

2. **Conflicting Triggers**: The email synchronization trigger we created might conflict with Supabase's internal user creation process.

3. **Service Role Permission Issues**: The service role key might not have the necessary permissions to create users in the auth schema.

4. **Row Level Security (RLS) Blocking**: Custom RLS policies might be preventing user creation.

5. **Database Constraints**: There could be constraints in the auth.users table that are causing the insertion to fail.

## Enhanced Action Plan

### 1. Strengthen Diagnostics

**Priority: Critical**
**Timeline: Immediate**

#### 1.1 Enhanced Logging

1. Enable full SQL logging on a staging replica:
```sql
-- Set on staging database to capture full SQL statements
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();
```

2. Capture complete request/response payloads:
```javascript
// Add to src/app/api/users/invite/route.ts
// Before supabase.auth.admin.inviteUserByEmail call
console.log('INVITE_PAYLOAD', {
  email: body.email,
  options: {
    data: {
      // Redact sensitive info
      full_name: typeof body.full_name === 'string' ? '[PRESENT]' : '[MISSING]',
      role: body.role.toLowerCase(),
      invited_by: '[REDACTED]',
      job_title: typeof body.job_title === 'string' ? '[PRESENT]' : '[MISSING]'
    }
  }
});

// After call
console.log('INVITE_RESPONSE', {
  success: !error,
  errorDetails: error ? {
    message: error.message,
    code: error.code,
    status: error.status,
    pgError: error.details || null
  } : null
});
```

#### 1.2 Isolate Custom Database Logic

1. Temporarily disable all custom triggers on auth tables:
```sql
-- Run this on staging environment to test if custom triggers are the issue
ALTER TABLE auth.users DISABLE TRIGGER ALL;
-- Test invitation flow
-- Then re-enable:
ALTER TABLE auth.users ENABLE TRIGGER ALL;
```

#### 1.3 RLS Policy Verification

1. Simulate the service role in psql and attempt direct inserts:
```sql
-- Connect using service role in psql
SET jwt.claims.role = 'service_role';

-- Attempt a test insertion
INSERT INTO auth.users (
  instance_id, email, encrypted_password, email_confirmed_at, 
  raw_app_meta_data, raw_user_meta_data, created_at
) VALUES (
  (SELECT id FROM auth.instances LIMIT 1),
  'test@example.com',
  'DUMMY_PASSWORD_HASH',
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Test User", "role": "viewer", "job_title": "Tester"}'::jsonb,
  now()
);
```

### 2. Improve Configuration & Access Checks

**Priority: High**
**Timeline: Immediate**

#### 2.1 Audit Supabase Project Settings

1. Use the Supabase Dashboard or CLI:
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login and list project settings
supabase login
supabase projects list
supabase settings list --project-ref <project-id>
```

2. Specifically verify these settings:
   - `auth.allowed_email_signups`: Ensure email invites are allowed
   - `auth.external_email_provider`: Check if custom SMTP is configured
   - Rate limits on user creation
   - User quotas (maximum users allowed)

#### 2.2 Service Role Key Lifecycle

1. Generate a new service role key:
   - Go to Supabase Dashboard → Settings → API
   - Generate new service_role key
   - Revoke the old key immediately after testing new one

2. Add CI pipeline check for key validity:
```javascript
// scripts/validate-service-role-key.js
const { createClient } = require('@supabase/supabase-js');

async function validateServiceRoleKey() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  // Basic verification - attempt to list a small number of users
  const { data, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1
  });
  
  if (error) {
    console.error('Service role key validation failed:', error);
    process.exit(1);
  }
  
  console.log('Service role key is valid');
  process.exit(0);
}

validateServiceRoleKey();
```

### 3. Automate Schema Drift Detection

**Priority: Medium**
**Timeline: Day 1**

#### 3.1 CI Health Check

1. Integrate schema diff checks into your CI pipeline:
```bash
# Add to CI workflow
supabase db diff --from-prod=staging
if [ $? -ne 0 ]; then
  echo "Schema drift detected! Failing build."
  exit 1
fi
```

#### 3.2 Scheduled Schema Reports

1. Create a nightly schema snapshot job:
```sql
-- Create schema snapshot function
CREATE OR REPLACE FUNCTION maintenance.create_schema_snapshot()
RETURNS void AS $$
BEGIN
  -- Capture auth schema
  CREATE TABLE IF NOT EXISTS maintenance.schema_snapshots (
    id SERIAL PRIMARY KEY,
    schema_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    snapshot JSONB NOT NULL
  );
  
  -- Auth schema snapshot
  INSERT INTO maintenance.schema_snapshots 
    (schema_name, snapshot)
  SELECT 
    'auth', 
    jsonb_agg(
      jsonb_build_object(
        'table_name', table_name,
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable
      )
    )
  FROM information_schema.columns
  WHERE table_schema = 'auth';
  
  -- Public schema snapshot
  INSERT INTO maintenance.schema_snapshots 
    (schema_name, snapshot)
  SELECT 
    'public', 
    jsonb_agg(
      jsonb_build_object(
        'table_name', table_name,
        'column_name', column_name,
        'data_type', data_type,
        'is_nullable', is_nullable
      )
    )
  FROM information_schema.columns
  WHERE table_schema = 'public';
END;
$$ LANGUAGE plpgsql;

-- Create cron job
SELECT cron.schedule(
  'nightly-schema-snapshot',
  '0 0 * * *',
  'SELECT maintenance.create_schema_snapshot()'
);
```

2. Create a schema drift detection alert:
```sql
-- Create alert function
CREATE OR REPLACE FUNCTION maintenance.alert_on_schema_changes()
RETURNS void AS $$
DECLARE
  auth_changes INTEGER;
  public_changes INTEGER;
BEGIN
  -- Check for changes in auth schema
  WITH last_two_auth AS (
    SELECT snapshot
    FROM maintenance.schema_snapshots
    WHERE schema_name = 'auth'
    ORDER BY created_at DESC
    LIMIT 2
  )
  SELECT COUNT(*)
  INTO auth_changes
  FROM (
    SELECT * FROM last_two_auth
    LIMIT 1
  ) AS current_snapshot
  CROSS JOIN LATERAL (
    SELECT * FROM last_two_auth
    OFFSET 1
    LIMIT 1
  ) AS previous_snapshot
  WHERE current_snapshot.snapshot <> previous_snapshot.snapshot;
  
  -- Similar check for public schema...
  
  -- Send alert if changes detected
  IF auth_changes > 0 OR public_changes > 0 THEN
    -- Insert into alerts table or use pg_notify
    INSERT INTO maintenance.alerts (alert_type, message)
    VALUES ('schema_drift', format('Schema changes detected: auth=%s, public=%s', 
                                  auth_changes, public_changes));
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 4. Refine Custom Trigger Deployment

**Priority: High**
**Timeline: Day 1**

#### 4.1 Staged Rollout & Load Testing

1. Deploy to staging first and perform load testing:
```bash
# Script to simulate concurrent invites (for load testing)
node scripts/simulate-invitation-load.js --concurrent=1000
```

2. Load testing simulation script:
```javascript
// scripts/simulate-invitation-load.js
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('concurrent', {
    type: 'number',
    description: 'Number of concurrent invites to simulate',
    default: 10
  })
  .argv;

async function simulateInvites() {
  const apiUrl = process.env.API_URL || 'http://localhost:3000/api/users/invite';
  const apiKey = process.env.API_KEY;
  
  console.log(`Simulating ${argv.concurrent} concurrent invites...`);
  
  const promises = [];
  for (let i = 0; i < argv.concurrent; i++) {
    const email = `test${i}@example.com`;
    
    promises.push(fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        email,
        role: 'viewer',
        full_name: `Test User ${i}`,
        job_title: 'Tester'
      })
    }));
  }
  
  const results = await Promise.allSettled(promises);
  
  const successful = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`Results: ${successful} successful, ${failed} failed`);
}

simulateInvites().catch(console.error);
```

#### 4.2 Improved Trigger Safety

Implement the revised trigger with additional safeguards:

```sql
-- Revised email synchronization trigger with additional safeguards
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if email has changed to avoid unnecessary updates
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    -- Avoid errors if profile doesn't exist yet
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      UPDATE public.profiles
      SET 
        email = NEW.email,
        updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;
  
  -- Always return NEW to ensure trigger doesn't block operation
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make trigger only fire on UPDATE, not INSERT
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION sync_user_email();
```

### 5. Backup Direct-Insertion Strategy

**Priority: High**
**Timeline: Day 1-2**

#### 5.1 Official SDK with Retries

Implement a retry mechanism using the official Supabase SDK:

```javascript
// src/lib/invitation-with-retry.ts
import { createClient } from '@supabase/supabase-js';

export async function inviteUserWithRetry(email: string, options: any, maxRetries = 3) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  let lastError = null;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Exponential backoff
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s, 4s, etc.
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, options);
      
      if (error) {
        lastError = error;
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed:`, error);
        attempt++;
        continue;
      }
      
      return { data, error: null };
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt + 1}/${maxRetries} failed with exception:`, error);
      attempt++;
    }
  }
  
  // If all retries failed, log additional diagnostics and return the last error
  console.error(`All ${maxRetries} invitation attempts failed for ${email}`);
  return { data: null, error: lastError };
}
```

#### 5.2 Safer Direct User Creation

Improve the stored procedure for direct user creation:

```sql
-- Create direct user creation function with additional safety
CREATE OR REPLACE FUNCTION create_user_directly(
  p_email TEXT,
  p_password TEXT,
  p_role TEXT,
  p_full_name TEXT,
  p_job_title TEXT
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_instance_id uuid;
  v_bf_rounds TEXT := '10'; -- Document current Supabase hashing params
BEGIN
  -- Parameter validation
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_email;
  
  IF v_user_id IS NOT NULL THEN
    RAISE EXCEPTION 'User with email % already exists', p_email;
  END IF;
  
  -- Get instance_id safely
  SELECT id INTO v_instance_id 
  FROM auth.instances 
  LIMIT 1;
  
  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'No auth instance found';
  END IF;
  
  -- Begin transaction
  BEGIN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    ) VALUES (
      v_instance_id,
      p_email,
      crypt(p_password, gen_salt('bf', v_bf_rounds)),
      now(),
      jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
      jsonb_build_object(
        'full_name', p_full_name,
        'role', p_role,
        'job_title', p_job_title
      ),
      now(),
      now()
    )
    RETURNING id INTO v_user_id;
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      'email',
      now(),
      now()
    );
    
    -- Insert into profiles
    INSERT INTO public.profiles (
      id,
      email,
      full_name,
      job_title,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      p_email,
      p_full_name,
      p_job_title,
      now(),
      now()
    );
    
    RETURN v_user_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error details for debugging
      RAISE WARNING 'Error creating user: % - %', SQLERRM, SQLSTATE;
      RAISE; -- Re-throw the error
  END;
END;
$$;

-- Add unit test function
CREATE OR REPLACE FUNCTION test_create_user_directly()
RETURNS SETOF TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  -- Test valid user creation
  RETURN NEXT has_function(
    'public', 'create_user_directly',
    'Function should exist'
  );
  
  -- Test parameter validation
  BEGIN
    PERFORM create_user_directly(
      NULL, 'password', 'viewer', 'Test', 'Tester'
    );
    RETURN NEXT ok(FALSE, 'Should reject null email');
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NEXT ok(TRUE, 'Correctly rejected null email');
  END;
  
  -- More tests here...
END;
$$;
```

### 6. Enhance UI & Admin Experience

**Priority: Medium**
**Timeline: Day 1-2**

#### 6.1 Dry-Run Invitation Mode

Add a "Check Invite" feature to validate without sending:

```javascript
// Add to src/app/api/users/check-invite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { withAuth } from '@/lib/auth/api-auth';

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    const supabase = createSupabaseAdminClient();
    const body = await request.json();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(body.email);
    
    // Check if user already exists
    const { data: existingUser, error: userCheckError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', body.email)
      .maybeSingle();
    
    // Check service role permissions
    const { data: testAdminAccess, error: adminAccessError } = 
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    return NextResponse.json({ 
      success: true, 
      validation: {
        email: {
          valid: isEmailValid,
          message: isEmailValid ? 'Valid email format' : 'Invalid email format'
        },
        userExists: !!existingUser,
        serviceRolePermission: !adminAccessError,
        role: body.role && ['admin', 'editor', 'viewer'].includes(body.role.toLowerCase())
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Validation failed',
      details: error.message 
    }, { status: 500 });
  }
});
```

#### 6.2 CSV Manual Import Fallback

Add UI component for CSV download when API fails:

```javascript
// UI component for manual CSV invitation fallback
function InvitationFailbackUI({ emails, roles }) {
  const downloadCSV = () => {
    const csvContent = [
      ['Email', 'Role', 'Full Name', 'Job Title'],
      ...emails.map((email, i) => [email, roles[i] || 'viewer', '', ''])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_invite_users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="fallback-container">
      <h3>Invitation API Unavailable</h3>
      <p>The invitation API is currently unavailable. You can:</p>
      <ol>
        <li>Download a CSV template with these users</li>
        <li>Import them via the Supabase Dashboard</li>
      </ol>
      <button onClick={downloadCSV}>
        Download CSV Template
      </button>
      <a 
        href="https://app.supabase.com/project/your-project-id/auth/users"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open Supabase Dashboard
      </a>
    </div>
  );
}
```

### 7. Monitoring, Testing & Rollout Control

**Priority: High**
**Timeline: Days 1-3**

#### 7.1 End-to-End Test Suite

Create automated tests for the invitation flow:

```javascript
// tests/invitation-flow.test.js
describe('User Invitation Flow', () => {
  it('should successfully invite a new user', async () => {
    // Generate a unique test email
    const testEmail = `test-${Date.now()}@example.com`;
    
    // 1. Send invitation via API
    const inviteResponse = await fetch('/api/users/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        role: 'viewer',
        full_name: 'Test User',
        job_title: 'Tester'
      })
    });
    
    expect(inviteResponse.status).toBe(200);
    const inviteData = await inviteResponse.json();
    expect(inviteData.success).toBe(true);
    
    // 2. Verify user was created in auth.users
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(testEmail);
    expect(authUser).not.toBeNull();
    
    // 3. Verify profile was created
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', testEmail)
      .single();
    
    expect(profile).not.toBeNull();
    expect(profile.full_name).toBe('Test User');
    expect(profile.job_title).toBe('Tester');
    
    // Clean up test user
    await supabase.auth.admin.deleteUser(authUser.id);
  });
});
```

#### 7.2 Sentry Integration

Add Sentry monitoring for invitation errors:

```javascript
// src/lib/sentry.js
import * as Sentry from '@sentry/nextjs';

export function captureInvitationError(error, context = {}) {
  Sentry.withScope((scope) => {
    scope.setLevel('error');
    scope.setTag('feature', 'user_invitation');
    
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value);
    });
    
    Sentry.captureException(error);
  });
}

// Then in the invite API:
import { captureInvitationError } from '@/lib/sentry';

// In the error handler:
captureInvitationError(error, {
  email: body.email,
  errorType: error.code || 'unknown',
  serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
});
```

#### 7.3 Feature Flags

Implement feature flags for controlled rollout:

```javascript
// src/lib/feature-flags.js
export const FEATURE_FLAGS = {
  INVITE_V2: process.env.FEATURE_INVITE_V2 === 'true',
  INVITE_DIRECT_SQL: process.env.FEATURE_INVITE_DIRECT_SQL === 'true',
  INVITE_RETRY_LOGIC: process.env.FEATURE_INVITE_RETRY_LOGIC === 'true'
};

// Then in the invite API:
import { FEATURE_FLAGS } from '@/lib/feature-flags';

// Use flags to control behavior:
if (FEATURE_FLAGS.INVITE_RETRY_LOGIC) {
  result = await inviteUserWithRetry(body.email, options);
} else {
  result = await supabase.auth.admin.inviteUserByEmail(body.email, options);
}
```

#### 7.4 Staged Canary Deployment

Implement a canary deployment strategy:

```javascript
// src/lib/canary.js
export function isCanaryUser(userId) {
  // Deterministic but pseudo-random distribution based on user ID
  const hash = userId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  // Enable for 10% of users
  return hash % 100 < 10;
}

// Then in the invite API:
import { isCanaryUser } from '@/lib/canary';

// Enable new functionality only for canary users
const useNewInviteFlow = FEATURE_FLAGS.INVITE_V2 && isCanaryUser(user.id);

if (useNewInviteFlow) {
  // Use new invitation logic
} else {
  // Use original invitation logic
}
```

## Implementation Timeline

- **Day 1**: 
  - Complete diagnostic steps (enhanced logging, isolate custom triggers, RLS verification)
  - Implement service role key regeneration
  - Set up schema drift detection and alerts
  - Deploy improved email synchronization trigger to staging
  - Begin load testing

- **Day 2**:
  - Implement retry logic with the official SDK
  - Create direct user creation stored procedure with tests
  - Add UI enhancements (dry-run invitation, CSV fallback)
  - Set up Sentry monitoring and feature flags
  - Begin canary testing with a small subset of users

- **Day 3**:
  - Complete end-to-end test suite
  - Deploy fixes to production with feature flags enabled
  - Monitor for errors and gradually increase rollout percentage
  - Document the final solution with detailed technical specifications

## Success Criteria

The fix will be considered successful if:

1. Administrators can invite new users without encountering 500 errors
2. Invited users receive invitation emails
3. Invited users can complete the registration process
4. Users are properly assigned to the correct roles and brands
5. Job title and other metadata are correctly saved in both auth.users and profiles tables
6. System can handle concurrent invitation requests (1,000+)
7. No schema drift is detected after deployment

## Risk Mitigation

1. **Database Corruption Risk**: 
   - Take full database backup before any schema modifications
   - Test all changes on staging environment first
   - Keep SQL scripts idempotent (safe to run multiple times)

2. **Auth System Downtime**: 
   - Schedule changes during low-usage periods
   - Use feature flags to control rollout
   - Have rollback plan with ready-to-deploy fix

3. **Failed Deployments**: 
   - Implement feature flags for instant disabling
   - Set up automatic error alerts with thresholds
   - Use canary deployments to limit user impact

## Conclusion

The "Database error saving new user" issue is likely related to conflicts between our custom triggers, service role permissions, or database constraints in the Supabase Auth system. By implementing the enhanced diagnostic measures, improving the service role key management, and creating robust fallback mechanisms, we can systematically eliminate potential causes while ensuring users can still be invited to the system.

This plan now includes stronger diagnostics, automated schema drift detection, load testing, more robust fallbacks, and UI enhancements to improve the administrator experience. The recommended approach balances speed of resolution with safety by using feature flags and canary deployments to validate changes before full rollout. 